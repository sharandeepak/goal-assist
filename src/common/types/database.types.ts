export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          creator_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          creator_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          creator_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          workspace_id: string;
          auth_id: string | null;
          first_name: string;
          last_name: string | null;
          email: string;
          role: "admin" | "member" | "manager";
          status: "invited" | "active";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          auth_id?: string | null;
          first_name: string;
          last_name?: string | null;
          email: string;
          role?: "admin" | "member" | "manager";
          status?: "invited" | "active";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workspace_id?: string;
          auth_id?: string | null;
          first_name?: string;
          last_name?: string | null;
          email?: string;
          role?: "admin" | "member" | "manager";
          status?: "invited" | "active";
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          title: string;
          completed: boolean;
          date: string | null;
          completed_date: string | null;
          priority: "low" | "medium" | "high" | null;
          urgency: "low" | "medium" | "high" | null;
          tags: string[];
          milestone_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          title: string;
          completed?: boolean;
          date?: string | null;
          completed_date?: string | null;
          priority?: "low" | "medium" | "high" | null;
          urgency?: "low" | "medium" | "high" | null;
          tags?: string[];
          milestone_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          title?: string;
          completed?: boolean;
          date?: string | null;
          completed_date?: string | null;
          priority?: "low" | "medium" | "high" | null;
          urgency?: "low" | "medium" | "high" | null;
          tags?: string[];
          milestone_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey";
            columns: ["milestone_id"];
            isOneToOne: false;
            referencedRelation: "milestones";
            referencedColumns: ["id"];
          },
        ];
      };
      milestones: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          title: string;
          description: string | null;
          progress: number;
          urgency: "low" | "medium" | "high";
          status: "planned" | "active" | "completed" | "on_hold";
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          title: string;
          description?: string | null;
          progress?: number;
          urgency: "low" | "medium" | "high";
          status: "planned" | "active" | "completed" | "on_hold";
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          progress?: number;
          urgency?: "low" | "medium" | "high";
          status?: "planned" | "active" | "completed" | "on_hold";
          start_date?: string | null;
          end_date?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "milestones_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      satisfaction_logs: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          log_date: string;
          score: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          log_date: string;
          score: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          log_date?: string;
          score?: number;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "satisfaction_logs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      standup_logs: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          log_date: string;
          completed_items: string[];
          blockers: string[];
          planned_items: string[];
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          log_date: string;
          completed_items?: string[];
          blockers?: string[];
          planned_items?: string[];
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          log_date?: string;
          completed_items?: string[];
          blockers?: string[];
          planned_items?: string[];
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "standup_logs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      time_entries: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          task_id: string | null;
          task_title_snapshot: string;
          emoji: string | null;
          milestone_id_snapshot: string | null;
          tags_snapshot: string[];
          note: string | null;
          source: "manual" | "timer";
          started_at: string | null;
          ended_at: string | null;
          duration_sec: number;
          day: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          task_id?: string | null;
          task_title_snapshot: string;
          emoji?: string | null;
          milestone_id_snapshot?: string | null;
          tags_snapshot?: string[];
          note?: string | null;
          source: "manual" | "timer";
          started_at?: string | null;
          ended_at?: string | null;
          duration_sec?: number;
          day: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          task_id?: string | null;
          task_title_snapshot?: string;
          emoji?: string | null;
          milestone_id_snapshot?: string | null;
          tags_snapshot?: string[];
          note?: string | null;
          source?: "manual" | "timer";
          started_at?: string | null;
          ended_at?: string | null;
          duration_sec?: number;
          day?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_entries_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_accounts_by_email: {
        Args: { p_email: string };
        Returns: { workspace_id: string; workspace_name: string }[];
      };
      get_workspace_count_for_auth_user: {
        Args: Record<string, never>;
        Returns: number;
      };
      create_workspace_and_user: {
        Args: {
          p_workspace_name: string;
          p_email: string;
          p_first_name: string;
          p_last_name?: string;
        };
        Returns: {
          workspace_id: string;
          workspace_name: string;
          user_id: string;
        };
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
