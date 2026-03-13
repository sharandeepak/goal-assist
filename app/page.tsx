"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowTrendUp, faPlus, faVideo, faArrowUpRightFromSquare, faEllipsis, faPlay, faStop } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/common/ui/button";

import SatisfactionCalendar from "@/features/satisfaction/components/satisfaction-calendar";
import TaskSummary from "@/features/tasks/components/task-summary";
import WorkspaceSwitcher from "@/features/workspace/components/workspace-switcher";

export default function DashboardPage() {
	return (
		<div className="flex-1 space-y-6 max-w-7xl mx-auto w-full">
			{/* Header */}
			<header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div className="flex flex-col gap-3">
					<WorkspaceSwitcher />
					<div>
						<h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
						<p className="text-muted-foreground font-body mt-1 text-sm">Plan, prioritize, and accomplish your tasks with ease.</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5">
						<FontAwesomeIcon icon={faPlus} className="mr-2 text-sm" /> Add Project
					</Button>
					<Button variant="outline" className="rounded-full px-5 border-primary/20 text-primary hover:bg-primary/5">
						Import Data
					</Button>
				</div>
			</header>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
				{/* Total Projects */}
				<div className="bg-primary text-primary-foreground rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
					<div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
					<div className="flex justify-between items-start mb-4 relative z-10">
						<span className="font-medium text-primary-foreground/90 text-sm">Total Projects</span>
						<div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
							<FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
						</div>
					</div>
					<div className="relative z-10">
						<h2 className="text-4xl font-bold font-display tracking-tight mb-2">24</h2>
						<div className="flex items-center gap-1.5 text-xs text-primary-foreground/80 bg-black/10 w-fit px-2 py-1 rounded-md backdrop-blur-sm">
							<FontAwesomeIcon icon={faArrowTrendUp} className="text-[10px]" />
							<span>Increased from last month</span>
						</div>
					</div>
				</div>

				{/* Ended Projects */}
				<div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
					<div className="flex justify-between items-start mb-4">
						<span className="font-medium text-foreground text-sm">Ended Projects</span>
						<div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">
							<FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs text-muted-foreground" />
						</div>
					</div>
					<div>
						<h2 className="text-4xl font-bold font-display tracking-tight mb-2 text-foreground">10</h2>
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted w-fit px-2 py-1 rounded-md">
							<FontAwesomeIcon icon={faArrowTrendUp} className="text-[10px]" />
							<span>Increased from last month</span>
						</div>
					</div>
				</div>

				{/* Running Projects */}
				<div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
					<div className="flex justify-between items-start mb-4">
						<span className="font-medium text-foreground text-sm">Running Projects</span>
						<div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">
							<FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs text-muted-foreground" />
						</div>
					</div>
					<div>
						<h2 className="text-4xl font-bold font-display tracking-tight mb-2 text-foreground">12</h2>
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted w-fit px-2 py-1 rounded-md">
							<FontAwesomeIcon icon={faArrowTrendUp} className="text-[10px]" />
							<span>Increased from last month</span>
						</div>
					</div>
				</div>

				{/* Pending Project */}
				<div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
					<div className="flex justify-between items-start mb-4">
						<span className="font-medium text-foreground text-sm">Pending Project</span>
						<div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">
							<FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs text-muted-foreground" />
						</div>
					</div>
					<div>
						<h2 className="text-4xl font-bold font-display tracking-tight mb-2 text-foreground">2</h2>
						<div className="text-xs font-medium text-muted-foreground bg-muted/60 w-fit px-2.5 py-1 rounded-md">
							On Discuss
						</div>
					</div>
				</div>
			</div>

			{/* Main Content Areas */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
				{/* Left Column (Analytics, Collaboration) */}
				<div className="lg:col-span-2 space-y-5">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
						{/* Analytics Chart Placeholder */}
						<div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm min-h-[220px]">
							<div className="flex items-center justify-between mb-6">
								<h3 className="font-semibold text-foreground">Project Analytics</h3>
								<FontAwesomeIcon icon={faEllipsis} className="text-muted-foreground" />
							</div>
							<div className="flex items-end justify-between h-32 gap-2 mt-auto">
								{/* Placeholder bars */}
								{[40, 60, 90, 100, 70, 50, 40].map((h, i) => (
									<div key={i} className="flex flex-col items-center gap-2 flex-1">
										<div className={`w-full rounded-full ${i === 3 ? 'bg-primary' : i === 2 ? 'bg-primary/70' : 'bg-primary/20'} transition-all`} style={{ height: `${h}%` }}></div>
										<span className="text-[10px] text-muted-foreground font-medium">{['S','M','T','W','T','F','S'][i]}</span>
									</div>
								))}
							</div>
						</div>

						{/* Reminders */}
						<div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[220px]">
							<div>
								<h3 className="font-semibold text-foreground mb-4">Reminders</h3>
								<h4 className="text-xl font-bold text-primary font-display leading-tight mb-1">Meeting with Arc<br/>Company</h4>
								<p className="text-sm text-muted-foreground">Time : 02.00 pm - 04.00 pm</p>
							</div>
							<Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl mt-4">
								<FontAwesomeIcon icon={faVideo} className="mr-2" /> Start Meeting
							</Button>
						</div>
					</div>

					{/* Mood Calendar (replacing Team Collaboration) */}
					<div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
						<SatisfactionCalendar />
					</div>
				</div>

				{/* Right Column (Projects, Time Tracker) */}
				<div className="space-y-5">
					{/* Projects List */}
					<div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
						<div className="flex items-center justify-between mb-5">
							<h3 className="font-semibold text-foreground">Project</h3>
							<Button variant="outline" size="sm" className="h-7 text-xs rounded-full px-3">
								<FontAwesomeIcon icon={faPlus} className="mr-1" /> New
							</Button>
						</div>
						
						<div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
							<TaskSummary />
						</div>
					</div>

					{/* Time Tracker Placeholder */}
					<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c2a1e] to-black p-6 shadow-md border border-primary/20">
						{/* Wavy Background Graphic Placeholder */}
						<div className="absolute inset-0 opacity-40">
							<svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full text-primary">
								<path d="M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z" fill="currentColor" opacity="0.3"></path>
								<path d="M0,60 Q35,40 60,60 T100,60 L100,100 L0,100 Z" fill="currentColor" opacity="0.5"></path>
							</svg>
						</div>
						<div className="relative z-10 flex flex-col h-full">
							<h3 className="font-medium text-white/80 mb-2">Time Tracker</h3>
							<div className="text-[2.5rem] font-bold text-white font-mono tracking-wider mb-6 drop-shadow-lg">
								01:24:08
							</div>
							<div className="flex items-center gap-4">
								<button className="w-12 h-12 rounded-full bg-white text-primary flex items-center justify-center hover:scale-105 transition-transform shadow-lg">
									<FontAwesomeIcon icon={faPlay} className="ml-1 text-lg" />
								</button>
								<button className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg">
									<FontAwesomeIcon icon={faStop} className="text-lg" />
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}