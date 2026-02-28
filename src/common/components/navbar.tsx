"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, ChevronDown, Home, Mic, Settings, Target, Clock, Grid3x3, Command } from "lucide-react";
import { Button } from "@/common/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/common/ui/sheet";
import { cn } from "@/common/lib/utils";
import { ModeToggle } from "./mode-toggle";
import GlobalTimer from "@/features/timesheet/components/global-timer";

const routes = [
	{
		name: "Dashboard",
		path: "/",
		icon: Home,
	},
	{
		name: "Planner",
		path: "/planner",
		icon: Calendar,
	},
	{
		name: "Matrix",
		path: "/matrix",
		icon: Grid3x3,
	},
	{
		name: "Voice Log",
		path: "/voice-log",
		icon: Mic,
	},
	{
		name: "Milestones",
		path: "/milestones",
		icon: Target,
	},
	{
		name: "Timesheet",
		path: "/timesheet",
		icon: Clock,
	},
	{
		name: "Calendar",
		path: "/calendar",
		icon: Calendar,
	},
	{
		name: "Settings",
		path: "/settings",
		icon: Settings,
	},
];

export default function Navbar() {
	const pathname = usePathname();

	return (
		<nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
			<div className="container mx-auto px-4 flex h-16 items-center justify-between">
				{/* Logo */}
				<div className="flex items-center gap-8">
					<Link
						href="/"
						className="font-display font-bold text-xl flex items-center gap-2.5 group"
					>
						<div className="relative">
							<div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:bg-primary/30 transition-colors" />
							<div className="relative p-1.5 bg-primary rounded-lg text-primary-foreground">
								<Target className="h-5 w-5" />
							</div>
						</div>
						<span className="hidden sm:inline gradient-text">Goal Assist</span>
					</Link>

					{/* Desktop Navigation */}
					<div className="hidden lg:flex items-center gap-1">
						{routes.map((route) => {
							const isActive = pathname === route.path;
							return (
								<Link
									key={route.path}
									href={route.path}
									prefetch={true}
									className={cn(
										"relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
										"hover:bg-accent hover:text-accent-foreground",
										isActive
											? "text-primary"
											: "text-muted-foreground"
									)}
								>
									{route.name}
									{isActive && (
										<span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
									)}
								</Link>
							);
						})}
					</div>
				</div>

				{/* Right side actions */}
				<div className="flex items-center gap-3">
					<GlobalTimer />

					{/* Command palette trigger */}
					<Button
						variant="outline"
						size="sm"
						className="hidden md:flex items-center gap-2 px-3 text-muted-foreground hover:text-foreground"
						onClick={() => {
							const event = new KeyboardEvent("keydown", {
								key: "k",
								ctrlKey: true,
							});
							document.dispatchEvent(event);
						}}
					>
						<Command className="h-3.5 w-3.5" />
						<span className="text-xs">Search</span>
						<kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-1">
							<span className="text-xs">⌘</span>K
						</kbd>
					</Button>

					<ModeToggle />

					{/* Mobile menu */}
					<Sheet>
						<SheetTrigger asChild>
							<Button variant="outline" size="icon" className="lg:hidden">
								<ChevronDown className="h-4 w-4" />
								<span className="sr-only">Toggle menu</span>
							</Button>
						</SheetTrigger>
						<SheetContent side="right" className="w-72">
							<div className="flex flex-col gap-2 mt-8">
								{routes.map((route) => {
									const isActive = pathname === route.path;
									return (
										<Link
											key={route.path}
											href={route.path}
											prefetch={true}
											className={cn(
												"flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
												isActive
													? "bg-primary/10 text-primary"
													: "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
											)}
										>
											<route.icon className="h-5 w-5" />
											{route.name}
										</Link>
									);
								})}
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</nav>
	);
}
