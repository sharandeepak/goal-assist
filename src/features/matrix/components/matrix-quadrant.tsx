"use client";

import { Task } from "@/common/types";
import styles from "../styles/MatrixQuadrant.module.css";
import { MatrixTaskCard } from "./matrix-task-card";
import { Card, CardContent, CardHeader } from "@/common/ui/card";
import { Badge } from "@/common/ui/badge";
import { Button } from "@/common/ui/button";
import { CheckCircle2, LucideIcon, Maximize2, Minimize2, Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

export interface QuadrantConfig {
	id: string;
	title: string;
	subtitle: string;
	icon: LucideIcon;
	colorClasses: {
		bg: string;
		border: string;
		header: string;
		text: string;
		accent: string;
	};
}

interface MatrixQuadrantProps {
	config: QuadrantConfig;
	tasks: Task[];
	onToggleComplete: (taskId: string, currentCompleted: boolean) => void;
	onEdit: (task: Task) => void;
	onDelete: (taskId: string) => void;
	isFiltered?: boolean;
	onExpand?: () => void;
	onCollapse?: () => void;
	onAddTask?: () => void;
	isHovered?: boolean;
}

export function MatrixQuadrant({ config, tasks, onToggleComplete, onEdit, onDelete, isFiltered = false, onExpand, onCollapse, onAddTask, isHovered = false }: MatrixQuadrantProps) {
	const { setNodeRef, isOver } = useDroppable({
		id: config.id,
	});

	const shouldHighlight = isOver || isHovered;

	const Icon = config.icon;

	return (
		<Card
			ref={setNodeRef}
			className={`${config.colorClasses.bg} ${styles.card} ${shouldHighlight ? styles.cardHighlighted : ""} ${isFiltered ? styles.cardFiltered : ""}`}
			style={
				shouldHighlight
					? {
							boxShadow: `0 0 0 2px ${config.colorClasses.accent}, 0 8px 16px -4px ${config.colorClasses.accent}40`,
					  }
					: undefined
			}
		>
			<CardHeader className={styles.cardHeader}>
				<div className={styles.headerRow}>
					<div className={styles.headerLeft}>
						<Icon className={`h-4.5 w-4.5 ${config.colorClasses.text}`} />
						<div>
							<h3 className={`${styles.title} ${config.colorClasses.text}`}>{config.title}</h3>
							<p className={styles.subtitle}>{config.subtitle}</p>
						</div>
					</div>
					<div className={styles.headerActions}>
						<Badge variant="secondary" className={styles.badge}>
							{tasks.length}
						</Badge>
						<Button variant="ghost" size="icon" className={`h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background/50`} onClick={onAddTask}>
							<Plus className="h-4 w-4" />
							<span className="sr-only">Add Task to {config.title}</span>
						</Button>
						{!isFiltered && onExpand && (
							<Button variant="ghost" size="icon" className={`h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background/50`} onClick={onExpand}>
								<Maximize2 className="h-4 w-4" />
								<span className="sr-only">Expand {config.title}</span>
							</Button>
						)}
						{isFiltered && onCollapse && (
							<Button variant="ghost" size="icon" className={`h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background/50`} onClick={onCollapse}>
								<Minimize2 className="h-4 w-4" />
								<span className="sr-only">Show All Quadrants</span>
							</Button>
						)}
					</div>
				</div>
			</CardHeader>

			<CardContent className={styles.cardContent}>
				<SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
					<div className={styles.taskList}>
						{tasks.length === 0 ? (
							<div className={styles.emptyState}>
								<CheckCircle2 className={styles.emptyIcon} />
								<p className={styles.emptyText}>No tasks</p>
								<p className={styles.emptySubtitle}>Drag tasks here or create new ones</p>
							</div>
						) : (
							<>
								{tasks.map((task) => (
									<MatrixTaskCard key={task.id} task={task} onToggleComplete={onToggleComplete} onEdit={onEdit} onDelete={onDelete} />
								))}
								{/* Add padding at bottom for drop zone when scrolled */}
								<div className={styles.listBottomPad} />
							</>
						)}
					</div>
				</SortableContext>
			</CardContent>
		</Card>
	);
}
