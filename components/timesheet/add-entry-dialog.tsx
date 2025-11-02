"use client";

import { useState, useEffect, useCallback } from "react";
import { TimeEntry } from "@/types";
import { format } from "date-fns";
import { Loader2, Clock, Smile } from "lucide-react";
import { useTheme } from "next-themes";
import EmojiPicker from "emoji-picker-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { logManualEntry, updateEntry, MOCK_USER_ID } from "@/services/timeService";
import { Timestamp } from "firebase/firestore";

interface AddEntryDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	selectedDay: Date | null;
	editingEntry?: TimeEntry | null;
}

export default function AddEntryDialog({ isOpen, onOpenChange, selectedDay, editingEntry }: AddEntryDialogProps) {
	const [taskTitle, setTaskTitle] = useState("");
	const [hours, setHours] = useState("");
	const [minutes, setMinutes] = useState("");
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");
	const [note, setNote] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [entryMode, setEntryMode] = useState<"duration" | "time">("duration");
	const [addMoreEntries, setAddMoreEntries] = useState(false);
	const [emoji, setEmoji] = useState<string>("");
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const { theme } = useTheme();
	const isDarkTheme = theme !== "light";

	useEffect(() => {
		if (isOpen && editingEntry) {
			// Populate form for editing
			setTaskTitle(editingEntry.taskTitleSnapshot);
			setEmoji(editingEntry.emoji || "");
			const totalMinutes = Math.floor(editingEntry.durationSec / 60);
			setHours(Math.floor(totalMinutes / 60).toString());
			setMinutes((totalMinutes % 60).toString());
			setNote(editingEntry.note || "");

			// Set times if available
			if (editingEntry.startedAt) {
				const startDate = editingEntry.startedAt.toDate();
				setStartTime(format(startDate, "HH:mm"));
			}
			if (editingEntry.endedAt) {
				const endDate = editingEntry.endedAt.toDate();
				setEndTime(format(endDate, "HH:mm"));
			}
		} else if (isOpen) {
			// Reset form for new entry
			setTaskTitle("");
			setEmoji("");
			setHours("");
			setMinutes("");
			setStartTime("");
			setEndTime("");
			setNote("");
			setEntryMode("duration");
		}
		setError(null);
	}, [isOpen, editingEntry]);

	const handleSubmit = useCallback(
		async (closeAfterSave: boolean = true) => {
			if (!taskTitle.trim()) {
				setError("Task title is required");
				return;
			}

			setLoading(true);
			setError(null);

			try {
				if (entryMode === "time") {
					// Time-based entry
					if (!startTime || !endTime) {
						setError("Both start and end times are required");
						setLoading(false);
						return;
					}

					if (!selectedDay) {
						setError("Selected day is required");
						setLoading(false);
						return;
					}

					// Parse times
					const [startHour, startMin] = startTime.split(":").map(Number);
					const [endHour, endMin] = endTime.split(":").map(Number);

					const startDate = new Date(selectedDay);
					startDate.setHours(startHour, startMin, 0, 0);

					const endDate = new Date(selectedDay);
					endDate.setHours(endHour, endMin, 0, 0);

					// Validate end is after start
					if (endDate <= startDate) {
						setError("End time must be after start time");
						setLoading(false);
						return;
					}

					if (editingEntry) {
						// Update with times
						await updateEntry({
							entryId: editingEntry.id,
							fields: {
								taskTitleSnapshot: taskTitle.trim(),
								emoji: emoji || null,
								note: note.trim() || null,
								startedAt: Timestamp.fromDate(startDate),
								endedAt: Timestamp.fromDate(endDate),
							},
						});
					} else {
						// Create with times
						const dayStr = format(selectedDay, "yyyy-MM-dd");
						await logManualEntry({
							userId: MOCK_USER_ID,
							day: dayStr,
							adHocTitle: taskTitle.trim(),
							emoji: emoji || undefined,
							note: note.trim() || undefined,
							startedAt: startDate,
							endedAt: endDate,
						});
					}
				} else {
					// Duration-based entry
					const h = parseInt(hours) || 0;
					const m = parseInt(minutes) || 0;
					const durationSec = h * 3600 + m * 60;

					if (durationSec <= 0) {
						setError("Duration must be greater than 0");
						setLoading(false);
						return;
					}

					if (editingEntry) {
						// Update existing entry
						await updateEntry({
							entryId: editingEntry.id,
							fields: {
								taskTitleSnapshot: taskTitle.trim(),
								emoji: emoji || null,
								note: note.trim() || null,
								durationSec,
							},
						});
					} else if (selectedDay) {
						// Create new entry
						const dayStr = format(selectedDay, "yyyy-MM-dd");
						await logManualEntry({
							userId: MOCK_USER_ID,
							day: dayStr,
							adHocTitle: taskTitle.trim(),
							emoji: emoji || undefined,
							note: note.trim() || undefined,
							durationSec,
						});
					}
				}

				// Clear form if not closing (Add More functionality)
				if (!closeAfterSave && !editingEntry) {
					setTaskTitle("");
					setEmoji("");
					setHours("");
					setMinutes("");
					setStartTime("");
					setEndTime("");
					setNote("");
					setError(null);
				} else {
					onOpenChange(false);
				}
			} catch (err) {
				console.error("Error saving entry:", err);
				setError("Failed to save entry. Please try again.");
			} finally {
				setLoading(false);
			}
		},
		[taskTitle, entryMode, startTime, endTime, selectedDay, editingEntry, emoji, note, hours, minutes, addMoreEntries, onOpenChange]
	);

	// Keyboard shortcut for Cmd + Enter to save
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.metaKey && event.key === "Enter") {
				event.preventDefault();
				handleSubmit(!addMoreEntries);
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown);
		}

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, addMoreEntries, handleSubmit]);

	const handleQuickAdd = (mins: number) => {
		const currentMinutes = parseInt(minutes) || 0;
		const currentHours = parseInt(hours) || 0;
		const totalMinutes = currentHours * 60 + currentMinutes + mins;
		setHours(Math.floor(totalMinutes / 60).toString());
		setMinutes((totalMinutes % 60).toString());
	};

	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent className="sm:max-w-[425px]">
				<SheetHeader>
					<SheetTitle>{editingEntry ? "Edit Time Entry" : "Add Time Entry"}</SheetTitle>
					<SheetDescription>{selectedDay && format(selectedDay, "EEEE, MMMM d, yyyy")}</SheetDescription>
				</SheetHeader>
				<div className="space-y-4 py-4">
					<div>
						<Label htmlFor="task-title">Task Title *</Label>
						<div className="relative">
							<div className="flex gap-2">
								<div className="flex-1 flex items-center gap-2">
									<Button type="button" variant="outline" size="sm" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={emoji ? "text-primary" : ""}>
										{emoji || <Smile className="h-4 w-4" />}
									</Button>
									<Input id="task-title" placeholder="What did you work on?" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} autoFocus className={emoji ? "pl-8" : ""} />
								</div>
							</div>
							{showEmojiPicker && (
								<div className="absolute top-full left-0 z-50 mt-1">
									<EmojiPicker
										onEmojiClick={(emojiData) => {
											setEmoji(emojiData.emoji);
											setShowEmojiPicker(false);
										}}
										theme={isDarkTheme ? "dark" : ("light" as any)}
									/>
								</div>
							)}
						</div>
					</div>

					<Tabs value={entryMode} onValueChange={(v) => setEntryMode(v as "duration" | "time")}>
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="duration">Duration</TabsTrigger>
							<TabsTrigger value="time">
								<Clock className="h-3 w-3 mr-1" />
								Start/End Time
							</TabsTrigger>
						</TabsList>
						<TabsContent value="duration" className="space-y-4">
							<div>
								<Label>Duration *</Label>
								<div className="flex gap-2 items-center mt-1">
									<div className="flex-1">
										<Input type="number" placeholder="Hours" value={hours} onChange={(e) => setHours(e.target.value)} min="0" />
									</div>
									<span className="text-sm text-muted-foreground">h</span>
									<div className="flex-1">
										<Input type="number" placeholder="Minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} min="0" max="59" />
									</div>
									<span className="text-sm text-muted-foreground">m</span>
								</div>
								<div className="flex gap-2 mt-2">
									<Button variant="outline" size="sm" onClick={() => handleQuickAdd(15)} type="button">
										+15m
									</Button>
									<Button variant="outline" size="sm" onClick={() => handleQuickAdd(30)} type="button">
										+30m
									</Button>
									<Button variant="outline" size="sm" onClick={() => handleQuickAdd(60)} type="button">
										+1h
									</Button>
								</div>
							</div>
						</TabsContent>
						<TabsContent value="time" className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="start-time">Start Time *</Label>
									<Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
								</div>
								<div>
									<Label htmlFor="end-time">End Time *</Label>
									<Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
								</div>
							</div>
						</TabsContent>
					</Tabs>

					<div>
						<Label htmlFor="note">Note (optional)</Label>
						<Textarea id="note" placeholder="Add details..." value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
					</div>
					{!editingEntry && (
						<div className="flex items-center justify-between py-2 border-t">
							<div className="space-y-0.5">
								<Label htmlFor="add-more-entries" className="text-sm font-medium">
									Add More Entries
								</Label>
								<p className="text-xs text-muted-foreground">Keep dialog open after adding</p>
							</div>
							<Switch id="add-more-entries" checked={addMoreEntries} onCheckedChange={setAddMoreEntries} disabled={loading} />
						</div>
					)}
					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>
				<SheetFooter className="pt-4 border-t">
					<Button onClick={() => handleSubmit(!addMoreEntries)} disabled={loading}>
						{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{editingEntry ? "Save Changes" : "Add Entry"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
