import type React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goal Assist - Sign In",
  description: "Sign in to your Goal Assist account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-background">
      {children}
    </div>
  );
}
