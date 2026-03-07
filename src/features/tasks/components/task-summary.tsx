"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircle, faCircleExclamation, faListCheck, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { Skeleton } from "@/common/ui/skeleton";
import { Task } from "@/common/types";
import { subscribeToTaskSummary, updateTaskCompletion } from "@/features/tasks/services/taskService";
import Link from "next/link";
import { styles } from "../styles/TaskSummary.styles";

export default function TaskSummary() {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [toggleError, setToggleError] = useState<string | null>(null);

	useEffect(() => {
		setLoading(true);
		setError(null);

		const unsubscribe = subscribeToTaskSummary(
			(fetchedTasks) => {
				setTasks(fetchedTasks);
				setLoading(false);
			},
			(err) => {
				console.error(err);
				setError("Failed to load tasks.");
				setLoading(false);
			}
		);

		return () => unsubscribe();
	}, []);

	const handleTaskToggle = async (taskId: string, currentCompleted: boolean) => {
		setToggleError(null);
		try {
			await updateTaskCompletion(taskId, !currentCompleted, undefined);
		} catch (err) {
			console.error("Failed to update task completion from summary:", err);
			setToggleError("Failed to update task.");
		}
	};

	if (loading) {
		return (
			<div className={styles.skeletonContainer}>
				{[...Array(5)].map((_, i) => (
					<div
						key={i}
						className={styles.skeletonItem}
						style={{ animationDelay: `${i * 50}ms` }}
					>
						<Skeleton className="h-5 w-5 rounded-full" />
						<Skeleton className="h-4 flex-1" />
					</div>
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.errorState}>
				<FontAwesomeIcon icon={faCircleExclamation} className="h-4 w-4" />
				<p className="text-sm">{error}</p>
			</div>
		);
	}

	if (tasks.length === 0) {
		return (
			<div className={styles.emptyState}>
				<div className={styles.emptyIcon}>
					<FontAwesomeIcon icon={faListCheck} className="h-6 w-6 text-muted-foreground" />
				</div>
				<p className={styles.emptyText}>No tasks found for today</p>
			</div>
		);
	}

	// Array of colors/icons for aesthetics
	const taskAesthetics = [
		{ bg: "bg-blue-500/10", text: "text-blue-500", icon: faCircle },
		{ bg: "bg-teal-500/10", text: "text-teal-500", icon: faCircle },
		{ bg: "bg-green-500/10", text: "text-green-500", icon: faCircle },
		{ bg: "bg-orange-500/10", text: "text-orange-500", icon: faCircle },
		{ bg: "bg-purple-500/10", text: "text-purple-500", icon: faCircle },
	];

	return (
		<div className={styles.container}>
			{toggleError && (
				<div className={styles.toggleError}>
					<FontAwesomeIcon icon={faCircleExclamation} className="h-3 w-3" />
					<p className="text-xs">{toggleError}</p>
				</div>
			)}
			{tasks.slice(0, 7).map((task, index) => {
				const aesthetic = taskAesthetics[index % taskAesthetics.length];
				const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date';
				
				return (
					<div
						key={task.id}
						className={`${styles.taskItem} group`}
						style={{ animationDelay: `${index * 30}ms` }}
						onClick={() => handleTaskToggle(task.id, task.completed)}
					>
						<button
							aria-label={`Mark task ${task.title} as ${task.completed ? "incomplete" : "complete"}`}
							className={`p-0 m-0 cursor-pointer flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors ${task.completed ? "bg-green-500/10 text-green-500" : aesthetic.bg + " " + aesthetic.text}`}
						>
							{task.completed ? (
								<FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4" />
							) : (
								<FontAwesomeIcon icon={aesthetic.icon} className="h-4 w-4 opacity-70 group-hover:opacity-100" />
							)}
						</button>
						<div className={styles.taskContent}>
							<span className={task.completed ? styles.taskTitleCompleted : styles.taskTitle}>
								{task.title}
							</span>
							<span className={styles.taskSubtext}>
								Due date: {dueDate}
							</span>
						</div>
					</div>
				);
			})}
			{tasks.length > 5 && (
				<Link href="/planner?tab=all" className={`${styles.viewAllLink} group`}>
					<span>View all tasks</span>
					<FontAwesomeIcon icon={faArrowRight} className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
				</Link>
			)}
		</div>
	);
}
