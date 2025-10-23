"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Task } from "@/types"; // Import the shared Task interface
import { subscribeToTaskSummary, updateTaskCompletion } from "@/services/taskService"; // Import the service function and updateTaskCompletion
import Link from "next/link"; // Import Link

// Define the Task interface based on expected Firestore data structure
// Interface moved to @/types/index.ts

export default function TaskSummary() {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null); // Add error state
	const [toggleError, setToggleError] = useState<string | null>(null); // Error state for toggle operations

	useEffect(() => {
		setLoading(true);
		setError(null);

		const unsubscribe = subscribeToTaskSummary(
			(fetchedTasks) => {
				setTasks(fetchedTasks);
				setLoading(false);
			},
			(err) => {
				console.error(err); // Service already logs the error
				setError("Failed to load tasks.");
				setLoading(false);
			}
		);

		// Cleanup listener on component unmount
		return () => unsubscribe();
	}, []); // Empty dependency array ensures this runs once on mount

	const handleTaskToggle = async (taskId: string, currentCompleted: boolean) => {
		setToggleError(null); // Clear previous toggle error
		try {
			await updateTaskCompletion(taskId, !currentCompleted, undefined);
			// Optimistic update can be done here if desired, or rely on Firestore listener
		} catch (err) {
			console.error("Failed to update task completion from summary:", err);
			setToggleError("Failed to update task.");
			// Revert optimistic update here if implemented
		}
	};

	if (loading) {
		// Loading state: Show skeletons
		return (
			<div className="mt-4 space-y-2">
				{[...Array(5)].map((_, i) => (
					<div key={i} className="flex items-center gap-2 py-1 px-2">
						<Skeleton className="h-4 w-4 rounded-full" />
						<Skeleton className="h-4 w-3/4" />
					</div>
				))}
			</div>
		);
	}

	if (error) {
		// Error state
		return <div className="mt-4 text-center text-sm text-red-600">{error}</div>;
	}

	if (tasks.length === 0) {
		// No data state
		return <div className="mt-4 text-center text-sm text-muted-foreground">No tasks found for today.</div>;
	}

	// Display fetched tasks
	return (
		<div className="mt-4 space-y-2">
			{toggleError && <p className="text-xs text-red-500 text-center py-1">{toggleError}</p>}
			{tasks.slice(0, 7).map((task) => (
				<div key={task.id} className={cn("flex items-center gap-2 text-sm py-1 px-2 rounded-md", task.completed ? "text-muted-foreground" : "")}>
					<button onClick={() => handleTaskToggle(task.id, task.completed)} aria-label={`Mark task ${task.title} as ${task.completed ? "incomplete" : "complete"}`} className="p-0 m-0 bg-transparent border-none cursor-pointer flex items-center">
						{task.completed ? <CheckCircle className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
					</button>
					<span
						className={cn("cursor-pointer", task.completed ? "line-through" : "")}
						onClick={() => handleTaskToggle(task.id, task.completed)} // Also make text clickable
					>
						{task.title}
					</span>
				</div>
			))}
			{tasks.length > 5 && (
				<Link href="/planner?tab=all" className="text-xs text-muted-foreground hover:text-primary text-center block pt-2">
					View more
				</Link>
			)}
		</div>
	);
}
