"use client";

import { TestCard } from "./test-card";
import { EmptyTestState } from "./empty-test-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { TestListResponse } from "../lib/dto";

type TestCardListProps = {
  tests: TestListResponse["tests"];
  isLoading: boolean;
  searchQuery: string;
  onClearSearch: () => void;
};

export const TestCardList = ({
  tests,
  isLoading,
  searchQuery,
  onClearSearch,
}: TestCardListProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    );
  }

  if (tests.length === 0 && !searchQuery) {
    return <EmptyTestState />;
  }

  if (tests.length === 0 && searchQuery) {
    return (
      <div className="mt-12 text-center">
        <p className="text-muted-foreground">
          &quot;{searchQuery}&quot;에 대한 검색 결과가 없습니다.
        </p>
        <button
          onClick={onClearSearch}
          className="mt-4 text-primary underline hover:text-primary/80"
        >
          검색어 초기화
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tests.map((test) => (
        <TestCard key={test.id} test={test} />
      ))}
    </div>
  );
};
