export type Unsubscribe = () => void;

export interface SubscribeOptions {
  orderBy?: { field: string; direction: "asc" | "desc" }[];
  filters?: { field: string; op: string; value: unknown }[];
  limit?: number;
}
