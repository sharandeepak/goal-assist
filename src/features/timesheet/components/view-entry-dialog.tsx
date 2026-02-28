"use client";

import { TimeEntry } from "@/common/types";
import { format as formatDate } from "date-fns";

// Alias to avoid conflict with variable name
const format = formatDate;
import { Clock, Calendar, Edit2, Copy, Check, Timer } from "lucide-react";
import { Button } from "@/common/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/common/ui/sheet";
import { styles } from "../styles/ViewEntryDialog.styles";
import { Badge } from "@/common/ui/badge";
import { Separator } from "@/common/ui/separator";
import { useState } from "react";
import { useToast } from "@/common/hooks/use-toast";

interface ViewEntryDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	entry: TimeEntry | null;
	onEdit: (entry: TimeEntry) => void;
}

export default function ViewEntryDialog({ isOpen, onOpenChange, entry, onEdit }: ViewEntryDialogProps) {
	const [copied, setCopied] = useState(false);
	const { toast } = useToast();

	if (!entry) return null;

	const formatTime = (timestamp: string | null | undefined): string => {
		if (!timestamp) return "";
		const date = new Date(timestamp);
		return format(date, "HH:mm");
	};

	const formatFullDate = (timestamp: string | null | undefined): string => {
		if (!timestamp) return "";
		const date = new Date(timestamp);
		return format(date, "EEEE, MMMM d, yyyy");
	};

	const formatDuration = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	};

	const isRunning = !entry.ended_at;

	const handleCopy = async () => {
		const entryDate = entry.started_at ? formatFullDate(entry.started_at) : format(new Date(entry.day), "EEEE, MMMM d, yyyy");
		const duration = formatDuration(entry.duration_sec);
		const note = entry.note ? `\n\nNotes:\n${entry.note}` : "";

		let timeInfo = "";
		if (entry.started_at && entry.ended_at) {
			const startTime = formatTime(entry.started_at);
			const endTime = formatTime(entry.ended_at);
			timeInfo = `${startTime} - ${endTime} (${duration})`;
		} else if (entry.started_at && !entry.ended_at) {
			const startTime = formatTime(entry.started_at);
			timeInfo = `${startTime} - Running (${duration})`;
		} else {
			timeInfo = `Duration: ${duration}`;
		}

		const clipboardText = `${entry.task_title_snapshot}\n${entryDate}\n${timeInfo}${note}`;

		try {
			await navigator.clipboard.writeText(clipboardText);
			setCopied(true);
			toast({
				title: "Copied to clipboard",
				description: "Time entry details copied successfully.",
			});
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
			toast({
				title: "Failed to copy",
				description: "Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleEdit = () => {
		onEdit(entry);
		onOpenChange(false);
	};

	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent className={styles.sheetContent}>
				<SheetHeader>
					<SheetTitle className={styles.titleRow}>
						<span className={styles.titleText}>
							{entry.emoji && <span className={styles.emoji}>{entry.emoji}</span>}
							{entry.task_title_snapshot}
						</span>
						{entry.source === "timer" && (
							<Badge variant="outline" className={styles.badge}>
								<Timer className="h-3 w-3 mr-1" />
								Timer
							</Badge>
						)}
						{isRunning && entry.started_at && (
							<Badge variant="default" className={`${styles.badge} animate-pulse`}>
								Running
							</Badge>
						)}
					</SheetTitle>
					<SheetDescription className={styles.descriptionRow}>
						<Calendar className="h-4 w-4" />
						{entry.started_at ? formatFullDate(entry.started_at) : format(new Date(entry.day), "EEEE, MMMM d, yyyy")}
					</SheetDescription>
				</SheetHeader>

				<div className={styles.contentBody}>
					{/* Time Section - Only show if times are available */}
					{(entry.started_at || entry.ended_at) && (
						<div className="space-y-3">
							<div className={styles.sectionHeader}>
								<Clock className="h-4 w-4" />
								Time Details
							</div>
							<div className={styles.sectionContent}>
								{entry.started_at && (
									<div className={styles.row}>
										<span className={styles.rowLabel}>Start Time:</span>
										<span className={styles.rowValue}>{formatTime(entry.started_at)}</span>
									</div>
								)}
								{entry.started_at && (
									<div className={styles.row}>
										<span className={styles.rowLabel}>End Time:</span>
										<span className={styles.rowValue}>{isRunning ? <Badge variant="default">Running</Badge> : entry.ended_at ? formatTime(entry.ended_at) : "N/A"}</span>
									</div>
								)}
								<Separator />
								<div className={styles.row}>
									<span className={styles.rowLabel}>Total Duration:</span>
									<span className={styles.durationValue}>{formatDuration(entry.duration_sec)}</span>
								</div>
							</div>
						</div>
					)}

					{/* Duration Only Section - Show if no times */}
					{!entry.started_at && !entry.ended_at && (
						<div className="space-y-3">
							<div className={styles.sectionHeader}>
								<Clock className="h-4 w-4" />
								Duration
							</div>
							<div className={styles.sectionContentSingle}>
								<div className={styles.row}>
									<span className={styles.rowLabel}>Total Time:</span>
									<span className={styles.durationValue}>{formatDuration(entry.duration_sec)}</span>
								</div>
							</div>
						</div>
					)}

					{/* Notes Section */}
					{entry.note && (
						<div className="space-y-3">
							<div className={styles.sectionHeader}>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
									<polyline points="14 2 14 8 20 8" />
									<line x1="16" x2="8" y1="13" y2="13" />
									<line x1="16" x2="8" y1="17" y2="17" />
									<line x1="10" x2="8" y1="9" y2="9" />
								</svg>
								Notes
							</div>
							<div className={styles.notesContent}>
								<p className={styles.notesText}>{entry.note}</p>
							</div>
						</div>
					)}
				</div>

				<SheetFooter className={styles.footer}>
					<Button variant="outline" onClick={handleCopy} disabled={copied} className={styles.footerButton}>
						{copied ? (
							<>
								<Check className="mr-2 h-4 w-4 text-green-500" />
								Copied!
							</>
						) : (
							<>
								<Copy className="mr-2 h-4 w-4" />
							Copy Details
						</>
						)}
					</Button>
					<Button onClick={handleEdit} className={styles.footerButton}>
						<Edit2 className="mr-2 h-4 w-4" />
						Edit Entry
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
