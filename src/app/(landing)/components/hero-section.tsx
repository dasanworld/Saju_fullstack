"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

export function HeroSection() {
  const { isAuthenticated } = useCurrentUser();
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    setImageUrl(`https://picsum.photos/seed/${Date.now()}/1200/600`);
  }, []);

  const handleStartClick = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/sign-in");
    }
  };

  const handleLearnMoreClick = () => {
    const element = document.querySelector("#service");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="hero"
      className="container mx-auto px-4 py-16 md:py-24 lg:py-32"
    >
      <div className="flex flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-6 text-center max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
            AI가 풀어주는 당신의 사주팔자
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            구글 Gemini AI가 천간·지지를 계산하고, 당신의 운세를 자연어로
            풀어드립니다. 가입 즉시 무료 3회 체험, Pro 구독 시 월 10회 분석
            제공
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleStartClick} size="lg" className="w-full sm:w-auto">
              무료 시작하기
            </Button>
            <Button
              onClick={handleLearnMoreClick}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              자세히 알아보기
            </Button>
          </div>
        </div>

        <div className="relative w-full max-w-4xl aspect-[2/1] overflow-hidden rounded-2xl shadow-2xl">
          {imageUrl && (
            <Image
              src={imageUrl}
              alt="대자연 이미지"
              fill
              className="object-cover"
              priority
              onError={(e) => {
                e.currentTarget.src = "https://picsum.photos/1200/600";
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
