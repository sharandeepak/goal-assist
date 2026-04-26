"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/common/ui/sheet";
import { Button } from "@/common/ui/button";
import { Input } from "@/common/ui/input";
import { Label } from "@/common/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/ui/select";
import { useToast } from "@/common/hooks/use-toast";
import { AppError } from "@/common/errors/AppError";
import { createInvite } from "@/features/invite/services/inviteService";
import { getPotentialManagers, canInviteRole } from "@/features/team/services/teamService";
import type { TeamMember } from "@/features/team/types";
import type { UserRole } from "@/common/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faCopy, faCheck } from "@fortawesome/free-solid-svg-icons";

const inviteFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["admin", "manager", "member"]),
  managerId: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  inviterId: string;
  inviterRole: UserRole;
  onInviteCreated: () => void;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  workspaceId,
  inviterId,
  inviterRole,
  onInviteCreated,
}: InviteMemberDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [potentialManagers, setPotentialManagers] = useState<TeamMember[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: "", role: "member", managerId: undefined },
  });

  const selectedRole = watch("role");

  useEffect(() => {
    if (!open) return;
    getPotentialManagers(workspaceId)
      .then(setPotentialManagers)
      .catch(() => setPotentialManagers([]));
  }, [open, workspaceId]);

  useEffect(() => {
    if (open) {
      reset({ email: "", role: "member", managerId: undefined });
      setErrorMessage(null);
      setInviteLink(null);
      setIsCopied(false);
    }
  }, [open, reset]);

  const onSubmit = async (values: InviteFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await createInvite({
        workspaceId,
        email: values.email,
        role: values.role,
        managerId: values.managerId || undefined,
        invitedBy: inviterId,
      });
      setInviteLink(result.inviteLink);
      toast({
        title: "Invitation created",
        description: `An invite has been created for ${values.email}.`,
      });
      onInviteCreated();
    } catch (error) {
      if (error instanceof AppError) {
        setErrorMessage(error.errorMessage);
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    if (!isSubmitting) onOpenChange(false);
  };

  const roles: UserRole[] = ["admin", "manager", "member"];

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="sm:max-w-[425px] flex flex-col h-full">
        <SheetHeader>
          <SheetTitle>Invite Team Member</SheetTitle>
          <SheetDescription>
            Send an invitation to add a new member to your workspace.
          </SheetDescription>
        </SheetHeader>

        {inviteLink ? (
          <div className="flex-grow min-h-0 py-4 px-1 space-y-4 overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              Invitation created successfully. Share this link with the invitee:
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={inviteLink}
                className="flex-1 text-xs"
                aria-label="Invite link"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                aria-label="Copy invite link"
              >
                <FontAwesomeIcon
                  icon={isCopied ? faCheck : faCopy}
                  className="h-4 w-4"
                />
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col flex-grow min-h-0"
          >
            <div className="flex-grow min-h-0 py-4 px-1 space-y-6 overflow-y-auto">
              {/* Email */}
              <div className="grid gap-1.5">
                <Label htmlFor="invite-email">Email address *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  disabled={isSubmitting}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm font-medium text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Role */}
              <div className="grid gap-1.5">
                <Label htmlFor="invite-role">Role *</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) =>
                    setValue("role", value as UserRole, { shouldValidate: true })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => {
                      const allowed = canInviteRole(inviterRole, role);
                      return (
                        <SelectItem
                          key={role}
                          value={role}
                          disabled={!allowed}
                          className={!allowed ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                          {!allowed ? " (insufficient permissions)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm font-medium text-destructive">
                    {errors.role.message}
                  </p>
                )}
              </div>

              {/* Manager (optional) */}
              <div className="grid gap-1.5">
                <Label htmlFor="invite-manager">Manager (optional)</Label>
                <Select
                  value={watch("managerId") ?? "none"}
                  onValueChange={(value) =>
                    setValue("managerId", value === "none" ? undefined : value)
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="invite-manager">
                    <SelectValue placeholder="Select a manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No manager</SelectItem>
                    {potentialManagers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.firstName} {manager.lastName || ""}{" "}
                        <span className="text-muted-foreground text-xs">
                          ({manager.role})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {errorMessage && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {errorMessage}
                </p>
              )}
            </div>

            <SheetFooter className="pt-4 border-t">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="mr-2 h-4 w-4 animate-spin"
                    />
                    Sending...
                  </>
                ) : (
                  "Send Invite"
                )}
              </Button>
            </SheetFooter>
          </form>
        )}

        {inviteLink && (
          <SheetFooter className="pt-4 border-t">
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
