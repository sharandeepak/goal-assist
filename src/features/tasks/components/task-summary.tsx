"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, AlertCircle, ListTodo, ArrowRight } from "lucide-react";
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
				<AlertCircle className="h-4 w-4" />
				<p className="text-sm">{error}</p>
			</div>
		);
	}

	if (tasks.length === 0) {
		return (
			<div className={styles.emptyState}>
				<div className={styles.emptyIcon}>
					<ListTodo className="h-6 w-6 text-muted-foreground" />
				</div>
				<p className={styles.emptyText}>No tasks found for today</p>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			{toggleError && (
				<div className={styles.toggleError}>
					<AlertCircle className="h-3 w-3" />
					<p className="text-xs">{toggleError}</p>
				</div>
			)}
			{tasks.slice(0, 7).map((task, index) => (
				<div
					key={task.id}
					className={`${styles.taskItem} group`}
					style={{ animationDelay: `${index * 30}ms` }}
					onClick={() => handleTaskToggle(task.id, task.completed)}
				>
					<button
						aria-label={`Mark task ${task.title} as ${task.completed ? "incomplete" : "complete"}`}
						className="p-0 m-0 bg-transparent border-none cursor-pointer flex items-center flex-shrink-0"
					>
						{task.completed ? (
							<CheckCircle2 className="h-5 w-5 text-green-500" />
						) : (
							<Circle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
						)}
					</button>
					<span className={task.completed ? styles.taskTitleCompleted : styles.taskTitle}>
						{task.title}
					</span>
				</div>
			))}
			{tasks.length > 5 && (
				<Link href="/planner?tab=all" className={`${styles.viewAllLink} group`}>
					<span>View all tasks</span>
					<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
				</Link>
			)}
		</div>
	);
}
