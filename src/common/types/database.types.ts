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
      companies: {
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
      };
      employees: {
        Row: {
          id: string;
          company_id: string;
          user_id: string | null;
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
          company_id: string;
          user_id?: string | null;
          first_name: string;
          last_name?: string | null;
          email: string;
          role?: "admin" | "member" | "manager";
          status?: "invited" | "active";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          user_id?: string | null;
          first_name?: string;
          last_name?: string | null;
          email?: string;
          role?: "admin" | "member" | "manager";
          status?: "invited" | "active";
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          employee_id: string;
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
          user_id: string;
          company_id: string;
          employee_id: string;
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
          user_id?: string;
          company_id?: string;
          employee_id?: string;
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
      };
      milestones: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          employee_id: string;
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
          user_id: string;
          company_id: string;
          employee_id: string;
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
          user_id?: string;
          company_id?: string;
          employee_id?: string;
          title?: string;
          description?: string | null;
          progress?: number;
          urgency?: "low" | "medium" | "high";
          status?: "planned" | "active" | "completed" | "on_hold";
          start_date?: string | null;
          end_date?: string | null;
          updated_at?: string;
        };
      };
      satisfaction_logs: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          employee_id: string;
          log_date: string;
          score: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          employee_id: string;
          log_date: string;
          score: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          company_id?: string;
          employee_id?: string;
          log_date?: string;
          score?: number;
          notes?: string | null;
        };
      };
      standup_logs: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          employee_id: string;
          log_date: string;
          completed_items: string[];
          blockers: string[];
          planned_items: string[];
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          employee_id: string;
          log_date: string;
          completed_items?: string[];
          blockers?: string[];
          planned_items?: string[];
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          company_id?: string;
          employee_id?: string;
          log_date?: string;
          completed_items?: string[];
          blockers?: string[];
          planned_items?: string[];
          notes?: string | null;
        };
      };
      time_entries: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          employee_id: string;
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
          user_id: string;
          company_id: string;
          employee_id: string;
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
          user_id?: string;
          company_id?: string;
          employee_id?: string;
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
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
