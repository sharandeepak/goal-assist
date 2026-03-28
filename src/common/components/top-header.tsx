"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faEnvelope, faBell, faArrowRightFromBracket, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { ModeToggle } from "./mode-toggle";
import GlobalTimer from "@/features/timesheet/components/global-timer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/common/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/common/ui/alert-dialog";
import { useAuth } from "@/common/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/common/ui/avatar";

function deriveDisplayName(firstName?: string | null, lastName?: string | null, email?: string | null) {
	const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
	if (fullName) return fullName;
	if (email) return email.split("@")[0];
	return "";
}

function deriveInitials(name: string) {
	const parts = name.split(" ").filter(Boolean);
	if (parts.length === 0) return "";
	if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "";
	return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function TopHeader() {
	const { user, authUser, signOut, isLoading } = useAuth();
	const [showLogoutDialog, setShowLogoutDialog] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const metadataFirstName = typeof authUser?.user_metadata?.first_name === "string" ? authUser.user_metadata.first_name : null;
	const metadataLastName = typeof authUser?.user_metadata?.last_name === "string" ? authUser.user_metadata.last_name : null;
	const displayEmail = user?.email ?? authUser?.email ?? "";
	const displayName = deriveDisplayName(
		user?.first_name ?? metadataFirstName,
		user?.last_name ?? metadataLastName,
		displayEmail || null
	);
	const avatarSeed = displayEmail || authUser?.id || "user";
	const initials = deriveInitials(displayName);

	const handleConfirmSignOut = async () => {
		setIsLoggingOut(true);
		try {
			await signOut();
			window.location.href = "/auth/signin";
		} finally {
			setIsLoggingOut(false);
		}
	};

	return (
		<>
			<header className="sticky top-0 z-40 h-20 flex items-center justify-between px-8 bg-background/80 backdrop-blur-md border-b shrink-0">
				{/* Search */}
				<div className="relative w-96 max-w-full hidden md:block">
					<div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-muted-foreground/60">
						<FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
					</div>
					<input type="text" className="w-full bg-muted/40 border border-border/50 text-foreground text-sm rounded-full focus:ring-primary focus:border-primary block pl-10 p-2.5 outline-none transition-all" placeholder="Search task" />
					<div className="absolute inset-y-0 right-0 flex items-center pr-3">
						<kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
							<span className="text-xs">⌘</span>F
						</kbd>
					</div>
				</div>

				{/* Right Actions */}
				<div className="flex items-center gap-5 ml-auto">
					<GlobalTimer />

					<div className="flex items-center gap-2 border-r pr-5 border-border/50">
						<button className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
							<FontAwesomeIcon icon={faEnvelope} className="h-4 w-4" />
						</button>
						<button className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
							<FontAwesomeIcon icon={faBell} className="h-4 w-4" />
							<span className="absolute top-2.5 right-2.5 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
						</button>
						<ModeToggle />
					</div>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button className="flex items-center gap-3 rounded-xl hover:bg-muted/60 px-2 py-1 transition-colors outline-none">
								<Avatar className="h-10 w-10 border border-primary/30 bg-primary/10">
									<AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} alt={displayName || "Profile"} />
									<AvatarFallback className="bg-primary/15 text-primary font-semibold text-xs">{initials || "\u00A0"}</AvatarFallback>
								</Avatar>
								<div className="hidden sm:flex flex-col text-left min-w-[11rem]">
									<span className="text-sm font-semibold leading-none mb-1 truncate">
										{isLoading && !displayName ? "\u00A0" : displayName}
									</span>
									<span className="text-xs text-muted-foreground leading-none truncate">
										{isLoading && !displayEmail ? "\u00A0" : displayEmail}
									</span>
								</div>
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-52">
							<DropdownMenuLabel className="flex flex-col gap-0.5">
								<span className="font-medium">{displayName || " "}</span>
								<span className="text-xs text-muted-foreground font-normal truncate">{displayEmail || " "}</span>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer" onSelect={() => setShowLogoutDialog(true)}>
								<FontAwesomeIcon icon={faArrowRightFromBracket} className="mr-2 h-4 w-4" />
								Sign out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>

			<AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Sign out</AlertDialogTitle>
						<AlertDialogDescription>Are you sure you want to sign out? You will need to sign in again to access your workspace.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isLoggingOut}>Cancel</AlertDialogCancel>
						<AlertDialogAction disabled={isLoggingOut} onClick={handleConfirmSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							{isLoggingOut ? (
								<>
									<FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
									Signing out…
								</>
							) : (
								"Sign out"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
