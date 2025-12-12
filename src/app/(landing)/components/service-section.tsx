"use client";

import { Sparkles, Tag, Archive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { serviceFeatures } from "../lib/constants";

const iconMap = {
  Sparkles: Sparkles,
  Tag: Tag,
  Archive: Archive,
};

export function ServiceSection() {
  return (
    <section
      id="service"
      className="bg-slate-50 py-16 md:py-24"
    >
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold tracking-tight text-center text-slate-900 sm:text-4xl mb-4">
          Saju피아가 특별한 이유
        </h2>
        <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
          AI 기반의 정확한 분석과 합리적인 가격으로 당신의 사주팔자를 확인하세요
        </p>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {serviceFeatures.map((feature) => {
            const Icon =
              iconMap[feature.icon as keyof typeof iconMap] || Sparkles;
            return (
              <Card
                key={feature.title}
                className="border-slate-200 transition-shadow hover:shadow-lg"
              >
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
                    <Icon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
