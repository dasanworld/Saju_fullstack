"use client";

import { SignUp } from "@clerk/nextjs";

type SignUpPageProps = {
  params: Promise<Record<string, never>>;
};

export default function SignUpPage({ params }: SignUpPageProps) {
  void params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl",
          },
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/dashboard"
      />
    </div>
  );
}
