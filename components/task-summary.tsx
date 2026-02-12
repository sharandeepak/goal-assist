"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, AlertCircle, ListTodo, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Task } from "@/types";
import { subscribeToTaskSummary, updateTaskCompletion } from "@/services/taskService";
import Link from "next/link";

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
			<div className="mt-4 space-y-3">
				{[...Array(5)].map((_, i) => (
					<div
						key={i}
						className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-muted/30 animate-fade-up"
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
			<div className="mt-4 flex items-center gap-2 p-4 rounded-xl bg-destructive/5 text-destructive">
				<AlertCircle className="h-4 w-4" />
				<p className="text-sm">{error}</p>
			</div>
		);
	}

	if (tasks.length === 0) {
		return (
			<div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
				<div className="p-3 rounded-full bg-muted/50 mb-3">
					<ListTodo className="h-6 w-6 text-muted-foreground" />
				</div>
				<p className="text-sm text-muted-foreground">No tasks found for today</p>
			</div>
		);
	}

	return (
		<div className="mt-4 space-y-2">
			{toggleError && (
				<div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/5 text-destructive mb-2">
					<AlertCircle className="h-3 w-3" />
					<p className="text-xs">{toggleError}</p>
				</div>
			)}
			{tasks.slice(0, 7).map((task, index) => (
				<div
					key={task.id}
					className={cn(
						"flex items-center gap-3 text-sm py-2.5 px-3 rounded-xl transition-all duration-200",
						"bg-muted/30 hover:bg-muted/50 cursor-pointer group",
						"animate-fade-up"
					)}
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
					<span
						className={cn(
							"flex-grow truncate font-medium",
							task.completed ? "line-through text-muted-foreground" : ""
						)}
					>
						{task.title}
					</span>
				</div>
			))}
			{tasks.length > 5 && (
				<Link
					href="/planner?tab=all"
					className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary text-center py-3 rounded-xl hover:bg-muted/30 transition-colors group"
				>
					<span>View all tasks</span>
					<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
				</Link>
			)}
		</div>
	);
}
