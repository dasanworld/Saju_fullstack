import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import Providers from "./providers";
import { CurrentUserProvider } from "@/features/auth/context/current-user-context";

export const metadata: Metadata = {
  title: "Saju피아 - AI 기반 사주팔자 분석",
  description: "Google Gemini AI가 풀어주는 당신의 사주팔자. 무료 3회 체험, Pro 구독 시 월 10회 분석 제공.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="ko" suppressHydrationWarning>
        <body className="antialiased font-sans">
          <Providers>
            <CurrentUserProvider>
              {children}
            </CurrentUserProvider>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
