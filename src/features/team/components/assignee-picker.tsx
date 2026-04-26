"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/ui/select";
import { useWorkspaceMembers } from "../hooks/use-workspace-members";
import type { TeamMember } from "../types";

const UNASSIGNED_VALUE = "__unassigned__";

export interface AssigneePickerProps {
  workspaceId: string;
  value: string | null;
  onAssigneeChange: (assigneeId: string | null) => void;
  disabled?: boolean;
  /** Used to label the current user with " (You)". */
  currentUserId?: string;
  /** Whether to show the "Unassigned" option. Defaults to true. */
  allowUnassigned?: boolean;
  /** Placeholder text when nothing is selected. Defaults to "Select assignee". */
  placeholder?: string;
  /** Element id for the trigger so an external <Label htmlFor=...> can target it. */
  triggerId?: string;
  triggerClassName?: string;
}

function getDisplayName(member: TeamMember, currentUserId?: string): string {
  const first = (member.firstName || "").trim();
  const last = (member.lastName || "").trim();
  let name = `${first} ${last}`.trim();
  if (!name) {
    name = member.email;
  }
  if (currentUserId && member.id === currentUserId) {
    name = `${name} (You)`;
  }
  return name;
}

function compareMembers(a: TeamMember, b: TeamMember): number {
  const firstCompare = (a.firstName || "").localeCompare(b.firstName || "");
  if (firstCompare !== 0) return firstCompare;
  return (a.lastName || "").localeCompare(b.lastName || "");
}

export function AssigneePicker({
  workspaceId,
  value,
  onAssigneeChange,
  disabled = false,
  currentUserId,
  allowUnassigned = true,
  placeholder = "Select assignee",
  triggerId,
  triggerClassName,
}: AssigneePickerProps) {
  const { data, isLoading, isError } = useWorkspaceMembers(workspaceId);

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger id={triggerId} className={triggerClassName} disabled>
          <span className="text-muted-foreground">Loading…</span>
        </SelectTrigger>
      </Select>
    );
  }

  if (isError) {
    return (
      <Select disabled>
        <SelectTrigger id={triggerId} className={triggerClassName} disabled>
          <span className="text-destructive">Failed to load members</span>
        </SelectTrigger>
      </Select>
    );
  }

  const members = (data ?? [])
    .filter((m) => m.status === "active")
    .slice()
    .sort(compareMembers);

  const selectValue = value === null ? UNASSIGNED_VALUE : value;

  const handleValueChange = (next: string) => {
    if (next === UNASSIGNED_VALUE) {
      onAssigneeChange(null);
    } else {
      onAssigneeChange(next);
    }
  };

  return (
    <Select
      value={selectValue}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger id={triggerId} className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowUnassigned && (
          <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
        )}
        {members.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            {getDisplayName(member, currentUserId)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
