"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faEnvelope, faBell, faArrowRightFromBracket, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { ModeToggle } from "./mode-toggle";
import GlobalTimer from "@/features/timesheet/components/global-timer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/common/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/common/ui/alert-dialog";
import { useAuth } from "@/common/hooks/use-auth";

export default function TopHeader() {
	const { user, signOut } = useAuth();
	const [showLogoutDialog, setShowLogoutDialog] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const displayName = user ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ""}` : "Loading…";
	const displayEmail = user?.email ?? "";

	const avatarSeed = user?.email ?? "default";

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
						<FontAwesomeIcon icon={faMagnifyingGlass} className="text-sm" />
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
							<FontAwesomeIcon icon={faEnvelope} className="text-lg" />
						</button>
						<button className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
							<FontAwesomeIcon icon={faBell} className="text-lg" />
							<span className="absolute top-2.5 right-2.5 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
						</button>
						<ModeToggle />
					</div>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button className="flex items-center gap-3 rounded-xl hover:bg-muted/60 px-2 py-1 transition-colors outline-none">
								<div className="w-10 h-10 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center border border-primary/30">
									<img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} alt={displayName} className="w-full h-full object-cover" />
								</div>
								<div className="hidden sm:flex flex-col text-left">
									<span className="text-sm font-semibold leading-none mb-1">{displayName}</span>
									<span className="text-xs text-muted-foreground leading-none">{displayEmail}</span>
								</div>
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-52">
							<DropdownMenuLabel className="flex flex-col gap-0.5">
								<span className="font-medium">{displayName}</span>
								<span className="text-xs text-muted-foreground font-normal truncate">{displayEmail}</span>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer" onSelect={() => setShowLogoutDialog(true)}>
								<FontAwesomeIcon icon={faArrowRightFromBracket} className="mr-2 text-sm" />
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
