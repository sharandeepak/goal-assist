export interface HierarchyRepository {
  /**
   * Add a direct manager relationship (depth=1) and update transitive relationships.
   */
  addManagerRelationship(managerId: string, reporteeId: string, workspaceId: string): Promise<void>;

  /**
   * Remove a manager relationship and update transitive relationships.
   */
  removeManagerRelationship(managerId: string, reporteeId: string, workspaceId: string): Promise<void>;

  /**
   * Get all managers of a user (direct and transitive).
   */
  getManagersOf(userId: string, workspaceId: string): Promise<{ managerId: string; depth: number }[]>;

  /**
   * Get all reportees of a manager (direct and transitive).
   */
  getReporteesOf(managerId: string, workspaceId: string): Promise<{ reporteeId: string; depth: number }[]>;

  /**
   * Get direct manager only (depth=1).
   */
  getDirectManager(userId: string, workspaceId: string): Promise<string | null>;

  /**
   * Get direct reports only (depth=1).
   */
  getDirectReports(managerId: string, workspaceId: string): Promise<string[]>;
}
