"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AnalysisSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <CardHeader>
          <Skeleton className="h-10 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-1/2" />
          <div className="pt-3 mt-3 border-t border-amber-200">
            <Skeleton className="h-4 w-1/3" />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-1/2 mt-6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-8 w-1/3 mt-6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-center">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
