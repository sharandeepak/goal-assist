"use client";

import { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MatrixTaskCardProps {
	task: Task;
	onToggleComplete: (taskId: string, currentCompleted: boolean) => void;
	onEdit: (task: Task) => void;
	onDelete: (taskId: string) => void;
	isOverlay?: boolean;
}

const formatDate = (timestamp?: any): string => {
	if (!timestamp) return "N/A";
	try {
		// Handle both Firestore Timestamp and regular Date
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		if (isNaN(date.getTime())) {
			throw new Error("Invalid Date");
		}
		return format(date, "MMM d");
	} catch (e) {
		console.error("Error formatting timestamp:", timestamp, e);
		return "Invalid";
	}
};

export function MatrixTaskCard({ task, onToggleComplete, onEdit, onDelete, isOverlay = false }: MatrixTaskCardProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } = useSortable({
		id: task.id,
		data: {
			type: "task",
			task: task,
		},
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	// If this is an overlay, don't attach drag listeners
	if (isOverlay) {
		return <div className={`group relative bg-background/50 border border-border/50 rounded-lg p-3 shadow-lg ${task.completed ? "opacity-60" : ""}`}>{renderTaskContent()}</div>;
	}

	function renderTaskContent() {
		return (
			<>
				<div className="flex items-start gap-2">
					{/* Checkbox */}
					<Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => onToggleComplete(task.id, task.completed)} className="mt-0.5 flex-shrink-0" />

					{/* Task Content */}
					<div className="flex-1 min-w-0">
						<label htmlFor={`task-${task.id}`} className={`text-sm font-medium leading-snug block cursor-pointer ${task.completed ? "line-through text-muted-foreground" : ""}`} title={task.title}>
							{task.title}
						</label>

						{/* Tags */}
						{task.tags && task.tags.length > 0 && (
							<div className="flex flex-wrap gap-1 mt-1.5">
								{task.tags.slice(0, 3).map((tag, i) => (
									<Badge key={i} variant="secondary" className="text-xs px-1.5 py-0 h-5">
										{tag}
									</Badge>
								))}
								{task.tags.length > 3 && (
									<Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
										+{task.tags.length - 3}
									</Badge>
								)}
							</div>
						)}

						{/* Date */}
						{task.date && (
							<div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
								<Calendar className="h-3 w-3" />
								<span>{formatDate(task.date)}</span>
							</div>
						)}
					</div>

					{/* Action Buttons */}
					<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
						<Button variant="ghost" size="icon" onClick={() => onEdit(task)} className="h-7 w-7 text-muted-foreground hover:text-primary">
							<Edit className="h-3.5 w-3.5" />
							<span className="sr-only">Edit Task</span>
						</Button>
						<Button variant="ghost" size="icon" onClick={() => onDelete(task.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
							<Trash2 className="h-3.5 w-3.5" />
							<span className="sr-only">Delete Task</span>
						</Button>
					</div>
				</div>
			</>
		);
	}

	return (
		<div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`group relative bg-background/50 border border-border/50 rounded-lg p-3 hover:bg-background hover:border-border hover:shadow-sm transition-all cursor-grab active:cursor-grabbing ${isDragging ? "shadow-lg z-50 rotate-2" : ""} ${task.completed ? "opacity-60" : ""}`}>
			{renderTaskContent()}
		</div>
	);
}
