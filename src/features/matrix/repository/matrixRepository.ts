import type { SupabaseTask } from "@/common/types";

export interface QuadrantCounts {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  uncategorized: number;
}

export interface MatrixRepository {
  subscribeToTasks(
    workspaceId: string,
    dateRange: { start: Date; end: Date } | null,
    callback: (tasks: SupabaseTask[]) => void,
    onError: (error: Error) => void
  ): () => void;

  getTasks(workspaceId: string, dateRange: { start: Date; end: Date } | null): Promise<SupabaseTask[]>;

  updateTaskQuadrant(
    taskId: string,
    priority: "low" | "medium" | "high",
    urgency: "low" | "medium" | "high"
  ): Promise<void>;

  bulkUpdateTasksQuadrant(
    taskIds: string[],
    priority: "low" | "medium" | "high",
    urgency: "low" | "medium" | "high"
  ): Promise<void>;
}
