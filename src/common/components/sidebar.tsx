"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/common/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faCalendarDay, faTableCellsLarge, faMicrophone, faBullseye, faClock, faCalendarDays, faGear, faCircleQuestion, faArrowRightFromBracket, faBars, faSpinner, faBuilding } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/common/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/common/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/common/ui/alert-dialog";
import { useAuth } from "@/common/hooks/use-auth";

const mainMenu = [
	{ name: "Dashboard", path: "/", icon: faHouse },
	{ name: "Planner", path: "/planner", icon: faCalendarDay },
	{ name: "Matrix", path: "/matrix", icon: faTableCellsLarge },
	{ name: "Voice Log", path: "/voice-log", icon: faMicrophone },
	{ name: "Milestones", path: "/milestones", icon: faBullseye },
	{ name: "Timesheet", path: "/timesheet", icon: faClock },
	{ name: "Calendar", path: "/calendar", icon: faCalendarDays },
];

const generalMenu = [
	{ name: "Workspaces", path: "/workspaces", icon: faBuilding },
	{ name: "Settings", path: "/settings", icon: faGear },
	{ name: "Help", path: "/help", icon: faCircleQuestion },
];

function NavLinks({ routes, pathname }: { routes: any[]; pathname: string }) {
	return (
		<div className="flex flex-col gap-1.5">
			{routes.map((route) => {
				const isActive = pathname === route.path;
				return (
					<Link key={route.path} href={route.path} prefetch={true} className={cn("flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")}>
						<div className="flex items-center justify-center w-5">
							<FontAwesomeIcon icon={route.icon} className={cn("text-lg", isActive ? "text-primary" : "text-muted-foreground/70")} />
						</div>
						{route.name}
						{isActive && <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />}
					</Link>
				);
			})}
		</div>
	);
}

function LogoutButton() {
	const { signOut } = useAuth();
	const [isLoggingOut, setIsLoggingOut] = useState(false);

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
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<button disabled={isLoggingOut} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-accent/50 hover:text-foreground w-full mt-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
					<div className="flex items-center justify-center w-5">
						<FontAwesomeIcon icon={isLoggingOut ? faSpinner : faArrowRightFromBracket} className={cn("text-lg text-muted-foreground/70", isLoggingOut && "animate-spin")} />
					</div>
					{isLoggingOut ? "Signing out…" : "Logout"}
				</button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Sign out</AlertDialogTitle>
					<AlertDialogDescription>Are you sure you want to sign out? You will need to sign in again to access your workspace.</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={handleConfirmSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
						Sign out
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export default function Sidebar() {
	const pathname = usePathname();

	return (
		<>
			{/* Desktop Sidebar */}
			<aside className="hidden lg:flex flex-col w-64 h-screen border-r bg-card/50 backdrop-blur-xl shrink-0">
				<div className="p-6 flex items-center gap-3">
					<div className="relative">
						<div className="absolute inset-0 bg-primary/20 rounded-xl blur-md" />
						<div className="relative flex items-center justify-center w-10 h-10 bg-primary rounded-xl text-primary-foreground shadow-sm">
							<FontAwesomeIcon icon={faBullseye} className="text-xl" />
						</div>
					</div>
					<span className="font-display font-bold text-xl tracking-tight">Goal Assist</span>
				</div>

				<div className="flex-1 overflow-y-auto py-2 px-4 space-y-8 scrollbar-hide">
					<div>
						<p className="px-4 text-xs font-semibold text-muted-foreground/50 tracking-wider uppercase mb-3">Menu</p>
						<NavLinks routes={mainMenu} pathname={pathname} />
					</div>

					<div>
						<p className="px-4 text-xs font-semibold text-muted-foreground/50 tracking-wider uppercase mb-3">General</p>
						<NavLinks routes={generalMenu} pathname={pathname} />
						<LogoutButton />
					</div>
				</div>

				<div className="p-4 mt-auto">
					<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-5 text-primary-foreground">
						<div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
						<div className="absolute -left-4 -bottom-4 w-24 h-24 bg-black/10 rounded-full blur-2xl pointer-events-none" />
						<h4 className="font-semibold text-base mb-1 relative z-10">
							Download our
							<br />
							Mobile App
						</h4>
						<p className="text-xs text-primary-foreground/80 mb-3 relative z-10">Get easy in another way</p>
						<Button size="sm" variant="secondary" className="w-full bg-white text-primary hover:bg-white/90 relative z-10 shadow-sm">
							Download
						</Button>
					</div>
				</div>
			</aside>

			{/* Mobile Sidebar (Sheet) */}
			<Sheet>
				<SheetTrigger asChild>
					<Button variant="outline" size="icon" className="lg:hidden fixed bottom-6 right-6 z-50 rounded-full shadow-lg h-14 w-14">
						<FontAwesomeIcon icon={faBars} className="text-xl" />
						<span className="sr-only">Toggle menu</span>
					</Button>
				</SheetTrigger>
				<SheetContent side="left" className="w-72 p-0 flex flex-col bg-card/95 backdrop-blur-xl">
					<div className="p-6 flex items-center gap-3 border-b">
						<div className="relative flex items-center justify-center w-10 h-10 bg-primary rounded-xl text-primary-foreground shadow-sm">
							<FontAwesomeIcon icon={faBullseye} className="text-xl" />
						</div>
						<span className="font-display font-bold text-xl tracking-tight">Goal Assist</span>
					</div>
					<div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
						<div>
							<p className="px-4 text-xs font-semibold text-muted-foreground/50 tracking-wider uppercase mb-3">Menu</p>
							<NavLinks routes={mainMenu} pathname={pathname} />
						</div>
						<div>
							<p className="px-4 text-xs font-semibold text-muted-foreground/50 tracking-wider uppercase mb-3">General</p>
							<NavLinks routes={generalMenu} pathname={pathname} />
							<LogoutButton />
						</div>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
