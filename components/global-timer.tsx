"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Square, Clock, Smile } from "lucide-react";
import { useTheme } from "next-themes";
import EmojiPicker from "emoji-picker-react";
import { startTimer, stopRunningTimer, subscribeToRunningEntry, MOCK_USER_ID } from "@/services/timeService";
import { TimeEntry } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function GlobalTimer() {
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
		const unsubscribe = subscribeToRunningEntry(MOCK_USER_ID, (entry) => {
			setRunningEntry(entry);
		});

		return () => unsubscribe();
	}, []);

	// Update elapsed time every second
	useEffect(() => {
		if (!runningEntry) {
			setElapsedSeconds(0);
			return;
		}

		const interval = setInterval(() => {
			const now = new Date();
			const startDate = runningEntry?.createdAt?.toDate();
			const elapsed = Math.floor((now.getTime() - startDate.getTime()) / 1000);
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
				userId: MOCK_USER_ID,
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
			await stopRunningTimer(MOCK_USER_ID);
		} catch (error) {
			console.error("Error stopping timer:", error);
		} finally {
			setLoading(false);
		}
	};

	if (runningEntry) {
		return (
			<div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md border border-primary/20">
				<Clock className="h-4 w-4 text-primary animate-pulse" />
				<div className="flex flex-col">
					<span className="text-xs font-medium text-primary truncate max-w-[120px]">
						{runningEntry.emoji && <span className="mr-1">{runningEntry.emoji}</span>}
						{runningEntry.taskTitleSnapshot}
					</span>
					<span className="text-xs text-muted-foreground font-mono">{formatTime(elapsedSeconds)}</span>
				</div>
				<Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleStopTimer} disabled={loading}>
					<Square className="h-3 w-3" />
				</Button>
			</div>
		);
	}

	return (
		<>
			<Button variant="outline" size="sm" onClick={() => setIsStartDialogOpen(true)} className="gap-2">
				<Play className="h-4 w-4" />
				<span className="hidden sm:inline">Start Timer</span>
			</Button>

			<Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Start Timer</DialogTitle>
						<DialogDescription>What are you working on?</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div>
							<Label htmlFor="timer-task-title">Task Title *</Label>
							<div className="relative">
								<div className="flex gap-2">
									<div className="flex-1 flex items-center gap-2">
										<Button type="button" variant="outline" size="sm" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={emoji ? "text-primary" : ""}>
											{emoji || <Smile className="h-4 w-4" />}
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
							<Play className="h-4 w-4 mr-2" />
							Start Timer
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
