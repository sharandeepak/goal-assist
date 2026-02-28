"use client";

import { useState, useEffect } from "react";
import { Button } from "@/common/ui/button";
import { styles } from "../styles/TaskFormDialog.styles";
import { Input } from "@/common/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/common/ui/sheet";
import { Label } from "@/common/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/common/ui/popover";
import { Calendar as ShadCalendar } from "@/common/ui/calendar";
import { Calendar as CalendarIcon, Loader2, X } from "lucide-react";
import { Task } from "@/common/types";
import { startOfDay, format } from "date-fns";
import { Switch } from "@/common/ui/switch";

const formatDate = (dateStr?: string | null): string => {
	if (!dateStr) return "N/A";
	try {
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) {
			return "Invalid Date";
		}
		return format(date, "MMM d, yyyy");
	} catch {
		return "Invalid Date";
	}
};

export type TaskFormData = Partial<Omit<Task, "id" | "completed" | "created_at"> & { tagsString: string }>;

export interface TaskFormDialogProps {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: (formData: TaskFormData) => Promise<void>;
	initialData?: Task | Partial<Pick<Task, "date" | "priority" | "urgency">> | null;
	dialogTitle: string;
	dialogDescription: string;
	requireUrgency?: boolean;
}

export function TaskFormDialog({ isOpen, onOpenChange, onSubmit, initialData, dialogTitle, dialogDescription, requireUrgency = false }: TaskFormDialogProps) {
	const [formData, setFormData] = useState<TaskFormData>({});
	const [tagsString, setTagsString] = useState<string>("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [addMultipleTasks, setAddMultipleTasks] = useState(false);
	const [preventClose, setPreventClose] = useState(false);

	useEffect(() => {
		if (isOpen && initialData && "title" in initialData) {
			setFormData({
				title: initialData.title,
				priority: initialData.priority,
				urgency: initialData.urgency,
				date: initialData.date,
				completed_date: initialData.completed_date,
			});
			setTagsString(initialData.tags?.join(", ") || "");
		} else if (isOpen && initialData) {
			const today = startOfDay(new Date()).toISOString();
			setFormData({
				priority: initialData.priority || "medium",
				urgency: initialData.urgency || (requireUrgency ? "medium" : undefined),
				date: initialData.date || today,
			});
			setTagsString("");
		} else if (isOpen) {
			const today = startOfDay(new Date()).toISOString();
			setFormData({ priority: "medium", urgency: requireUrgency ? "medium" : undefined, date: today });
			setTagsString("");
		}
		setError(null);
		setIsSubmitting(false);
	}, [isOpen, initialData, requireUrgency]);

	const handleValueChange = (field: keyof Omit<TaskFormData, "tagsString">, value: unknown) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleDateSelect = (date: Date | undefined) => {
		handleValueChange("date", date ? startOfDay(date).toISOString() : undefined);
	};

	const handleSubmit = async () => {
		if (!formData.title?.trim()) {
			setError("Task title cannot be empty.");
			return;
		}
		if (!formData.priority) {
			setError("Task priority is required.");
			return;
		}
		if (requireUrgency && !formData.urgency) {
			setError("Task urgency is required for matrix tasks.");
			return;
		}

		setError(null);
		setIsSubmitting(true);

		if (addMultipleTasks) {
			setPreventClose(true);
		}

		try {
			const dataToSubmit: TaskFormData = {
				...formData,
				tagsString: tagsString,
			};
			await onSubmit(dataToSubmit);

			if (addMultipleTasks) {
				setFormData((prev) => ({ ...prev, title: "" }));
				setError(null);
				onOpenChange(true);
				setTimeout(() => setPreventClose(false), 0);
			}
		} catch (err) {
			console.error("Error submitting task form:", err);
			setError(err instanceof Error ? err.message : "An unexpected error occurred.");
			setPreventClose(false);
		} finally {
			setIsSubmitting(false);
		}
	};

	useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
				e.preventDefault();
				if (!isSubmitting) {
					handleSubmit();
				}
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [isOpen, isSubmitting, handleSubmit]);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			if (preventClose) {
				return;
			}
			const today = startOfDay(new Date()).toISOString();
			setFormData({ priority: "medium", date: today });
			setTagsString("");
			setError(null);
			setIsSubmitting(false);
			setAddMultipleTasks(false);
			setPreventClose(false);
		}
		onOpenChange(open);
	};

	return (
		<Sheet open={isOpen} onOpenChange={handleOpenChange}>
			<SheetContent className={styles.sheetContent}>
				<SheetHeader>
					<SheetTitle>{dialogTitle}</SheetTitle>
					<SheetDescription>{dialogDescription}</SheetDescription>
				</SheetHeader>
				<div className={styles.formBody}>
					<div className={styles.formSection}>
						<Label htmlFor="task-form-title">Title *</Label>
						<Input id="task-form-title" value={formData.title || ""} onChange={(e) => handleValueChange("title", e.target.value)} placeholder="Task title" disabled={isSubmitting} className={styles.inputNoRing} />
					</div>

				<div className={styles.formGrid}>
					<div className={styles.formSection}>
						<Label htmlFor="task-form-date">Due Date</Label>
						<div className="flex gap-2">
							<Popover>
								<PopoverTrigger asChild>
									<Button id="task-form-date" variant={"outline"} className={!formData.date ? styles.dateButtonPlaceholder : styles.dateButton} disabled={isSubmitting}>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{formData.date ? formatDate(formData.date) : <span>Pick a date</span>}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0">
									<ShadCalendar
										mode="single"
										selected={formData.date ? new Date(formData.date) : undefined}
										onSelect={handleDateSelect}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>
					</div>
					<div className={styles.formSection}>
						<Label htmlFor="task-form-priority">Priority *</Label>
						<Select value={formData.priority || "medium"} onValueChange={(value) => handleValueChange("priority", value as Task["priority"])} disabled={isSubmitting}>
							<SelectTrigger id="task-form-priority" className={styles.selectNoRing}>
								<SelectValue placeholder="Select priority" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="high">High</SelectItem>
								<SelectItem value="medium">Medium</SelectItem>
								<SelectItem value="low">Low</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				{formData.completed_date && (
					<div className={styles.formSection}>
						<Label>Completed Date</Label>
						<div className={styles.completedDateDisplay}>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{formatDate(formData.completed_date)}
						</div>
					</div>
				)}

					{requireUrgency && (
						<div className={styles.formSection}>
							<Label htmlFor="task-form-urgency">Urgency *</Label>
							<Select value={formData.urgency || "medium"} onValueChange={(value) => handleValueChange("urgency", value as Task["urgency"])} disabled={isSubmitting}>
								<SelectTrigger id="task-form-urgency" className={styles.selectNoRing}>
									<SelectValue placeholder="Select urgency" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="high">High</SelectItem>
									<SelectItem value="medium">Medium</SelectItem>
									<SelectItem value="low">Low</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					<div className={styles.formSection}>
						<Label htmlFor="task-form-tags">Tags (comma-separated)</Label>
						<Input id="task-form-tags" value={tagsString} onChange={(e) => setTagsString(e.target.value)} placeholder="e.g. work, important, project-x" disabled={isSubmitting} className={styles.inputNoRing} />
					</div>
					{(!initialData || !("title" in initialData)) && (
						<div className={styles.addMultipleSection}>
							<div className={styles.addMultipleLabel}>
								<Label htmlFor="add-multiple-tasks" className={styles.addMultipleTitle}>
									Add Multiple Tasks
								</Label>
								<p className={styles.addMultipleHint}>Keep dialog open after adding</p>
							</div>
							<Switch id="add-multiple-tasks" checked={addMultipleTasks} onCheckedChange={setAddMultipleTasks} disabled={isSubmitting} />
						</div>
					)}
					{error && <p className={styles.errorText}>{error}</p>}
				</div>

				<SheetFooter className={styles.footer}>
					<Button onClick={handleSubmit} disabled={isSubmitting}>
						{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
						{initialData && "title" in initialData ? "Save Changes" : "Add Task"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
