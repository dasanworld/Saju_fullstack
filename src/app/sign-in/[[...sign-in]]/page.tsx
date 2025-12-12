"use client";

import { SignIn } from "@clerk/nextjs";

type SignInPageProps = {
  params: Promise<Record<string, never>>;
};

export default function SignInPage({ params }: SignInPageProps) {
  void params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl",
          },
        }}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
      />
    </div>
  );
}
