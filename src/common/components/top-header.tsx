"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faEnvelope, faBell } from "@fortawesome/free-solid-svg-icons";
import { ModeToggle } from "./mode-toggle";
import GlobalTimer from "@/features/timesheet/components/global-timer";

export default function TopHeader() {
	return (
		<header className="sticky top-0 z-40 h-20 flex items-center justify-between px-8 bg-background/80 backdrop-blur-md border-b shrink-0">
			{/* Search */}
			<div className="relative w-96 max-w-full hidden md:block">
				<div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-muted-foreground/60">
					<FontAwesomeIcon icon={faMagnifyingGlass} className="text-sm" />
				</div>
				<input
					type="text"
					className="w-full bg-muted/40 border border-border/50 text-foreground text-sm rounded-full focus:ring-primary focus:border-primary block pl-10 p-2.5 outline-none transition-all"
					placeholder="Search task"
				/>
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

				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center border border-primary/30">
						{/* Placeholder for user avatar */}
						<img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full object-cover" />
					</div>
					<div className="hidden sm:flex flex-col">
						<span className="text-sm font-semibold leading-none mb-1">Totok Michael</span>
						<span className="text-xs text-muted-foreground leading-none">tmichael20@mail.com</span>
					</div>
				</div>
			</div>
		</header>
	);
}
