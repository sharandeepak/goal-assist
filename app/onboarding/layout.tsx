import type React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goal Assist - Setup",
  description: "Set up your Goal Assist workspace",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
