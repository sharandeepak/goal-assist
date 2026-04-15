import { createClient } from "@/common/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/common/types/database.types";
import { AppError } from "@/common/errors/AppError";
import type { HierarchyRepository } from "./hierarchyRepository";

let clientInstance: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}

export class SupabaseHierarchyRepository implements HierarchyRepository {
  async addManagerRelationship(
    managerId: string,
    reporteeId: string,
    workspaceId: string
  ): Promise<void> {
    try {
      const client = getClient();

      // 1. Fetch all managers of the new manager (their ancestors)
      const { data: managerAncestors, error: ancestorsError } = await client
        .from("manager_reportee_mapping")
        .select("manager_id, depth")
        .eq("reportee_id", managerId)
        .eq("workspace_id", workspaceId);

      if (ancestorsError) {
        throw AppError.internal("HIERARCHY_ADD_ERROR", ancestorsError.message);
      }

      // 2. Fetch all reportees of the new reportee (their descendants)
      const { data: reporteeDescendants, error: descendantsError } = await client
        .from("manager_reportee_mapping")
        .select("reportee_id, depth")
        .eq("manager_id", reporteeId)
        .eq("workspace_id", workspaceId);

      if (descendantsError) {
        throw AppError.internal("HIERARCHY_ADD_ERROR", descendantsError.message);
      }

      // Build all rows to upsert
      const rows: { manager_id: string; reportee_id: string; depth: number; workspace_id: string }[] = [];

      // Direct relationship (depth = 1)
      rows.push({ manager_id: managerId, reportee_id: reporteeId, depth: 1, workspace_id: workspaceId });

      // Ancestors of managerId → reporteeId (depth = ancestor.depth + 1)
      for (const ancestor of managerAncestors ?? []) {
        rows.push({
          manager_id: ancestor.manager_id,
          reportee_id: reporteeId,
          depth: ancestor.depth + 1,
          workspace_id: workspaceId,
        });
      }

      // managerId → descendants of reporteeId (depth = descendant.depth + 1)
      for (const descendant of reporteeDescendants ?? []) {
        rows.push({
          manager_id: managerId,
          reportee_id: descendant.reportee_id,
          depth: descendant.depth + 1,
          workspace_id: workspaceId,
        });
      }

      // Ancestors of managerId → descendants of reporteeId (transitive cross-product)
      for (const ancestor of managerAncestors ?? []) {
        for (const descendant of reporteeDescendants ?? []) {
          rows.push({
            manager_id: ancestor.manager_id,
            reportee_id: descendant.reportee_id,
            depth: ancestor.depth + descendant.depth + 1,
            workspace_id: workspaceId,
          });
        }
      }

      const { error: upsertError } = await client
        .from("manager_reportee_mapping")
        .upsert(rows, { onConflict: "manager_id,reportee_id" });

      if (upsertError) {
        throw AppError.internal("HIERARCHY_ADD_ERROR", upsertError.message);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("HIERARCHY_ADD_ERROR", "Failed to add manager relationship.");
    }
  }

  async removeManagerRelationship(
    managerId: string,
    reporteeId: string,
    workspaceId: string
  ): Promise<void> {
    try {
      const client = getClient();

      // Fetch all reportees reachable from reporteeId (including itself)
      const { data: reporteeDescendants, error: descendantsError } = await client
        .from("manager_reportee_mapping")
        .select("reportee_id")
        .eq("manager_id", reporteeId)
        .eq("workspace_id", workspaceId);

      if (descendantsError) {
        throw AppError.internal("HIERARCHY_REMOVE_ERROR", descendantsError.message);
      }

      // Fetch all managers of managerId (including itself)
      const { data: managerAncestors, error: ancestorsError } = await client
        .from("manager_reportee_mapping")
        .select("manager_id")
        .eq("reportee_id", managerId)
        .eq("workspace_id", workspaceId);

      if (ancestorsError) {
        throw AppError.internal("HIERARCHY_REMOVE_ERROR", ancestorsError.message);
      }

      // All ancestor manager IDs (including managerId itself)
      const ancestorIds = [managerId, ...(managerAncestors ?? []).map(a => a.manager_id)];

      // All descendant reportee IDs (including reporteeId itself)
      const descendantIds = [reporteeId, ...(reporteeDescendants ?? []).map(d => d.reportee_id)];

      // Delete all paths that go through the (managerId → reporteeId) edge:
      // i.e., where manager_id is any ancestor of managerId AND reportee_id is any descendant of reporteeId
      const { error: deleteError } = await client
        .from("manager_reportee_mapping")
        .delete()
        .eq("workspace_id", workspaceId)
        .in("manager_id", ancestorIds)
        .in("reportee_id", descendantIds);

      if (deleteError) {
        throw AppError.internal("HIERARCHY_REMOVE_ERROR", deleteError.message);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("HIERARCHY_REMOVE_ERROR", "Failed to remove manager relationship.");
    }
  }

  async getManagersOf(
    userId: string,
    workspaceId: string
  ): Promise<{ managerId: string; depth: number }[]> {
    try {
      const { data, error } = await getClient()
        .from("manager_reportee_mapping")
        .select("manager_id, depth")
        .eq("reportee_id", userId)
        .eq("workspace_id", workspaceId)
        .order("depth", { ascending: true });

      if (error) {
        throw AppError.internal("HIERARCHY_GET_MANAGERS_ERROR", error.message);
      }

      return (data ?? []).map(row => ({ managerId: row.manager_id, depth: row.depth }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("HIERARCHY_GET_MANAGERS_ERROR", "Failed to get managers.");
    }
  }

  async getReporteesOf(
    managerId: string,
    workspaceId: string
  ): Promise<{ reporteeId: string; depth: number }[]> {
    try {
      const { data, error } = await getClient()
        .from("manager_reportee_mapping")
        .select("reportee_id, depth")
        .eq("manager_id", managerId)
        .eq("workspace_id", workspaceId)
        .order("depth", { ascending: true });

      if (error) {
        throw AppError.internal("HIERARCHY_GET_REPORTEES_ERROR", error.message);
      }

      return (data ?? []).map(row => ({ reporteeId: row.reportee_id, depth: row.depth }));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("HIERARCHY_GET_REPORTEES_ERROR", "Failed to get reportees.");
    }
  }

  async getDirectManager(userId: string, workspaceId: string): Promise<string | null> {
    try {
      const { data, error } = await getClient()
        .from("manager_reportee_mapping")
        .select("manager_id")
        .eq("reportee_id", userId)
        .eq("workspace_id", workspaceId)
        .eq("depth", 1)
        .maybeSingle();

      if (error) {
        throw AppError.internal("HIERARCHY_GET_DIRECT_MANAGER_ERROR", error.message);
      }

      return data?.manager_id ?? null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("HIERARCHY_GET_DIRECT_MANAGER_ERROR", "Failed to get direct manager.");
    }
  }

  async getDirectReports(managerId: string, workspaceId: string): Promise<string[]> {
    try {
      const { data, error } = await getClient()
        .from("manager_reportee_mapping")
        .select("reportee_id")
        .eq("manager_id", managerId)
        .eq("workspace_id", workspaceId)
        .eq("depth", 1)
        .order("reportee_id", { ascending: true });

      if (error) {
        throw AppError.internal("HIERARCHY_GET_DIRECT_REPORTS_ERROR", error.message);
      }

      return (data ?? []).map(row => row.reportee_id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.internal("HIERARCHY_GET_DIRECT_REPORTS_ERROR", "Failed to get direct reports.");
    }
  }
}

export const supabaseHierarchyRepository = new SupabaseHierarchyRepository();
