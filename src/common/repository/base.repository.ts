import { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "@/common/types/database.types";

type TableName = keyof Database["public"]["Tables"];

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export abstract class BaseRepository<TName extends TableName> {
  constructor(
    protected readonly tableName: TName,
    protected readonly getClient: () => SupabaseClient<Database>
  ) {}

  protected get table() {
    return this.getClient().from(this.tableName);
  }

  subscribe(
    event: RealtimeEvent,
    callback: (payload: {
      eventType: "INSERT" | "UPDATE" | "DELETE";
      new: Record<string, unknown>;
      old: Record<string, unknown>;
    }) => void,
    filter?: string
  ): () => void {
    const channelName = `${this.tableName}-${event}-${Date.now()}`;
    const channelConfig: Record<string, string> = {
      event: event === "*" ? "*" : event,
      schema: "public",
      table: this.tableName,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel: RealtimeChannel = this.getClient()
      .channel(channelName)
      .on(
        "postgres_changes" as never,
        channelConfig as never,
        (payload: {
          eventType: "INSERT" | "UPDATE" | "DELETE";
          new: Record<string, unknown>;
          old: Record<string, unknown>;
        }) => {
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          });
        }
      )
      .subscribe();

    return () => {
      this.getClient().removeChannel(channel);
    };
  }
}
