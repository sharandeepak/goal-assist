"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/common/ui/calendar";
import { Card, CardContent } from "@/common/ui/card";
import { Badge } from "@/common/ui/badge";
import { Skeleton } from "@/common/ui/skeleton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faCircleCheck,
	faBullseye,
	faPlus,
	faCalendarDays,
	faClock,
	faCircleExclamation,
	faCircle,
} from "@fortawesome/free-solid-svg-icons";
import { Task, Milestone } from "@/common/types";
import { useRequiredAuth } from "@/common/hooks/use-auth";
import { getTasksForDate, addTask } from "@/features/tasks/services/taskService";
import {
	getMilestonesEndingOnDate,
	getNextActiveMilestone,
} from "@/features/milestones/services/milestoneService";
import { format, startOfDay, differenceInCalendarDays, getDay } from "date-fns";
import { Button } from "@/common/ui/button";
import { TaskFormDialog, TaskFormData } from "@/features/tasks/components/task-form-dialog";
import { cn } from "@/common/lib/utils";
import { styles } from "../styles/SmartCalendar.styles";

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
	const { userId, companyId, employeeId } = useRequiredAuth();
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

				if (nextMilestone && nextMilestone.end_date) {
					const days = calculateWorkingDays(date, new Date(nextMilestone.end_date));
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
		const dateToSave = formData.date || (date ? startOfDay(date).toISOString() : new Date().toISOString());

		const taskToAdd = {
			title: formData.title!,
			completed: false,
			date: dateToSave,
			priority: formData.priority!,
			user_id: userId,
			company_id: companyId,
			employee_id: employeeId,
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
			<div className={styles.root}>
				<div className={styles.calendarWrapper}>
					<Calendar
						mode="single"
						selected={date}
						onSelect={setDate}
						className={styles.calendar}
					/>
				</div>
				<div className={styles.detailsColumn}>
					{!date ? (
						<div className={styles.emptyState}>
							<div className={styles.emptyStateIcon}>
								<FontAwesomeIcon icon={faCalendarDays} className="h-6 w-6 text-muted-foreground" />
							</div>
							<p className={styles.emptyStateText}>Select a date to view details</p>
						</div>
					) : loadingDetails ? (
						<Card variant="elevated" className="h-full">
							<CardContent className={styles.cardContentLoading}>
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
							<CardContent className={styles.cardContentError}>
								<div className={styles.errorWrapper}>
									<FontAwesomeIcon icon={faCircleExclamation} className="h-4 w-4" />
									<p className={styles.errorText}>{errorDetails}</p>
								</div>
							</CardContent>
						</Card>
					) : (
						<Card variant="elevated" className="h-full">
							<CardContent className={styles.cardContent}>
								<div className={styles.contentInner}>
									<div className={styles.header}>
										<div>
											<h3 className={styles.headerTitle}>
												{format(date, "EEEE, MMMM d")}
											</h3>
											<Badge variant="soft" size="lg" className={styles.badge}>
												<FontAwesomeIcon icon={faClock} className="h-3 w-3" />
												{workingDaysToNextMilestone !== null
													? `${workingDaysToNextMilestone} working day${workingDaysToNextMilestone !== 1 ? "s" : ""} until milestone`
													: "No upcoming milestones"}
											</Badge>
										</div>
										{date && (
											<Button onClick={openAddTaskDialog} size="sm" className={styles.addButton}>
												<FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
												Add Task
											</Button>
										)}
									</div>

									<div>
										<h4 className={styles.sectionTitle}>
											<div className={styles.iconWrapperPrimary}>
												<FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4 text-primary" />
											</div>
											Tasks ({selectedDateTasks.length})
										</h4>
										{selectedDateTasks.length > 0 ? (
											<ul className={styles.taskList}>
												{selectedDateTasks.map((task) => (
													<li
														key={task.id}
														className={cn(styles.taskItem, "bg-muted/30 hover:bg-muted/50")}
													>
														{task.completed ? (
															<FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4 text-green-500 flex-shrink-0" />
														) : (
															<FontAwesomeIcon icon={faCircle} className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
											<div className={styles.emptyList}>
												<p className={styles.emptyListText}>No tasks scheduled</p>
											</div>
										)}
									</div>

									<div>
										<h4 className={styles.sectionTitle}>
											<div className={styles.iconWrapperDestructive}>
												<FontAwesomeIcon icon={faBullseye} className="h-4 w-4 text-destructive" />
											</div>
											Milestones Due ({selectedDateMilestones.length})
										</h4>
										{selectedDateMilestones.length > 0 ? (
											<ul className={styles.milestoneList}>
												{selectedDateMilestones.map((milestone) => (
													<li
														key={milestone.id}
														className={styles.milestoneItem}
													>
														<FontAwesomeIcon icon={faBullseye} className="h-4 w-4 text-destructive flex-shrink-0" />
														<span className="text-sm font-medium">{milestone.title}</span>
													</li>
												))}
											</ul>
										) : (
											<div className={styles.emptyList}>
												<p className={styles.emptyListText}>No milestones due</p>
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
				initialData={date ? { date: startOfDay(date).toISOString() } : null}
				dialogTitle={`Add Task for ${date ? format(date, "MMM d") : "Selected Date"}`}
				dialogDescription="Enter details for the new task. Priority is required."
			/>
		</>
	);
}
