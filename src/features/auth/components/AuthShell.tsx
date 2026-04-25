"use client";

import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullseye } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/common/lib/utils";

const NOISE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.7 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

/**
 * Single elevated card containing both the hero (left) and content (right).
 * Both halves share the same `bg-card` so the seam disappears.
 */
export function AuthShell({
  hero,
  children,
}: {
  hero: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-[480px] lg:max-w-[1080px] xl:max-w-[1280px] 2xl:max-w-[1400px] h-auto lg:h-[min(820px,calc(100vh-3rem))] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        {/* Hero side */}
        <div className="hidden lg:block relative w-[42%] xl:w-[44%] shrink-0 overflow-hidden border-r border-border">
          {/* Theme-aware layered gradient — top-heavy, fades into card bg */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 110% 55% at 35% 0%, hsl(var(--primary) / 0.95) 0%, hsl(var(--primary) / 0.55) 22%, transparent 55%),
                radial-gradient(ellipse 130% 60% at 65% 5%, hsl(var(--accent) / 0.85) 0%, hsl(var(--accent) / 0.4) 25%, transparent 60%),
                radial-gradient(ellipse 160% 60% at 50% 22%, hsl(var(--primary) / 0.35) 0%, hsl(var(--primary) / 0.15) 30%, transparent 65%),
                linear-gradient(180deg, transparent 0%, transparent 50%, hsl(var(--card) / 0.85) 78%, hsl(var(--card)) 95%)
              `,
            }}
          />

          {/* Subtle film grain */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-[0.12] mix-blend-overlay"
            style={{
              backgroundImage: `url("${NOISE_SVG}")`,
              backgroundSize: "320px 320px",
            }}
          />

          <div className="relative z-10 flex h-full flex-col items-stretch px-12 py-12">
            {hero}
          </div>
        </div>

        {/* Content side */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
          <div className="w-full max-w-[440px]">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AuthHeroBrand() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] border-foreground">
        <FontAwesomeIcon icon={faBullseye} className="text-[10px] text-foreground" />
      </div>
      <span className="font-display text-[20px] font-medium leading-7 text-foreground">
        Goal Assist
      </span>
    </div>
  );
}

export function AuthHeroHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h2 className="font-display text-[40px] font-semibold leading-[48px] tracking-tight text-foreground">
        {title}
      </h2>
      <p className="max-w-[340px] text-[17px] leading-7 text-muted-foreground">
        {subtitle}
      </p>
    </div>
  );
}

export type StepState = "active" | "done" | "upcoming";

export function StepPill({
  number,
  label,
  state,
}: {
  number: number;
  label: string;
  state: StepState;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-4 rounded-[12px] px-6 py-5 backdrop-blur-md transition-all duration-300",
        state === "active" &&
          "bg-foreground border border-foreground/20 shadow-lg shadow-foreground/10",
        state === "done" && "bg-muted border border-border",
        state === "upcoming" && "bg-muted/60 border border-transparent"
      )}
    >
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium",
          state === "active" && "bg-background text-foreground",
          state === "done" && "bg-emerald-500/90 text-white",
          state === "upcoming" && "bg-muted-foreground/30 text-muted-foreground"
        )}
      >
        {state === "done" ? (
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          number
        )}
      </div>
      <span
        className={cn(
          "text-[15px] font-medium",
          state === "active" && "text-background",
          state === "done" && "text-muted-foreground",
          state === "upcoming" && "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}
