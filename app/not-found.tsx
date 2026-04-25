"use client";

import Link from "next/link";
import { Button } from "@/common/ui/button";
import { StarCatcherGame } from "@/common/components/star-catcher-game";

export default function NotFound() {
  return (
    <div className="h-full overflow-hidden flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        {/* 404 heading */}
        <div className="mb-8">
          <p className="font-mono text-5xl font-bold text-primary/20 mb-4 tracking-tight">
            404
          </p>
          <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border/50 flex items-center justify-center mb-6 mx-auto shadow-sm">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              className="text-muted-foreground"
            >
              <path
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="font-display font-bold text-xl text-foreground mb-2">
            Page not found
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-[340px] mx-auto">
            This page doesn&apos;t exist. Play a game while you find your way back.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mb-10 w-full max-w-[280px]">
          <Button asChild className="flex-1 h-10 rounded-xl text-sm font-semibold">
            <Link href="/">Go Home</Link>
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-10 rounded-xl text-sm font-medium"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>

        {/* Divider */}
        <div className="relative w-full mb-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-3 text-muted-foreground/60">
              while you&apos;re here
            </span>
          </div>
        </div>

        {/* Game */}
        <StarCatcherGame />
      </div>
    </div>
  );
}
