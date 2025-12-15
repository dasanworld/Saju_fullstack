"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Trash2, AlertCircle } from "lucide-react";
import type { TestListResponse } from "../lib/dto";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useDeleteTest } from "../hooks/useDeleteTest";

type TestCardProps = {
  test: TestListResponse["tests"][number];
};

export const TestCard = ({ test }: TestCardProps) => {
  const router = useRouter();
  const { mutate: deleteTest, isPending: isDeleting } = useDeleteTest();

  const handleClick = () => {
    router.push(`/analysis/${test.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("이 검사를 삭제하시겠습니까?")) {
      deleteTest(test.id);
    }
  };

  const birthDate = format(new Date(test.birth_date), "yyyy년 MM월 dd일");
  const createdAt = format(
    new Date(test.created_at),
    "yyyy.MM.dd HH:mm",
    { locale: ko }
  );

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] relative"
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold">{test.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            {!test.has_analysis && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                분석 실패
              </Badge>
            )}
            <Badge variant="outline">
              {test.gender === "male" ? "남성" : "여성"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{birthDate}</span>
        </div>

        {test.birth_time && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{test.birth_time.slice(0, 5)}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-between">
        <span className="text-xs text-muted-foreground">
          검사 일시: {createdAt}
        </span>
        {!test.has_analysis && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
