"use client";

import { Task } from "@/common/types";
import { styles } from "../styles/MatrixTaskCard.styles";
import { Badge } from "@/common/ui/badge";
import { Button } from "@/common/ui/button";
import { Checkbox } from "@/common/ui/checkbox";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
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

const formatDate = (dateStr?: string | null): string => {
	if (!dateStr) return "N/A";
	try {
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) {
			return "Invalid";
		}
		return format(date, "MMM d");
	} catch {
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
		return <div className={`${styles.card} ${task.completed ? styles.cardCompleted : ""} shadow-lg`}>{renderTaskContent()}</div>;
	}

	function renderTaskContent() {
		return (
			<>
				<div className={styles.contentRow}>
					{/* Checkbox */}
					<Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => onToggleComplete(task.id, task.completed)} className={styles.checkbox} />

					{/* Task Content */}
					<div className={styles.contentArea}>
						<label htmlFor={`task-${task.id}`} className={`${styles.label} ${task.completed ? styles.labelCompleted : ""}`} title={task.title}>
							{task.title}
						</label>

						{/* Tags */}
						{task.tags && task.tags.length > 0 && (
							<div className={styles.tagsContainer}>
								{task.tags.slice(0, 3).map((tag, i) => (
									<Badge key={i} variant="secondary" className={styles.tagBadge}>
										{tag}
									</Badge>
								))}
								{task.tags.length > 3 && (
									<Badge variant="secondary" className={styles.tagBadge}>
										+{task.tags.length - 3}
									</Badge>
								)}
							</div>
						)}

						{/* Date */}
						{task.date && (
							<div className={styles.dateRow}>
								<FontAwesomeIcon icon={faCalendar} className="h-3 w-3" />
								<span>{formatDate(task.date)}</span>
							</div>
						)}
					</div>

					{/* Action Buttons - group-hover must stay inline */}
					<div className={`${styles.actions} opacity-0 group-hover:opacity-100 focus-within:opacity-100`}>
						<Button variant="ghost" size="icon" onClick={() => onEdit(task)} className="h-7 w-7 text-muted-foreground hover:text-primary">
							<FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
							<span className="sr-only">Edit Task</span>
						</Button>
						<Button variant="ghost" size="icon" onClick={() => onDelete(task.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
							<FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
							<span className="sr-only">Delete Task</span>
						</Button>
					</div>
				</div>
			</>
		);
	}

	return (
		<div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`group ${styles.card} ${styles.cardInteractive} ${isDragging ? styles.cardDragging : ""} ${task.completed ? styles.cardCompleted : ""}`}>
			{renderTaskContent()}
		</div>
	);
}
