"use client";

import { useState, useEffect } from "react";
import { Button } from "@/common/ui/button";
import styles from "../styles/TaskFormDialog.module.css";
import { Input } from "@/common/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/common/ui/sheet";
import { Label } from "@/common/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/common/ui/popover";
import { Calendar as ShadCalendar } from "@/common/ui/calendar";
import { Calendar as CalendarIcon, Loader2, X } from "lucide-react";
import { Task } from "@/common/types";
import { Timestamp } from "firebase/firestore";
import { startOfDay, format } from "date-fns";
import { Switch } from "@/common/ui/switch";

// Helper to format date (could be moved to utils)
const formatDate = (timestamp?: Timestamp): string => {
	if (!timestamp) return "N/A";
	try {
		const date = timestamp.toDate();
		// Add validation for invalid date objects potentially stored
		if (isNaN(date.getTime())) {
			throw new Error("Invalid Date object from Timestamp");
		}
		return format(date, "MMM d, yyyy");
	} catch (e) {
		console.error("Error formatting timestamp:", timestamp, e);
		return "Invalid Date";
	}
};

// Type for form data, including the tags string
// Exporting so it can be used by parent components for the onSubmit callback
export type TaskFormData = Partial<Omit<Task, "id" | "completed" | "createdAt"> & { tagsString: string }>;

// Props interface for the dialog
// Exporting so it can be used by parent components
export interface TaskFormDialogProps {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: (formData: TaskFormData) => Promise<void>; // Expects parent to handle DB call & closing
	initialData?: Task | Partial<Pick<Task, "date">> | null; // Task for editing, partial for pre-filling date, null/undefined for adding
	dialogTitle: string;
	dialogDescription: string;
	requireUrgency?: boolean; // If true, urgency field is shown and required
}

// Export the component itself
export function TaskFormDialog({ isOpen, onOpenChange, onSubmit, initialData, dialogTitle, dialogDescription, requireUrgency = false }: TaskFormDialogProps) {
	const [formData, setFormData] = useState<TaskFormData>({});
	const [tagsString, setTagsString] = useState<string>("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [addMultipleTasks, setAddMultipleTasks] = useState(false);
	const [preventClose, setPreventClose] = useState(false);

	useEffect(() => {
		if (isOpen && initialData && "title" in initialData) {
			// Full Task object for editing
			setFormData({
				title: initialData.title,
				priority: initialData.priority,
				urgency: initialData.urgency,
				date: initialData.date,
				completedDate: initialData.completedDate,
			});
			setTagsString(initialData.tags?.join(", ") || "");
		} else if (isOpen && initialData) {
			// Partial object for pre-filling (could have date, priority, urgency)
			const today = Timestamp.fromDate(startOfDay(new Date()));
			setFormData({
				priority: initialData.priority || "medium",
				urgency: initialData.urgency || (requireUrgency ? "medium" : undefined),
				date: initialData.date || today,
			});
			setTagsString("");
		} else if (isOpen) {
			// Adding new task - default priority and today's date
			const today = Timestamp.fromDate(startOfDay(new Date()));
			setFormData({ priority: "medium", urgency: requireUrgency ? "medium" : undefined, date: today });
			setTagsString("");
		}
		// Clear error and submitting state when dialog opens or initial data changes
		setError(null);
		setIsSubmitting(false);
	}, [isOpen, initialData, requireUrgency]); // Rerun when dialog opens or data changes

	// Update form data state
	const handleValueChange = (field: keyof Omit<TaskFormData, "tagsString">, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	// Handle due date selection from calendar
	const handleDateSelect = (date: Date | undefined) => {
		handleValueChange("date", date ? Timestamp.fromDate(startOfDay(date)) : undefined);
	};



	// Handle form submission
	const handleSubmit = async () => {
		// Validation
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
		// Date is optional

		setError(null);
		setIsSubmitting(true);

		// Set prevent close flag if in multiple tasks mode
		if (addMultipleTasks) {
			setPreventClose(true);
		}

		try {
			const dataToSubmit: TaskFormData = {
				...formData,
				tagsString: tagsString, // Pass tags as a string for parent to parse
			};
			await onSubmit(dataToSubmit); // Call parent's submit handler

			// If add multiple tasks is enabled, reset only the title and ensure dialog remains open
			if (addMultipleTasks) {
				setFormData((prev) => ({ ...prev, title: "" }));
				setError(null);
				// Re-open in case parent attempted to close after submit
				onOpenChange(true);
				// Keep preventClose true just for this tick so Sheet ignores close event
				setTimeout(() => setPreventClose(false), 0);
			} else {
				// NOTE: Parent's onSubmit is responsible for closing the dialog via onOpenChange(false) on success
			}
		} catch (err) {
			console.error("Error submitting task form:", err);
			setError(err instanceof Error ? err.message : "An unexpected error occurred.");
			setPreventClose(false);
			// Keep dialog open on error
		} finally {
			setIsSubmitting(false);
		}
	};

	// Keyboard shortcut: Cmd/Ctrl + Enter to submit when dialog is open
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

	// Handle external closing/opening, reset state on close
	const handleOpenChange = (open: boolean) => {
		if (!open) {
			// Prevent closing if we just submitted in multiple tasks mode
			if (preventClose) {
				return;
			}
			// Reset form state when dialog is closed
			const today = Timestamp.fromDate(startOfDay(new Date()));
			setFormData({ priority: "medium", date: today });
			setTagsString("");
			setError(null);
			setIsSubmitting(false);
			setAddMultipleTasks(false);
			setPreventClose(false);
		}
		onOpenChange(open); // Inform parent of the change
	};

	return (
		// Use the controlled Sheet component
		<Sheet open={isOpen} onOpenChange={handleOpenChange}>
			<SheetContent className={styles.sheetContent}>
				<SheetHeader>
					<SheetTitle>{dialogTitle}</SheetTitle>
					<SheetDescription>{dialogDescription}</SheetDescription>
				</SheetHeader>
				{/* Form Fields: Flex column for sections, with vertical spacing */}
				{/* flex-grow will make this div take available space, pushing footer down */}
				{/* Removed pr-6, relying on SheetContent's padding */}
				<div className={styles.formBody}>
					{/* Section 1: Title */}
					<div className={styles.formSection}>
						<Label htmlFor="task-form-title">Title *</Label>
						<Input id="task-form-title" value={formData.title || ""} onChange={(e) => handleValueChange("title", e.target.value)} placeholder="Task title" disabled={isSubmitting} className={styles.inputNoRing} />
					</div>

				{/* Section 2: Due Date and Priority */}
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
										selected={formData.date?.toDate()}
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

				{/* Section 2.1: Completed Date (read-only, auto-set when task is marked complete) */}
				{formData.completedDate && (
					<div className={styles.formSection}>
						<Label>Completed Date</Label>
						<div className={styles.completedDateDisplay}>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{formatDate(formData.completedDate)}
						</div>
					</div>
				)}

					{/* Section 2.5: Urgency (if required) */}
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

					{/* Section 3: Tags */}
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
					{/* Error Message - Inside scrollable content */}
					{error && <p className={styles.errorText}>{error}</p>}
				</div>

				{/* Footer Buttons */}
				<SheetFooter className={styles.footer}>
					<Button onClick={handleSubmit} disabled={isSubmitting}>
						{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {/* Loading indicator */}
						{initialData && "title" in initialData ? "Save Changes" : "Add Task"} {/* Dynamic button text */}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
