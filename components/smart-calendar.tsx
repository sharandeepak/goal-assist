"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	CheckCircle2,
	Target,
	Plus,
	CalendarDays,
	Clock,
	AlertCircle,
	Circle,
} from "lucide-react";
import { Task, Milestone } from "@/types";
import { getTasksForDate, addTask } from "@/services/taskService";
import {
	getMilestonesEndingOnDate,
	getNextActiveMilestone,
} from "@/services/milestoneService";
import { format, startOfDay, differenceInCalendarDays, getDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Timestamp } from "firebase/firestore";
import { TaskFormDialog, TaskFormData } from "@/components/task-form-dialog";
import { cn } from "@/lib/utils";

// Helper function to calculate working days (Mon-Fri)
function calculateWorkingDays(startDate: Date, endDate: Date): number {
	let count = 0;
	const currentDate = new Date(startDate);

	if (differenceInCalendarDays(endDate, startDate) <= 0) return 0;

	while (currentDate < endDate) {
		const dayOfWeek = getDay(currentDate);
		if (dayOfWeek !== 0 && dayOfWeek !== 6) {
			count++;
		}
		currentDate.setDate(currentDate.getDate() + 1);
		if (startOfDay(currentDate).getTime() >= startOfDay(endDate).getTime()) {
			break;
		}
	}
	return count;
}

export default function SmartCalendar() {
	const [date, setDate] = useState<Date | undefined>(new Date());
	const [selectedDateTasks, setSelectedDateTasks] = useState<Task[]>([]);
	const [selectedDateMilestones, setSelectedDateMilestones] = useState<Milestone[]>([]);
	const [workingDaysToNextMilestone, setWorkingDaysToNextMilestone] = useState<number | null>(null);
	const [loadingDetails, setLoadingDetails] = useState(false);
	const [errorDetails, setErrorDetails] = useState<string | null>(null);
	const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);

	useEffect(() => {
		if (!date) {
			setSelectedDateTasks([]);
			setSelectedDateMilestones([]);
			setWorkingDaysToNextMilestone(null);
			setErrorDetails(null);
			return;
		}

		const fetchDataForDate = async () => {
			setLoadingDetails(true);
			setErrorDetails(null);

			try {
				const [fetchedTasks, fetchedMilestones, nextMilestone] = await Promise.all([
					getTasksForDate(date),
					getMilestonesEndingOnDate(date),
					getNextActiveMilestone(date),
				]);

				setSelectedDateTasks(fetchedTasks);
				setSelectedDateMilestones(fetchedMilestones);

				if (nextMilestone && nextMilestone.endDate) {
					const days = calculateWorkingDays(date, nextMilestone.endDate.toDate());
					setWorkingDaysToNextMilestone(days);
				} else {
					setWorkingDaysToNextMilestone(null);
				}
			} catch (error) {
				console.error("Error fetching calendar data: ", error);
				setErrorDetails("Failed to load details for the selected date.");
				setSelectedDateTasks([]);
				setSelectedDateMilestones([]);
				setWorkingDaysToNextMilestone(null);
			} finally {
				setLoadingDetails(false);
			}
		};

		fetchDataForDate();
	}, [date]);

	const openAddTaskDialog = () => {
		if (!date) return;
		setIsAddTaskDialogOpen(true);
	};

	const handleAddTaskSubmit = async (formData: TaskFormData) => {
		const dateToSave = formData.date || (date ? Timestamp.fromDate(startOfDay(date)) : Timestamp.now());

		const taskToAdd: Omit<Task, "id"> = {
			title: formData.title!,
			completed: false,
			date: dateToSave,
			priority: formData.priority!,
			createdAt: Timestamp.now(),
			tags:
				formData.tagsString
					?.split(",")
					.map((tag: string) => tag.trim())
					.filter((tag: string) => tag !== "") || [],
		};
		try {
			await addTask(taskToAdd);
			setIsAddTaskDialogOpen(false);
			if (date) {
				getTasksForDate(date)
					.then(setSelectedDateTasks)
					.catch((err) => console.error("Error refetching tasks after add:", err));
			}
		} catch (err) {
			console.error("Failed to add task from calendar:", err);
			throw err instanceof Error ? err : new Error("Failed to add task.");
		}
	};

	return (
		<>
			<div className="flex flex-col md:flex-row gap-6">
				<div className="md:w-1/2 flex justify-center">
					<Calendar
						mode="single"
						selected={date}
						onSelect={setDate}
						className="rounded-xl border bg-card p-4"
					/>
				</div>
				<div className="md:w-1/2">
					{!date ? (
						<div className="flex flex-col items-center justify-center h-full p-8 border rounded-xl bg-muted/30">
							<div className="p-3 rounded-full bg-muted/50 mb-3">
								<CalendarDays className="h-6 w-6 text-muted-foreground" />
							</div>
							<p className="text-muted-foreground">Select a date to view details</p>
						</div>
					) : loadingDetails ? (
						<Card variant="elevated" className="h-full">
							<CardContent className="p-5 space-y-4">
								<Skeleton className="h-7 w-2/3 mb-2" />
								<Skeleton className="h-6 w-full mb-4 rounded-full" />
								<div className="space-y-3">
									<Skeleton className="h-4 w-20" />
									{[...Array(3)].map((_, i) => (
										<Skeleton key={i} className="h-10 w-full rounded-lg" />
									))}
								</div>
								<Skeleton className="h-10 w-full mt-4 rounded-lg" />
							</CardContent>
						</Card>
					) : errorDetails ? (
						<Card variant="elevated" className="h-full">
							<CardContent className="p-5 flex items-center justify-center">
								<div className="flex items-center gap-2 text-destructive">
									<AlertCircle className="h-4 w-4" />
									<p className="text-sm">{errorDetails}</p>
								</div>
							</CardContent>
						</Card>
					) : (
						<Card variant="elevated" className="h-full">
							<CardContent className="p-5">
								<div className="space-y-5">
									{/* Header */}
									<div className="flex justify-between items-start gap-3">
										<div>
											<h3 className="text-lg font-semibold mb-2">
												{format(date, "EEEE, MMMM d")}
											</h3>
											<Badge variant="soft" size="lg" className="gap-1.5">
												<Clock className="h-3 w-3" />
												{workingDaysToNextMilestone !== null
													? `${workingDaysToNextMilestone} working day${workingDaysToNextMilestone !== 1 ? "s" : ""} until milestone`
													: "No upcoming milestones"}
											</Badge>
										</div>
										{date && (
											<Button onClick={openAddTaskDialog} size="sm" className="gap-1.5">
												<Plus className="h-4 w-4" />
												Add Task
											</Button>
										)}
									</div>

									{/* Tasks Section */}
									<div>
										<h4 className="text-sm font-medium flex items-center gap-2 mb-3">
											<div className="p-1.5 rounded-lg bg-primary/10">
												<CheckCircle2 className="h-4 w-4 text-primary" />
											</div>
											Tasks ({selectedDateTasks.length})
										</h4>
										{selectedDateTasks.length > 0 ? (
											<ul className="space-y-2">
												{selectedDateTasks.map((task) => (
													<li
														key={task.id}
														className={cn(
															"flex items-center gap-3 p-3 rounded-xl transition-colors",
															"bg-muted/30 hover:bg-muted/50"
														)}
													>
														{task.completed ? (
															<CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
														) : (
															<Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
														)}
														<span
															className={cn(
																"text-sm font-medium",
																task.completed && "line-through text-muted-foreground"
															)}
														>
															{task.title}
														</span>
													</li>
												))}
											</ul>
										) : (
											<div className="flex items-center justify-center py-6 rounded-xl bg-muted/20">
												<p className="text-sm text-muted-foreground">No tasks scheduled</p>
											</div>
										)}
									</div>

									{/* Milestones Section */}
									<div>
										<h4 className="text-sm font-medium flex items-center gap-2 mb-3">
											<div className="p-1.5 rounded-lg bg-destructive/10">
												<Target className="h-4 w-4 text-destructive" />
											</div>
											Milestones Due ({selectedDateMilestones.length})
										</h4>
										{selectedDateMilestones.length > 0 ? (
											<ul className="space-y-2">
												{selectedDateMilestones.map((milestone) => (
													<li
														key={milestone.id}
														className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10"
													>
														<Target className="h-4 w-4 text-destructive flex-shrink-0" />
														<span className="text-sm font-medium">{milestone.title}</span>
													</li>
												))}
											</ul>
										) : (
											<div className="flex items-center justify-center py-6 rounded-xl bg-muted/20">
												<p className="text-sm text-muted-foreground">No milestones due</p>
											</div>
										)}
									</div>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>

			<TaskFormDialog
				isOpen={isAddTaskDialogOpen}
				onOpenChange={setIsAddTaskDialogOpen}
				onSubmit={handleAddTaskSubmit}
				initialData={date ? { date: Timestamp.fromDate(startOfDay(date)) } : null}
				dialogTitle={`Add Task for ${date ? format(date, "MMM d") : "Selected Date"}`}
				dialogDescription="Enter details for the new task. Priority is required."
			/>
		</>
	);
}
