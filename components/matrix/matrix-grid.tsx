"use client";

import { useState } from "react";
import { Task } from "@/types";
import { MatrixQuadrant, QuadrantConfig } from "./matrix-quadrant";
import { AlertCircle, Clock, Users, Archive } from "lucide-react";
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors, DragOverlay, closestCenter, pointerWithin, DragOverlay as DndDragOverlay } from "@dnd-kit/core";
import { MatrixTaskCard } from "./matrix-task-card";
import { QuadrantType, quadrantToValues } from "@/services/matrixService";
import { MatrixTasksData } from "@/services/matrixService";

interface MatrixGridProps {
	tasks: MatrixTasksData;
	onToggleComplete: (taskId: string, currentCompleted: boolean) => void;
	onEdit: (task: Task) => void;
	onDelete: (taskId: string) => void;
	onTaskMove: (taskId: string, newPriority: "low" | "medium" | "high", newUrgency: "low" | "medium" | "high") => Promise<void>;
	selectedQuadrant: QuadrantType | "all";
	onQuadrantExpand: (quadrant: QuadrantType) => void;
	onQuadrantCollapse: () => void;
	onAddTaskToQuadrant: (quadrant: QuadrantType) => void;
}

type ActualQuadrant = Exclude<QuadrantType, "all">;

const quadrantConfigs: Record<ActualQuadrant, QuadrantConfig> = {
	q1: {
		id: "q1",
		title: "Urgent & Important",
		subtitle: "Do First",
		icon: AlertCircle,
		colorClasses: {
			bg: "bg-card",
			border: "border-red-500/20",
			header: "text-red-500",
			text: "text-red-500",
			accent: "#EF4444",
		},
	},
	q2: {
		id: "q2",
		title: "Not Urgent & Important",
		subtitle: "Schedule",
		icon: Clock,
		colorClasses: {
			bg: "bg-card",
			border: "border-amber-500/20",
			header: "text-amber-500",
			text: "text-amber-500",
			accent: "#F59E0B",
		},
	},
	q3: {
		id: "q3",
		title: "Urgent & Unimportant",
		subtitle: "Delegate",
		icon: Users,
		colorClasses: {
			bg: "bg-card",
			border: "border-blue-500/20",
			header: "text-blue-500",
			text: "text-blue-500",
			accent: "#3B82F6",
		},
	},
	q4: {
		id: "q4",
		title: "Not Urgent & Unimportant",
		subtitle: "Eliminate",
		icon: Archive,
		colorClasses: {
			bg: "bg-card",
			border: "border-green-500/20",
			header: "text-green-500",
			text: "text-green-500",
			accent: "#10B981",
		},
	},
};

export function MatrixGrid({ tasks, onToggleComplete, onEdit, onDelete, onTaskMove, selectedQuadrant, onQuadrantExpand, onQuadrantCollapse, onAddTaskToQuadrant }: MatrixGridProps) {
	const [activeTask, setActiveTask] = useState<Task | null>(null);
	const [overId, setOverId] = useState<string | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8, // 8px movement required to start drag
			},
		})
	);

	const findContainer = (id: string): QuadrantType | undefined => {
		const quadrantKeys: (keyof MatrixTasksData)[] = ["q1", "q2", "q3", "q4"];
		// Check if id matches a quadrant key directly
		if (quadrantKeys.includes(id as any)) return id as QuadrantType;

		// Check if id belongs to a task in one of the quadrants
		const foundKey = quadrantKeys.find((key) => tasks[key].some((task: Task) => task.id === id));

		return foundKey as QuadrantType | undefined;
	};

	const handleDragStart = (event: DragStartEvent) => {
		const { active } = event;
		// Find the task being dragged
		const task = Object.values(tasks)
			.flat()
			.find((t) => t.id === active.id);
		setActiveTask(task || null);
	};

	const handleDragOver = (event: DragOverEvent) => {
		const { over } = event;
		setOverId(over?.id as string | null);
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;

		setActiveTask(null);
		setOverId(null);

		if (!over || active.id === over.id) return;

		const taskId = active.id as string;
		let destinationQuadrant = over.id as QuadrantType;

		// If dropped on a task, find its quadrant
		if (!["q1", "q2", "q3", "q4"].includes(destinationQuadrant)) {
			const container = findContainer(over.id as string);
			if (container) {
				destinationQuadrant = container;
			} else {
				return; // Could not determine destination
			}
		}

		const sourceQuadrant = findContainer(taskId);
		if (sourceQuadrant === destinationQuadrant) {
			// Logic for reordering within the same quadrant could go here
			// For now, we only handle moving between quadrants based on existing props
			return;
		}

		// Only update if dropped on a quadrant (not on another task)
		if (["q1", "q2", "q3", "q4"].includes(destinationQuadrant)) {
			const { priority, urgency } = quadrantToValues(destinationQuadrant);

			try {
				await onTaskMove(taskId, priority, urgency);
			} catch (error) {
				console.error("Failed to move task:", error);
				// Error handling is done in parent component
			}
		}
	};

	const handleDragCancel = () => {
		setActiveTask(null);
		setOverId(null);
	};

	// Determine which quadrants to show
	const quadrantsToShow: ActualQuadrant[] = selectedQuadrant === "all" ? ["q1", "q2", "q3", "q4"] : [selectedQuadrant as ActualQuadrant];

	const isFiltered = selectedQuadrant !== "all";

	// Find which quadrant is being hovered over
	const getHoveredQuadrant = (): QuadrantType | null => {
		if (!overId) return null;

		// If hovering directly over a quadrant
		if (["q1", "q2", "q3", "q4"].includes(overId)) {
			return overId as QuadrantType;
		}

		// If hovering over a task, find its quadrant
		const container = findContainer(overId);
		return container || null;
	};

	const hoveredQuadrant = getHoveredQuadrant();

	return (
		<DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
			<div className={`grid gap-2.5 ${isFiltered ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-2"}`}>
				{quadrantsToShow.map((quadrantId) => (
					<MatrixQuadrant key={quadrantId} config={quadrantConfigs[quadrantId]} tasks={tasks[quadrantId]} onToggleComplete={onToggleComplete} onEdit={onEdit} onDelete={onDelete} isFiltered={isFiltered} onExpand={() => onQuadrantExpand(quadrantId)} onCollapse={onQuadrantCollapse} onAddTask={() => onAddTaskToQuadrant(quadrantId)} isHovered={hoveredQuadrant === quadrantId} />
				))}
			</div>

			<DragOverlay dropAnimation={null}>
				{activeTask ? (
					<div className="rotate-2 scale-105 opacity-95 cursor-grabbing">
						<MatrixTaskCard task={activeTask} onToggleComplete={() => {}} onEdit={() => {}} onDelete={() => {}} isOverlay={true} />
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}
