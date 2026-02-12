"use client";

import { useQuery } from "@tanstack/react-query";
import { getTodaysTaskSummary } from "@/services/taskService";
import { getPageMilestoneSummary } from "@/services/milestoneService";
import { getSatisfactionSummary } from "@/services/satisfactionService";
import SummaryCard from "@/components/summary-card";
import TaskSummary from "@/components/task-summary";
import SatisfactionCalendar from "@/components/satisfaction-calendar";
import MilestoneProgress from "@/components/milestone-progress";
import SmartCalendar from "@/components/smart-calendar";
import StandupSummary from "@/components/standup-summary";
import { Task, Milestone, SatisfactionSummary as SatisfactionSummaryType } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Target, Smile, Calendar, TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskSummaryData {
	completed: number;
	total: number;
	tasks: Task[];
}

interface MilestoneSummaryData {
	active: number;
	total: number;
	milestones: Milestone[];
}

export default function DashboardPage() {
	const {
		data: summaryData,
		isLoading: loadingSummary,
		error: errorSummary,
	} = useQuery({
		queryKey: ["dashboardSummary"],
		queryFn: async () => {
			const [tasks, milestones, satisfaction] = await Promise.all([
				getTodaysTaskSummary(),
				getPageMilestoneSummary(),
				getSatisfactionSummary(),
			]);
			return { tasks, milestones, satisfaction };
		},
		staleTime: 30000,
		refetchOnMount: true,
		refetchOnWindowFocus: false,
		retry: 1,
		networkMode: "online",
	});

	return (
		<div className="flex-1 space-y-8 py-6">
			{/* Hero Header */}
			<header className="space-y-2">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-xl bg-primary/10">
						<Sparkles className="h-6 w-6 text-primary" />
					</div>
					<div>
						<h1 className="text-3xl font-display font-bold tracking-tight">
							Good {getGreeting()}
						</h1>
						<p className="text-muted-foreground font-body">
							Here's what's on your plate today
						</p>
					</div>
				</div>
			</header>

			{/* Stats Grid - Bento Style */}
			<section className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
				{loadingSummary ? (
					<>
						<StatSkeleton delay={0} />
						<StatSkeleton delay={50} />
						<StatSkeleton delay={100} />
					</>
				) : errorSummary ? (
					<Card className="col-span-full p-6 border-destructive/50 bg-destructive/5">
						<p className="text-destructive">
							Error loading summaries: {errorSummary.message}
						</p>
					</Card>
				) : (
					<>
						{summaryData?.tasks?.total === 0 ? (
							<SummaryCard
								title="Today's Tasks"
								value="All Clear"
								description="No tasks scheduled for today"
								icon={CheckCircle2}
								accentColor="success"
								delay={0}
							/>
						) : (
							<SummaryCard
								title="Today's Tasks"
								value={`${summaryData?.tasks?.completed ?? 0}/${summaryData?.tasks?.total ?? 0}`}
								description={getTaskDescription(
									summaryData?.tasks?.completed ?? 0,
									summaryData?.tasks?.total ?? 0
								)}
								icon={CheckCircle2}
								accentColor="primary"
								delay={0}
							/>
						)}
						<SummaryCard
							title="Active Milestones"
							value={summaryData?.milestones?.activeCount ?? 0}
							description="Goals in progress"
							icon={Target}
							accentColor="accent"
							delay={100}
						/>
						<SummaryCard
							title="Satisfaction"
							value={
								summaryData?.satisfaction?.currentScore
									? `${summaryData.satisfaction.currentScore}/10`
									: "N/A"
							}
							description="From previous log"
							change={summaryData?.satisfaction?.change}
							icon={Smile}
							accentColor={
								(summaryData?.satisfaction?.currentScore ?? 0) >= 7
									? "success"
									: "primary"
							}
							delay={200}
						/>
					</>
				)}
			</section>

			{/* Main Content Grid */}
			<section className="grid gap-6 lg:grid-cols-3">
				{/* Tasks Section - Takes 2 columns */}
				<Card
					variant="elevated"
					className="lg:col-span-2 animate-fade-up"
					style={{ animationDelay: "150ms" }}
				>
					<CardHeader className="pb-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="p-2 rounded-lg bg-primary/10 text-primary">
									<CheckCircle2 className="h-5 w-5" />
								</div>
								<div>
									<CardTitle>Today's Tasks</CardTitle>
									<CardDescription>What you need to get done</CardDescription>
								</div>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<TaskSummary />
					</CardContent>
				</Card>

				{/* Satisfaction Calendar - Takes 1 column */}
				<Card
					variant="glass"
					className="animate-fade-up overflow-hidden"
					style={{ animationDelay: "200ms" }}
				>
					<CardHeader className="pb-2">
						<div className="flex items-center gap-3">
							<div className="p-2 rounded-lg bg-accent/20 text-accent-foreground">
								<Smile className="h-5 w-5" />
							</div>
							<div>
								<CardTitle className="text-lg">Mood Calendar</CardTitle>
								<CardDescription>Track your satisfaction</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="p-4">
						<SatisfactionCalendar />
					</CardContent>
				</Card>
			</section>

			{/* Tabs Section */}
			<section
				className="animate-fade-up"
				style={{ animationDelay: "250ms" }}
			>
				<Tabs defaultValue="progress" className="space-y-6">
					<TabsList className="bg-muted/50 p-1 rounded-xl">
						<TabsTrigger
							value="progress"
							className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
						>
							<TrendingUp className="h-4 w-4 mr-2" />
							Progress
						</TabsTrigger>
						<TabsTrigger
							value="calendar"
							className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
						>
							<Calendar className="h-4 w-4 mr-2" />
							Calendar
						</TabsTrigger>
						<TabsTrigger
							value="standup"
							className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
						>
							<Sparkles className="h-4 w-4 mr-2" />
							Standup
						</TabsTrigger>
					</TabsList>

					<TabsContent value="progress" className="mt-6">
						<Card variant="elevated">
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="p-2 rounded-lg bg-primary/10 text-primary">
										<Target className="h-5 w-5" />
									</div>
									<div>
										<CardTitle>Milestone Progress</CardTitle>
										<CardDescription>
											Track your progress on active milestones
										</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<MilestoneProgress />
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="calendar" className="mt-6">
						<Card variant="elevated">
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="p-2 rounded-lg bg-primary/10 text-primary">
										<Calendar className="h-5 w-5" />
									</div>
									<div>
										<CardTitle>Smart Calendar</CardTitle>
										<CardDescription>
											Your upcoming schedule and deadlines
										</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<SmartCalendar />
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="standup" className="mt-6">
						<Card variant="elevated">
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="p-2 rounded-lg bg-primary/10 text-primary">
										<Sparkles className="h-5 w-5" />
									</div>
									<div>
										<CardTitle>Standup Summary</CardTitle>
										<CardDescription>
											Your progress from the last 2 days
										</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<StandupSummary />
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</section>
		</div>
	);
}

// Helper functions
function getGreeting(): string {
	const hour = new Date().getHours();
	if (hour < 12) return "morning";
	if (hour < 17) return "afternoon";
	return "evening";
}

function getTaskDescription(completed: number, total: number): string {
	if (total === 0) return "No tasks today";
	if (completed === total) return "All tasks completed!";
	const remaining = total - completed;
	return `${remaining} task${remaining > 1 ? "s" : ""} remaining`;
}

// Skeleton component for loading state
function StatSkeleton({ delay }: { delay: number }) {
	return (
		<Card
			className="animate-fade-up"
			style={{ animationDelay: `${delay}ms` }}
		>
			<CardContent className="p-6">
				<div className="flex items-start justify-between mb-4">
					<div className="flex items-center gap-3">
						<Skeleton className="h-10 w-10 rounded-xl" />
						<Skeleton className="h-4 w-20" />
					</div>
					<Skeleton className="h-6 w-12 rounded-full" />
				</div>
				<Skeleton className="h-12 w-24 mb-2" />
				<Skeleton className="h-4 w-32" />
			</CardContent>
		</Card>
	);
}
