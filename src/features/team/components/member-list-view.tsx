"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/common/ui/table";
import { Badge } from "@/common/ui/badge";
import type { TeamMember } from "../types";
import type { UserRole } from "@/common/types";
import { MemberActionsMenu } from "./member-actions-menu";

interface MemberListViewProps {
  members: TeamMember[];
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

function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active":
      return "default";
    case "invited":
      return "secondary";
    default:
      return "outline";
  }
}

export function MemberListView({ members, currentUserId, userRole, onMemberUpdated }: MemberListViewProps) {
  if (members.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No team members found.
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">
                {member.firstName} {member.lastName || ""}
                {member.id === currentUserId && (
                  <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                )}
              </TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeVariant(member.role)}>
                  {member.role}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {member.managerName || "—"}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(member.status)}>
                  {member.status}
                </Badge>
              </TableCell>
              <TableCell>
                {member.id !== currentUserId && (
                  <MemberActionsMenu
                    member={member}
                    userRole={userRole}
                    onMemberUpdated={onMemberUpdated}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
