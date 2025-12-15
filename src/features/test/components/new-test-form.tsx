"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { BirthDatePicker } from "./birth-date-picker";
import { BirthTimePicker } from "./birth-time-picker";
import { GenderSelector } from "./gender-selector";
import { TestResultDialog } from "./test-result-dialog";
import { StreamingDialog } from "./streaming-dialog";
import { useInitTest } from "../hooks/useInitTest";
import { useStreamAnalysis } from "../hooks/useStreamAnalysis";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "이름을 입력해주세요")
    .max(50, "이름은 50자 이내로 입력해주세요"),
  birth_date: z.date({ required_error: "생년월일을 선택해주세요" }),
  birth_time: z.string().nullable(),
  birth_time_unknown: z.boolean().default(false),
  gender: z.enum(["male", "female"], {
    required_error: "성별을 선택해주세요",
  }),
});

type FormData = z.infer<typeof formSchema>;

type DialogResult = {
  type: "success" | "error" | "quota_exceeded";
  testId?: string;
  errorMessage?: string;
  errorCode?: string;
} | null;

export const NewTestForm = () => {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogResult, setDialogResult] = useState<DialogResult>(null);
  const [streamingDialogOpen, setStreamingDialogOpen] = useState(false);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);

  const { mutate: initTest, isPending } = useInitTest();
  const { streamedText, status, error: streamError, fallbackMessage, startStream } = useStreamAnalysis();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      birth_date: undefined,
      birth_time: "12:00",
      birth_time_unknown: false,
      gender: undefined,
    },
  });

  const birthTimeUnknown = form.watch("birth_time_unknown");

  useEffect(() => {
    if (status === "completed" && currentTestId) {
      const timer = setTimeout(() => {
        setStreamingDialogOpen(false);
        router.push(`/analysis/${currentTestId}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, currentTestId, router]);

  useEffect(() => {
    if (status === "error" && streamError) {
      const timer = setTimeout(() => {
        setStreamingDialogOpen(false);
        setDialogResult({
          type: "error",
          errorMessage: streamError,
        });
        setDialogOpen(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, streamError]);

  const onSubmit = (data: FormData) => {
    const requestData = {
      name: data.name,
      birth_date: format(data.birth_date, "yyyy-MM-dd"),
      birth_time: data.birth_time_unknown ? null : data.birth_time,
      gender: data.gender,
    };

    initTest(requestData, {
      onSuccess: (response) => {
        setCurrentTestId(response.test_id);
        setStreamingDialogOpen(true);
        startStream(response.test_id, response.model);
      },
      onError: (error: any) => {
        const message =
          error.response?.data?.message || "검사 생성에 실패했습니다";
        const errorCode = error.response?.data?.errorCode;

        if (error.response?.status === 403) {
          setDialogResult({
            type: "quota_exceeded",
          });
        } else {
          setDialogResult({
            type: "error",
            errorMessage: message,
            errorCode: errorCode,
          });
        }
        setDialogOpen(true);
      },
    });
  };

  const isStreaming = status === "streaming" || status === "idle";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름</FormLabel>
              <FormControl>
                <Input placeholder="예) 홍길동" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="birth_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>생년월일</FormLabel>
              <FormControl>
                <BirthDatePicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="birth_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>출생시간</FormLabel>
              <FormControl>
                <BirthTimePicker
                  value={field.value || "12:00"}
                  onChange={field.onChange}
                  disabled={birthTimeUnknown}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="birth_time_unknown"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>출생시간 모름</FormLabel>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>성별</FormLabel>
              <FormControl>
                <GenderSelector value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending || streamingDialogOpen}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              검사를 준비하고 있습니다...
            </>
          ) : (
            "검사 시작"
          )}
        </Button>
      </form>

      <TestResultDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        result={dialogResult}
      />

      <StreamingDialog
        open={streamingDialogOpen}
        streamedText={streamedText}
        isStreaming={isStreaming}
        fallbackMessage={fallbackMessage}
        error={streamError}
      />
    </Form>
  );
};
