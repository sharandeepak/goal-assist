"use client";

import { useState, useEffect } from "react";
import { Button } from "@/common/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faSquare, faClock, faSmile } from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "next-themes";
import EmojiPicker from "emoji-picker-react";
import { startTimer, stopRunningTimer, subscribeToRunningEntry } from "@/features/timesheet/services/timeService";
import { useRequiredAuth } from "@/common/hooks/use-auth";
import { TimeEntry } from "@/common/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/common/ui/dialog";
import { Input } from "@/common/ui/input";
import { Label } from "@/common/ui/label";
import { Textarea } from "@/common/ui/textarea";
import { styles } from "../styles/GlobalTimer.styles";

export default function GlobalTimer() {
	const { userId, companyId, employeeId } = useRequiredAuth();
	const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
	const [taskTitle, setTaskTitle] = useState("");
	const [note, setNote] = useState("");
	const [emoji, setEmoji] = useState<string>("");
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [loading, setLoading] = useState(false);
	const { theme } = useTheme();
	const isDarkTheme = theme !== "light";

	// Subscribe to running entry
	useEffect(() => {
		const unsubscribe = subscribeToRunningEntry(employeeId, (entry) => {
			setRunningEntry(entry);
		});

		return () => unsubscribe();
	}, [employeeId]);

	// Update elapsed time every second
	useEffect(() => {
		if (!runningEntry) {
			setElapsedSeconds(0);
			return;
		}

		const interval = setInterval(() => {
			const now = new Date();
			const startDate = runningEntry?.created_at ? new Date(runningEntry.created_at) : null;
			const elapsed = startDate ? Math.floor((now.getTime() - startDate.getTime()) / 1000) : 0;
			setElapsedSeconds(elapsed);
		}, 1000);

		return () => clearInterval(interval);
	}, [runningEntry]);

	const formatTime = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
		}
		return `${minutes}:${secs.toString().padStart(2, "0")}`;
	};

	const handleStartTimer = async () => {
		if (!taskTitle.trim()) {
			return;
		}

		setLoading(true);
		try {
			await startTimer({
				userId,
				companyId,
				employeeId,
				taskTitle: taskTitle.trim(),
				emoji: emoji || undefined,
				note: note.trim() || undefined,
			});
			setIsStartDialogOpen(false);
			setTaskTitle("");
			setEmoji("");
			setNote("");
		} catch (error) {
			console.error("Error starting timer:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleStopTimer = async () => {
		if (!runningEntry) return;

		setLoading(true);
		try {
			await stopRunningTimer(employeeId);
		} catch (error) {
			console.error("Error stopping timer:", error);
		} finally {
			setLoading(false);
		}
	};

	if (runningEntry) {
		return (
			<div className={styles.runningContainer}>
				<FontAwesomeIcon icon={faClock} className={styles.clockIcon} />
				<div className={styles.runningTextColumn}>
					<span className={styles.taskTitle}>
						{runningEntry.emoji && <span className={styles.emoji}>{runningEntry.emoji}</span>}
						{runningEntry.task_title_snapshot}
					</span>
					<span className={styles.elapsedTime}>{formatTime(elapsedSeconds)}</span>
				</div>
				<Button variant="ghost" size="icon" className={styles.stopButton} onClick={handleStopTimer} disabled={loading}>
					<FontAwesomeIcon icon={faSquare} className={styles.stopIcon} />
				</Button>
			</div>
		);
	}

	return (
		<>
			<Button variant="outline" size="sm" onClick={() => setIsStartDialogOpen(true)} className={styles.startButton}>
				<FontAwesomeIcon icon={faPlay} className="h-4 w-4" />
				<span className={styles.startButtonLabel}>Start Timer</span>
			</Button>

			<Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Start Timer</DialogTitle>
						<DialogDescription>What are you working on?</DialogDescription>
					</DialogHeader>
					<div className={styles.dialogBody}>
						<div>
							<Label htmlFor="timer-task-title">Task Title *</Label>
							<div className={styles.dialogTitleRow}>
								<div className={styles.dialogInputRow}>
									<div className={styles.dialogInputWrapper}>
										<Button type="button" variant="outline" size="sm" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={emoji ? "text-primary" : ""}>
											{emoji || <FontAwesomeIcon icon={faSmile} className="h-4 w-4" />}
										</Button>
										<Input
											id="timer-task-title"
											placeholder="e.g., Fix bug in login page"
											value={taskTitle}
											onChange={(e) => setTaskTitle(e.target.value)}
											autoFocus
											className={emoji ? "pl-8" : ""}
											onKeyDown={(e) => {
												if (e.key === "Enter" && taskTitle.trim()) {
													handleStartTimer();
												}
											}}
										/>
									</div>
								</div>
								{showEmojiPicker && (
									<div className={styles.emojiPickerWrapper}>
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
						<div>
							<Label htmlFor="timer-note">Note (optional)</Label>
							<Textarea id="timer-note" placeholder="Add details..." value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsStartDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleStartTimer} disabled={!taskTitle.trim() || loading}>
							<FontAwesomeIcon icon={faPlay} className="h-4 w-4 mr-2" />
							Start Timer
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
