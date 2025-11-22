"use client";

import { Task } from "@/types";
import { MatrixTaskCard } from "./matrix-task-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
			className={`${config.colorClasses.bg} border shadow-sm transition-all duration-200 h-[380px] flex flex-col ${shouldHighlight ? "ring-2 scale-[1.01]" : ""} ${isFiltered ? "col-span-full h-[calc(100vh-200px)]" : ""} overflow-hidden`}
			style={
				shouldHighlight
					? {
							boxShadow: `0 0 0 2px ${config.colorClasses.accent}, 0 8px 16px -4px ${config.colorClasses.accent}40`,
					  }
					: undefined
			}
		>
			<CardHeader className={`pb-3 pt-4 px-4 border-b border-border/50`}>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<Icon className={`h-4.5 w-4.5 ${config.colorClasses.text}`} />
						<div>
							<h3 className={`font-semibold text-sm ${config.colorClasses.text}`}>{config.title}</h3>
							<p className={`text-xs text-muted-foreground`}>{config.subtitle}</p>
						</div>
					</div>
					<div className="flex items-center gap-1.5">
						<Badge variant="secondary" className="bg-background/80 text-foreground border-0 text-xs px-2 py-0.5">
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

			<CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
				<SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
					<div className={`space-y-2 p-3 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent`}>
						{tasks.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full text-center">
								<CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-2" />
								<p className="text-sm text-muted-foreground font-medium">No tasks</p>
								<p className="text-xs text-muted-foreground/60">Drag tasks here or create new ones</p>
							</div>
						) : (
							<>
								{tasks.map((task) => (
									<MatrixTaskCard key={task.id} task={task} onToggleComplete={onToggleComplete} onEdit={onEdit} onDelete={onDelete} />
								))}
								{/* Add padding at bottom for drop zone when scrolled */}
								<div className="h-24" />
							</>
						)}
					</div>
				</SortableContext>
			</CardContent>
		</Card>
	);
}
