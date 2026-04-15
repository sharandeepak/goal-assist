"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/common/ui/button";
import { Badge } from "@/common/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faChevronDown, faUser } from "@fortawesome/free-solid-svg-icons";
import type { UserRole } from "@/common/types";
import type { SupabaseUser } from "@/common/types";
import type { TeamTreeNode } from "../types";
import { toTeamMember } from "../types";
import { MemberActionsMenu } from "./member-actions-menu";
import {
  getTopLevelMembers,
  getDirectReports,
  hasDirectReports,
} from "../services/teamService";

interface MemberTreeViewProps {
  workspaceId: string;
  currentUserId: string;
  userRole: UserRole;
  onMemberUpdated: () => void;
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  switch (role) {
    case "admin":
      return "default";
    case "manager":
      return "secondary";
    default:
      return "outline";
  }
}

function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active":
      return "default";
    case "invited":
      return "secondary";
    default:
      return "outline";
  }
}

function toTreeNode(user: SupabaseUser, depth: number, hasChildren: boolean): TeamTreeNode {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.role as UserRole,
    status: user.status as "active" | "invited",
    children: [],
    isExpanded: false,
    isLoading: false,
    hasChildren,
    depth,
  };
}

export function MemberTreeView({
  workspaceId,
  currentUserId,
  userRole,
  onMemberUpdated,
}: MemberTreeViewProps) {
  const [nodes, setNodes] = useState<TeamTreeNode[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Load top-level members on mount
  useEffect(() => {
    const loadTopLevel = async () => {
      setIsInitialLoading(true);
      try {
        const topLevelUsers = await getTopLevelMembers(workspaceId);

        // Check which members have children in parallel
        const nodesWithChildrenInfo = await Promise.all(
          topLevelUsers.map(async (user) => {
            const hasChildren = await hasDirectReports(user.id, workspaceId);
            return toTreeNode(user, 0, hasChildren);
          })
        );

        setNodes(nodesWithChildrenInfo);
      } catch (error) {
        console.error("Failed to load top-level members:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadTopLevel();
  }, [workspaceId]);

  // Update a node anywhere in the tree by id
  const updateNodeById = useCallback(
    (
      nodeList: TeamTreeNode[],
      targetId: string,
      updater: (node: TeamTreeNode) => TeamTreeNode
    ): TeamTreeNode[] => {
      return nodeList.map((node) => {
        if (node.id === targetId) {
          return updater(node);
        }
        if (node.children.length > 0) {
          return { ...node, children: updateNodeById(node.children, targetId, updater) };
        }
        return node;
      });
    },
    []
  );

  const handleToggleExpand = async (nodeId: string) => {
    // Find the node
    const findNode = (nodeList: TeamTreeNode[]): TeamTreeNode | null => {
      for (const node of nodeList) {
        if (node.id === nodeId) return node;
        const found = findNode(node.children);
        if (found) return found;
      }
      return null;
    };

    const targetNode = findNode(nodes);
    if (!targetNode) return;

    // If already expanded, collapse it
    if (targetNode.isExpanded) {
      setNodes((prev) =>
        updateNodeById(prev, nodeId, (n) => ({ ...n, isExpanded: false }))
      );
      return;
    }

    // If children already loaded, just expand
    if (targetNode.children.length > 0) {
      setNodes((prev) =>
        updateNodeById(prev, nodeId, (n) => ({ ...n, isExpanded: true }))
      );
      return;
    }

    // Lazy-load children
    setNodes((prev) =>
      updateNodeById(prev, nodeId, (n) => ({ ...n, isLoading: true }))
    );

    try {
      const childUsers = await getDirectReports(nodeId, workspaceId);

      const childNodes = await Promise.all(
        childUsers.map(async (user) => {
          const childHasChildren = await hasDirectReports(user.id, workspaceId);
          return toTreeNode(user, targetNode.depth + 1, childHasChildren);
        })
      );

      setNodes((prev) =>
        updateNodeById(prev, nodeId, (n) => ({
          ...n,
          isLoading: false,
          isExpanded: true,
          children: childNodes,
        }))
      );
    } catch (error) {
      console.error("Failed to load children:", error);
      setNodes((prev) =>
        updateNodeById(prev, nodeId, (n) => ({ ...n, isLoading: false }))
      );
    }
  };

  // Flatten the tree for rendering (depth-first)
  const flattenNodes = (nodeList: TeamTreeNode[]): TeamTreeNode[] => {
    const result: TeamTreeNode[] = [];
    for (const node of nodeList) {
      result.push(node);
      if (node.isExpanded && node.children.length > 0) {
        result.push(...flattenNodes(node.children));
      }
    }
    return result;
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No team members found.
      </div>
    );
  }

  const flatNodes = flattenNodes(nodes);

  return (
    <div className="border rounded-lg divide-y">
      {flatNodes.map((node) => (
        <div
          key={node.id}
          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
          style={{ paddingLeft: `${node.depth * 24 + 16}px` }}
        >
          {/* Expand/Collapse button */}
          <div className="w-6 flex-shrink-0 flex items-center justify-center">
            {node.hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleToggleExpand(node.id)}
                disabled={node.isLoading}
              >
                {node.isLoading ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : node.isExpanded ? (
                  <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3" />
                ) : (
                  <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
                )}
              </Button>
            ) : (
              <FontAwesomeIcon icon={faUser} className="h-3 w-3 text-muted-foreground" />
            )}
          </div>

          {/* Member info */}
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <div className="flex-1 min-w-0">
              <span className="font-medium">
                {node.firstName} {node.lastName || ""}
              </span>
              {node.id === currentUserId && (
                <span className="ml-2 text-xs text-muted-foreground">(you)</span>
              )}
              <p className="text-sm text-muted-foreground truncate">{node.email}</p>
            </div>

            <Badge variant={getRoleBadgeVariant(node.role)} className="flex-shrink-0">
              {node.role}
            </Badge>

            <Badge
              variant={getStatusBadgeVariant(node.status)}
              className="flex-shrink-0"
            >
              {node.status}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0">
            {node.id !== currentUserId && (
              <MemberActionsMenu
                member={toTeamMember({
                  id: node.id,
                  workspace_id: workspaceId,
                  auth_id: null,
                  first_name: node.firstName,
                  last_name: node.lastName,
                  email: node.email,
                  role: node.role,
                  status: node.status,
                  manager_id: null,
                  created_at: "",
                  updated_at: "",
                })}
                userRole={userRole}
                onMemberUpdated={onMemberUpdated}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
