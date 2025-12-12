"use client";

import { useState } from "react";
import { TestSearchBar } from "@/features/test/components/test-search-bar";
import { TestCardList } from "@/features/test/components/test-card-list";
import { useTestList } from "@/features/test/hooks/useTestList";

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error } = useTestList({
    name: searchQuery || undefined,
    limit: 20,
  });

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          과거에 수행한 사주 팔자 검사 내역을 확인할 수 있습니다.
        </h1>
      </div>

      <TestSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="성함으로 검색하세요"
      />

      {!isLoading && data && (
        <div className="mt-6 mb-4 text-sm text-muted-foreground">
          총 {data.total}건의 검사 내역
        </div>
      )}

      <TestCardList
        tests={data?.tests || []}
        isLoading={isLoading}
        searchQuery={searchQuery}
        onClearSearch={() => setSearchQuery("")}
      />

      {error && (
        <div className="mt-8 text-center text-destructive">
          검사 내역을 불러오는 데 실패했습니다.
        </div>
      )}
    </div>
  );
}
