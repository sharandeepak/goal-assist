"use client";

import { useState, useEffect } from "react";
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
import { Task, Milestone, SatisfactionSummary } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

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
			const [tasks, milestones, satisfaction] = await Promise.all([getTodaysTaskSummary(), getPageMilestoneSummary(), getSatisfactionSummary()]);
			return { tasks, milestones, satisfaction };
		},
		// Ensure this query doesn't block navigation
		staleTime: 30000, // 30 seconds
		refetchOnMount: true, // Refetch when component mounts
		refetchOnWindowFocus: false, // Don't refetch on window focus
		retry: 1, // Only retry once on failure
		// Use background fetching to prevent blocking
		networkMode: "online",
	});

	return (
		<div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
			<div className="flex items-center justify-between space-y-2">
				<h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
			</div>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{loadingSummary ? (
					<>
						<Skeleton className="h-24" />
						<Skeleton className="h-24" />
						<Skeleton className="h-24" />
					</>
				) : errorSummary ? (
					<p className="text-red-500 col-span-3">Error loading summaries: {errorSummary.message}</p>
				) : (
					<>
						{summaryData?.tasks?.total === 0 ? <SummaryCard title="Today's Tasks" value="🎉" description="All clear for today!" /> : <SummaryCard title="Today's Tasks" value={`${summaryData?.tasks?.completed ?? 0}/${summaryData?.tasks?.total ?? 0}`} description="Completed" />}
						<SummaryCard title="Active Milestones" value={summaryData?.milestones?.activeCount ?? 0} description="In progress" />
						<SummaryCard title="Satisfaction" value={summaryData?.satisfaction?.currentScore ? `${summaryData.satisfaction.currentScore}/10` : "N/A"} description="From previous log" change={summaryData?.satisfaction?.change} />
					</>
				)}
			</div>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<div className="space-y-4 lg:col-span-2">
					<Card
						style={{
							height: "100%",
						}}
					>
						<CardHeader>
							<CardTitle>Tasks for today</CardTitle>
							<CardDescription>What you need to get done.</CardDescription>
						</CardHeader>
						<CardContent>
							<TaskSummary />
						</CardContent>
					</Card>
				</div>
				<div
					className="space-y-4 lg:col-span-1 rounded-lg border bg-card"
					style={{
						padding: "1rem",
					}}
				>
					<Card border={false}>
						<SatisfactionCalendar />
					</Card>
				</div>
			</div>
			<Tabs defaultValue="progress" className="space-y-4">
				<TabsList>
					<TabsTrigger value="progress">Progress</TabsTrigger>
					<TabsTrigger value="calendar">Calendar</TabsTrigger>
					<TabsTrigger value="standup">Standup Summary</TabsTrigger>
				</TabsList>
				<TabsContent value="progress">
					<Card>
						<CardHeader>
							<CardTitle>Milestone Progress</CardTitle>
							<CardDescription>Track your progress on active milestones</CardDescription>
						</CardHeader>
						<CardContent>
							<MilestoneProgress />
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="calendar">
					<Card>
						<CardHeader>
							<CardTitle>Smart Calendar</CardTitle>
							<CardDescription>Your upcoming schedule and deadlines</CardDescription>
						</CardHeader>
						<CardContent>
							<SmartCalendar />
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="standup">
					<Card>
						<CardHeader>
							<CardTitle>Last 2 Day Standup Summary</CardTitle>
							<CardDescription>Your recent progress and blockers</CardDescription>
						</CardHeader>
						<CardContent>
							<StandupSummary />
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
