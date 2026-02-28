import type { Database } from "./database.types";

// ─── Supabase Types (primary types used throughout the application) ───

export type SupabaseTask = Database["public"]["Tables"]["tasks"]["Row"];
export type SupabaseTaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type SupabaseTaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export type SupabaseMilestone = Database["public"]["Tables"]["milestones"]["Row"];
export type SupabaseMilestoneInsert = Database["public"]["Tables"]["milestones"]["Insert"];
export type SupabaseMilestoneUpdate = Database["public"]["Tables"]["milestones"]["Update"];

export type SupabaseSatisfactionLog = Database["public"]["Tables"]["satisfaction_logs"]["Row"];
export type SupabaseSatisfactionLogInsert = Database["public"]["Tables"]["satisfaction_logs"]["Insert"];

export type SupabaseStandupLog = Database["public"]["Tables"]["standup_logs"]["Row"];
export type SupabaseStandupLogInsert = Database["public"]["Tables"]["standup_logs"]["Insert"];

export type SupabaseTimeEntry = Database["public"]["Tables"]["time_entries"]["Row"];
export type SupabaseTimeEntryInsert = Database["public"]["Tables"]["time_entries"]["Insert"];
export type SupabaseTimeEntryUpdate = Database["public"]["Tables"]["time_entries"]["Update"];

export type SupabaseUser = Database["public"]["Tables"]["users"]["Row"];

// ─── Domain Interfaces ───

export interface MilestoneProgressData extends SupabaseMilestone {
  daysLeft?: number;
}

export interface PageMilestoneSummary {
  id: string;
  title: string;
  urgency: "high" | "medium" | "low";
  daysLeft?: number;
}

export interface SatisfactionSummary {
  currentScore: number | null;
  change: number | null;
}

// ─── Legacy type aliases (for backward compatibility with components) ───

export type Task = SupabaseTask;
export type Milestone = SupabaseMilestone;
export type SatisfactionLog = SupabaseSatisfactionLog;
export type StandupLog = SupabaseStandupLog;
export type TimeEntry = SupabaseTimeEntry;
