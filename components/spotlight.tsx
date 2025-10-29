"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Command, Mic, Calendar, Target, LineChart, CheckSquare, X, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command as CommandPrimitive } from "cmdk";

export default function Spotlight() {
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((open) => !open);
			}
			if (e.key === "Escape") {
				setOpen(false);
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	useEffect(() => {
		if (open) {
			inputRef.current?.focus();
		}
	}, [open]);

	const runCommand = (command: () => void) => {
		setOpen(false);
		command();
	};

	return (
		<>
			{open && (
				<div className="fixed inset-0 z-50 spotlight-overlay flex items-start justify-center pt-20 sm:pt-[20vh]" onClick={() => setOpen(false)}>
					<div className="relative w-full max-w-lg overflow-hidden rounded-lg border bg-background shadow-lg animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
						<CommandPrimitive>
							<div className="flex items-center border-b px-3">
								<Command className="mr-2 h-4 w-4 shrink-0 opacity-50" />
								<CommandPrimitive.Input ref={inputRef} className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50" placeholder="Type a command or search..." />
								<Button variant="ghost" size="sm" className="h-5 w-5 rounded-md p-0 opacity-70" onClick={() => setOpen(false)}>
									<X className="h-4 w-4" />
								</Button>
							</div>
							<CommandPrimitive.List className="max-h-[60vh] overflow-y-auto">
								<CommandPrimitive.Empty>No results found.</CommandPrimitive.Empty>
								<CommandPrimitive.Group heading="Navigation" className="p-2">
									<CommandPrimitive.Item className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground cursor-pointer" onSelect={() => runCommand(() => router.push("/"))}>
										<div className="flex h-5 w-5 items-center justify-center">
											<Command className="h-4 w-4" />
										</div>
										Go to Dashboard
									</CommandPrimitive.Item>
									<CommandPrimitive.Item className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground cursor-pointer" onSelect={() => runCommand(() => router.push("/planner"))}>
										<div className="flex h-5 w-5 items-center justify-center">
											<CheckSquare className="h-4 w-4" />
										</div>
										Go to Day Planner
									</CommandPrimitive.Item>
									<CommandPrimitive.Item className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground cursor-pointer" onSelect={() => runCommand(() => router.push("/voice-log"))}>
										<div className="flex h-5 w-5 items-center justify-center">
											<Mic className="h-4 w-4" />
										</div>
										Start Voice Log
									</CommandPrimitive.Item>
									<CommandPrimitive.Item className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground cursor-pointer" onSelect={() => runCommand(() => router.push("/milestones"))}>
										<div className="flex h-5 w-5 items-center justify-center">
											<Target className="h-4 w-4" />
										</div>
										View Milestones
									</CommandPrimitive.Item>
									<CommandPrimitive.Item className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground cursor-pointer" onSelect={() => runCommand(() => router.push("/analytics"))}>
										<div className="flex h-5 w-5 items-center justify-center">
											<LineChart className="h-4 w-4" />
										</div>
										View Analytics
									</CommandPrimitive.Item>
									<CommandPrimitive.Item className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground cursor-pointer" onSelect={() => runCommand(() => router.push("/calendar"))}>
										<div className="flex h-5 w-5 items-center justify-center">
											<Calendar className="h-4 w-4" />
										</div>
										Open Calendar
									</CommandPrimitive.Item>
									<CommandPrimitive.Item className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground cursor-pointer" onSelect={() => runCommand(() => router.push("/timesheet"))}>
										<div className="flex h-5 w-5 items-center justify-center">
											<Clock className="h-4 w-4" />
										</div>
										Open Timesheet
									</CommandPrimitive.Item>
								</CommandPrimitive.Group>
								<CommandPrimitive.Group heading="Actions" className="p-2">
									<CommandPrimitive.Item className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground cursor-pointer" onSelect={() => runCommand(() => router.push("/planner?action=add"))}>
										<div className="flex h-5 w-5 items-center justify-center">
											<CheckSquare className="h-4 w-4" />
										</div>
										Add New Task
									</CommandPrimitive.Item>
									<CommandPrimitive.Item className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground cursor-pointer" onSelect={() => runCommand(() => router.push("/voice-log?action=start"))}>
										<div className="flex h-5 w-5 items-center justify-center">
											<Mic className="h-4 w-4" />
										</div>
										Start Voice Recording
									</CommandPrimitive.Item>
									<CommandPrimitive.Item className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground cursor-pointer" onSelect={() => runCommand(() => router.push("/milestones?action=add"))}>
										<div className="flex h-5 w-5 items-center justify-center">
											<Target className="h-4 w-4" />
										</div>
										Add New Milestone
									</CommandPrimitive.Item>
									<CommandPrimitive.Item className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground cursor-pointer" onSelect={() => runCommand(() => router.push("/?action=start-timer"))}>
										<div className="flex h-5 w-5 items-center justify-center">
											<Clock className="h-4 w-4" />
										</div>
										Start Timer
									</CommandPrimitive.Item>
									<CommandPrimitive.Item className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground cursor-pointer" onSelect={() => runCommand(() => router.push("/timesheet?action=add"))}>
										<div className="flex h-5 w-5 items-center justify-center">
											<Plus className="h-4 w-4" />
										</div>
										Add Time Entry
									</CommandPrimitive.Item>
								</CommandPrimitive.Group>
							</CommandPrimitive.List>
						</CommandPrimitive>
					</div>
				</div>
			)}
		</>
	);
}
