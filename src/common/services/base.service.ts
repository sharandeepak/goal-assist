import {
  BaseRepository,
  type RealtimeEvent,
} from "@/common/repository/base.repository";
import { AppError } from "@/common/errors/AppError";
import type { Database } from "@/common/types/database.types";

type TableName = keyof Database["public"]["Tables"];

export abstract class BaseService<TName extends TableName> {
  constructor(protected readonly repository: BaseRepository<TName>) {}

  subscribe(
    event: RealtimeEvent,
    callback: (payload: {
      eventType: "INSERT" | "UPDATE" | "DELETE";
      new: Record<string, unknown>;
      old: Record<string, unknown>;
    }) => void,
    filter?: string
  ): () => void {
    return this.repository.subscribe(event, callback, filter);
  }
}
