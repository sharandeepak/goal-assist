"use client";

import { useState, useEffect, useCallback } from "react";
import { TimeEntry } from "@/common/types";
import { format } from "date-fns";
import { Loader2, Clock, Smile } from "lucide-react";
import { useTheme } from "next-themes";
import EmojiPicker from "emoji-picker-react";
import { Button } from "@/common/ui/button";
import { Input } from "@/common/ui/input";
import { Label } from "@/common/ui/label";
import { Textarea } from "@/common/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/common/ui/sheet";
import { styles } from "../styles/AddEntryDialog.styles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/ui/tabs";
import { Switch } from "@/common/ui/switch";
import { logManualEntry, updateEntry } from "@/features/timesheet/services/timeService";

const MOCK_USER_ID = "demo-user";

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
			setTaskTitle(editingEntry.task_title_snapshot);
			setEmoji(editingEntry.emoji || "");
			const totalMinutes = Math.floor(editingEntry.duration_sec / 60);
			setHours(Math.floor(totalMinutes / 60).toString());
			setMinutes((totalMinutes % 60).toString());
			setNote(editingEntry.note || "");

			if (editingEntry.started_at) {
				const startDate = new Date(editingEntry.started_at);
				setStartTime(format(startDate, "HH:mm"));
			}
			if (editingEntry.ended_at) {
				const endDate = new Date(editingEntry.ended_at);
				setEndTime(format(endDate, "HH:mm"));
			}
		} else if (isOpen) {
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

					const [startHour, startMin] = startTime.split(":").map(Number);
					const [endHour, endMin] = endTime.split(":").map(Number);

					const startDate = new Date(selectedDay);
					startDate.setHours(startHour, startMin, 0, 0);

					const endDate = new Date(selectedDay);
					endDate.setHours(endHour, endMin, 0, 0);

					if (endDate <= startDate) {
						setError("End time must be after start time");
						setLoading(false);
						return;
					}

					if (editingEntry) {
						await updateEntry({
							entryId: editingEntry.id,
							fields: {
								task_title_snapshot: taskTitle.trim(),
								emoji: emoji || null,
								note: note.trim() || null,
								started_at: startDate.toISOString(),
								ended_at: endDate.toISOString(),
							},
						});
					} else {
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
					const h = parseInt(hours) || 0;
					const m = parseInt(minutes) || 0;
					const durationSec = h * 3600 + m * 60;

					if (durationSec <= 0) {
						setError("Duration must be greater than 0");
						setLoading(false);
						return;
					}

					if (editingEntry) {
						await updateEntry({
							entryId: editingEntry.id,
							fields: {
								task_title_snapshot: taskTitle.trim(),
								emoji: emoji || null,
								note: note.trim() || null,
								duration_sec: durationSec,
							},
						});
					} else if (selectedDay) {
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
			<SheetContent className={styles.sheetContent}>
				<SheetHeader>
					<SheetTitle>{editingEntry ? "Edit Time Entry" : "Add Time Entry"}</SheetTitle>
					<SheetDescription>{selectedDay && format(selectedDay, "EEEE, MMMM d, yyyy")}</SheetDescription>
				</SheetHeader>
				<div className={styles.formBody}>
					<div>
						<Label htmlFor="task-title">Task Title *</Label>
						<div className={styles.titleRow}>
							<div className={styles.titleInputRow}>
								<div className={styles.titleInputWrapper}>
									<Button type="button" variant="outline" size="sm" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={emoji ? "text-primary" : ""}>
										{emoji || <Smile className="h-4 w-4" />}
									</Button>
									<Input id="task-title" placeholder="What did you work on?" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} autoFocus className={emoji ? "pl-8" : ""} />
								</div>
							</div>
							{showEmojiPicker && (
								<div className={styles.emojiPickerWrapper}>
									<EmojiPicker
										onEmojiClick={(emojiData) => {
											setEmoji(emojiData.emoji);
											setShowEmojiPicker(false);
										}}
										theme={isDarkTheme ? ("dark" as never) : ("light" as never)}
									/>
								</div>
							)}
						</div>
					</div>

					<Tabs value={entryMode} onValueChange={(v) => setEntryMode(v as "duration" | "time")}>
						<TabsList className={styles.tabsList}>
							<TabsTrigger value="duration">Duration</TabsTrigger>
							<TabsTrigger value="time">
								<Clock className="h-3 w-3 mr-1" />
								Start/End Time
							</TabsTrigger>
						</TabsList>
						<TabsContent value="duration" className={styles.tabsContent}>
							<div>
								<Label>Duration *</Label>
								<div className={styles.durationRow}>
									<div className={styles.durationInput}>
										<Input type="number" placeholder="Hours" value={hours} onChange={(e) => setHours(e.target.value)} min="0" />
									</div>
									<span className={styles.durationUnit}>h</span>
									<div className={styles.durationInput}>
										<Input type="number" placeholder="Minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} min="0" max="59" />
									</div>
									<span className={styles.durationUnit}>m</span>
								</div>
								<div className={styles.quickAddRow}>
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
						<TabsContent value="time" className={styles.tabsContent}>
							<div className={styles.timeGrid}>
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
						<div className={styles.addMoreSection}>
							<div className={styles.addMoreLabel}>
								<Label htmlFor="add-more-entries" className="text-sm font-medium">
									Add More Entries
								</Label>
								<p className={styles.addMoreHint}>Keep dialog open after adding</p>
							</div>
							<Switch id="add-more-entries" checked={addMoreEntries} onCheckedChange={setAddMoreEntries} disabled={loading} />
						</div>
					)}
					{error && <p className={styles.errorText}>{error}</p>}
				</div>
				<SheetFooter className={styles.footer}>
					<Button onClick={() => handleSubmit(!addMoreEntries)} disabled={loading}>
						{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{editingEntry ? "Save Changes" : "Add Entry"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
