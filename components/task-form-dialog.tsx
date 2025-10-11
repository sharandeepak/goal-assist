"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as ShadCalendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { Task } from "@/types"
import { Timestamp } from "firebase/firestore"
import { startOfDay, format } from "date-fns"

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
}

// Type for form data, including the tags string
// Exporting so it can be used by parent components for the onSubmit callback
export type TaskFormData = Partial<Omit<Task, 'id' | 'completed' | 'createdAt'> & { tagsString: string }>;

// Props interface for the dialog
// Exporting so it can be used by parent components
export interface TaskFormDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (formData: TaskFormData) => Promise<void>; // Expects parent to handle DB call & closing
    initialData?: Task | Partial<Pick<Task, 'date'>> | null; // Task for editing, partial for pre-filling date, null/undefined for adding
    dialogTitle: string;
    dialogDescription: string;
}

// Export the component itself
export function TaskFormDialog({ isOpen, onOpenChange, onSubmit, initialData, dialogTitle, dialogDescription }: TaskFormDialogProps) {
    const [formData, setFormData] = useState<TaskFormData>({});
    const [tagsString, setTagsString] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && initialData && 'title' in initialData) { // Full Task object for editing
            setFormData({
                title: initialData.title,
                priority: initialData.priority,
                date: initialData.date,
            });
            setTagsString(initialData.tags?.join(", ") || "");
        } else if (isOpen && initialData && 'date' in initialData && !('title' in initialData)) {
             // Partial object with just date for pre-filling
             setFormData({ priority: 'medium', date: initialData.date });
             setTagsString("");
        }
         else if (isOpen) {
            // Adding new task - default priority
            setFormData({ priority: 'medium' });
            setTagsString("");
        }
        // Clear error and submitting state when dialog opens or initial data changes
        setError(null);
        setIsSubmitting(false);
    }, [isOpen, initialData]); // Rerun when dialog opens or data changes

    // Update form data state
    const handleValueChange = (field: keyof Omit<TaskFormData, 'tagsString'>, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Handle date selection from calendar
    const handleDateSelect = (date: Date | undefined) => {
        handleValueChange('date', date ? Timestamp.fromDate(startOfDay(date)) : undefined);
    }

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
         // Date is optional

        setError(null);
        setIsSubmitting(true);
        try {
             const dataToSubmit: TaskFormData = {
                 ...formData,
                 tagsString: tagsString // Pass tags as a string for parent to parse
            };
            await onSubmit(dataToSubmit); // Call parent's submit handler
            // NOTE: Parent's onSubmit is responsible for closing the dialog via onOpenChange(false) on success
        } catch (err) {
            console.error("Error submitting task form:", err);
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
            // Keep dialog open on error
        } finally {
            setIsSubmitting(false);
        }
    };

     // Handle external closing/opening, reset state on close
     const handleOpenChange = (open: boolean) => {
         if (!open) {
             // Reset form state when dialog is closed
             setFormData({ priority: 'medium' });
             setTagsString("");
             setError(null);
             setIsSubmitting(false);
         }
         onOpenChange(open); // Inform parent of the change
     }


    return (
        // Use the controlled Sheet component
        <Sheet open={isOpen} onOpenChange={handleOpenChange}>
            <SheetContent className="sm:max-w-[425px] flex flex-col h-full">
                <SheetHeader>
                    <SheetTitle>{dialogTitle}</SheetTitle>
                    <SheetDescription>{dialogDescription}</SheetDescription>
                </SheetHeader>
                {/* Form Fields: Flex column for sections, with vertical spacing */}
                {/* flex-grow will make this div take available space, pushing footer down */}
                {/* Removed pr-6, relying on SheetContent's padding */}
                <div className="flex-grow py-4 space-y-6 overflow-y-auto">
                    {/* Section 1: Title */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="task-form-title">Title *</Label>
                        <Input
                            id="task-form-title"
                            value={formData.title || ''}
                            onChange={(e) => handleValueChange('title', e.target.value)}
                            placeholder="Task title"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Section 2: Date and Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                            <Label htmlFor="task-form-date">Date</Label> { /* htmlFor to associate with button or a hidden input if needed */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="task-form-date" /* Added id for label association */
                                        variant={"outline"}
                                        className={`w-full justify-start text-left font-normal ${!formData.date ? "text-muted-foreground" : ""}`}
                                         disabled={isSubmitting}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.date ? formatDate(formData.date) : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <ShadCalendar
                                        mode="single"
                                        selected={formData.date?.toDate()} // Use toDate() for ShadCalendar
                                        onSelect={handleDateSelect}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="task-form-priority">Priority *</Label>
                            <Select
                                value={formData.priority || 'medium'}
                                onValueChange={(value) => handleValueChange('priority', value as Task['priority'])}
                                 disabled={isSubmitting}
                            >
                                <SelectTrigger id="task-form-priority">
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

                    {/* Section 3: Tags */}
                    <div className="grid gap-1.5">
                       <Label htmlFor="task-form-tags">Tags (comma-separated)</Label>
                       <Input
                           id="task-form-tags"
                           value={tagsString}
                           onChange={(e) => setTagsString(e.target.value)}
                           placeholder="e.g. work, important, project-x"
                            disabled={isSubmitting}
                       />
                   </div>
                    {/* Error Message - Inside scrollable content */}
                    {error && <p className="text-sm text-red-600 text-center pt-2">{error}</p>}
                </div>

                {/* Footer Buttons - No mt-auto needed if content above is flex-grow */}
                <SheetFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                     <Button onClick={handleSubmit} disabled={isSubmitting}>
                         {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {/* Loading indicator */}
                         {initialData && 'title' in initialData ? "Save Changes" : "Add Task"} {/* Dynamic button text */}
                     </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
