"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { pricingPlans } from "../lib/constants";

export function PricingSection() {
  const { isAuthenticated } = useCurrentUser();
  const router = useRouter();

  const handleFreeClick = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  const handleProClick = () => {
    if (isAuthenticated) {
      router.push("/subscription");
    } else {
      router.push("/login");
    }
  };

  return (
    <section id="pricing" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold tracking-tight text-center text-slate-900 sm:text-4xl mb-4">
          간단하고 명확한 요금제
        </h2>
        <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
          무료로 시작하거나 Pro 플랜으로 더 많은 혜택을 누리세요
        </p>

        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          <Card className="border-slate-200 transition-shadow hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary">{pricingPlans.free.badge}</Badge>
              </div>
              <CardTitle className="text-2xl">{pricingPlans.free.name}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-slate-900">
                  {pricingPlans.free.price}원
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {pricingPlans.free.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button onClick={handleFreeClick} variant="outline" className="w-full">
                {pricingPlans.free.cta}
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-indigo-200 bg-indigo-50/30 transition-shadow hover:shadow-lg relative">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-indigo-600">{pricingPlans.pro.badge}</Badge>
              </div>
              <CardTitle className="text-2xl">{pricingPlans.pro.name}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-slate-900">
                  {pricingPlans.pro.price.toLocaleString()}원
                </span>
                <span className="text-slate-600"> /월</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {pricingPlans.pro.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button onClick={handleProClick} className="w-full">
                {pricingPlans.pro.cta}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-12 text-center space-y-2 max-w-3xl mx-auto">
          <p className="text-xs text-slate-500">
            * 구독 취소 시 환불 불가, 다음 결제일까지 서비스 이용 가능
          </p>
          <p className="text-xs text-slate-500">
            * 결제 실패 시 즉시 구독 해지 처리
          </p>
        </div>
      </div>
    </section>
  );
}
