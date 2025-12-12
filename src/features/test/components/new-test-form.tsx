"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { BirthDatePicker } from "./birth-date-picker";
import { BirthTimePicker } from "./birth-time-picker";
import { GenderSelector } from "./gender-selector";
import { useCreateTest } from "../hooks/useCreateTest";

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

export const NewTestForm = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { mutate: createTest, isPending } = useCreateTest();

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

  const onSubmit = (data: FormData) => {
    const requestData = {
      name: data.name,
      birth_date: format(data.birth_date, "yyyy-MM-dd"),
      birth_time: data.birth_time_unknown ? null : data.birth_time,
      gender: data.gender,
    };

    createTest(requestData, {
      onSuccess: (response) => {
        toast({
          title: "분석이 완료되었습니다!",
          description: "결과 페이지로 이동합니다.",
        });
        router.push(`/analysis/${response.test_id}`);
      },
      onError: (error: any) => {
        const message =
          error.response?.data?.message || "검사 생성에 실패했습니다";

        if (error.response?.status === 403) {
          toast({
            title: "검사 횟수를 모두 사용했습니다",
            description:
              "Pro 플랜으로 업그레이드하면 월 10회 검사를 이용하실 수 있습니다.",
            action: (
              <Button variant="outline" onClick={() => router.push("/subscription")}>
                Pro로 업그레이드
              </Button>
            ),
          });
        } else {
          toast({
            title: "오류가 발생했습니다",
            description: message,
            variant: "destructive",
          });
        }
      },
    });
  };

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

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              AI가 분석하고 있습니다...
            </>
          ) : (
            "검사 시작"
          )}
        </Button>
      </form>
    </Form>
  );
};
