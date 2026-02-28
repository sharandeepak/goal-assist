"use client";

import { TimeEntry } from "@/common/types";
import { format, isSameDay } from "date-fns";
import { Plus, Copy, Check, Trash2 } from "lucide-react";
import { Button } from "@/common/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/ui/card";
import EntryRow from "./entry-row";
import styles from "../styles/DayColumn.module.css";
import { useState } from "react";
import { useToast } from "@/common/hooks/use-toast";

interface DayColumnProps {
	day: Date;
	entries: TimeEntry[];
	onAddEntry: (day: Date) => void;
	onEditEntry: (entry: TimeEntry) => void;
	onDeleteEntry: (entryId: string) => void;
	onViewEntry?: (entry: TimeEntry) => void;
	onDeleteAllEntries?: (day: Date, entryIds: string[]) => void;
}

export default function DayColumn({ day, entries, onAddEntry, onEditEntry, onDeleteEntry, onViewEntry, onDeleteAllEntries }: DayColumnProps) {
	const [copied, setCopied] = useState(false);
	const { toast } = useToast();

	const dayEntries = entries.filter((entry) => {
		// For duration-based entries without startedAt, use the day field
		if (!entry.startedAt) {
			return entry.day === format(day, "yyyy-MM-dd");
		}
		const entryDate = entry.startedAt.toDate();
		return isSameDay(entryDate, day);
	});

	const totalSeconds = dayEntries.reduce((sum, entry) => sum + entry.durationSec, 0);

	const formatTotal = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	};

	const formatTime = (timestamp: any): string => {
		if (!timestamp) return "";
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return format(date, "HH:mm");
	};

	const formatDuration = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	};

	const handleCopy = async () => {
		if (dayEntries.length === 0) {
			toast({
				title: "No entries to copy",
				description: "Add some time entries first.",
				variant: "destructive",
			});
			return;
		}

		// Format entries for clipboard
		const dayText = format(day, "EEEE, MMMM d, yyyy");
		const entriesText = dayEntries
			.map((entry) => {
				const duration = formatDuration(entry.durationSec);
				const note = entry.note ? ` - ${entry.note}` : "";
				if (entry.startedAt && entry.endedAt) {
					const startTime = formatTime(entry.startedAt);
					const endTime = formatTime(entry.endedAt);
					return `• ${entry.taskTitleSnapshot} (${startTime} - ${endTime}, ${duration})${note}`;
				} else if (entry.startedAt && !entry.endedAt) {
					const startTime = formatTime(entry.startedAt);
					return `• ${entry.taskTitleSnapshot} (${startTime} - Running, ${duration})${note}`;
				} else {
					// Duration-only entry
					return `• ${entry.taskTitleSnapshot} (${duration})${note}`;
				}
			})
			.join("\n");

		const clipboardText = `${dayText}\nTotal: ${formatTotal(totalSeconds)}\n\n${entriesText}`;

		try {
			await navigator.clipboard.writeText(clipboardText);
			setCopied(true);
			toast({
				title: "Copied to clipboard",
				description: `${dayEntries.length} ${dayEntries.length === 1 ? "entry" : "entries"} copied successfully.`,
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

	const handleDeleteAll = () => {
		if (dayEntries.length === 0) return;
		const entryIds = dayEntries.map((entry) => entry.id);
		onDeleteAllEntries?.(day, entryIds);
	};

	const isToday = isSameDay(day, new Date());

	return (
		<Card className={`${styles.card} ${isToday ? styles.cardToday : ""}`} style={{ height: "600px" }}>
			<CardHeader className={styles.header}>
				<div className={styles.headerRow}>
					<div className={styles.headerLeft}>
						<CardTitle className={styles.dayTitle}>{format(day, "EEE,")}</CardTitle>
						<CardTitle className={styles.dayTitle}>{format(day, "MMM d")}</CardTitle>
						<p className={styles.totalText}>Total: {formatTotal(totalSeconds)}</p>
					</div>
					<div className={styles.headerActions}>
						<Button variant="ghost" size="icon" className={styles.headerButton} onClick={handleDeleteAll} disabled={dayEntries.length === 0} title="Delete all entries">
							<Trash2 className={`${styles.headerIcon} text-destructive`} />
						</Button>
						<Button variant="ghost" size="icon" className={styles.headerButton} onClick={handleCopy} disabled={dayEntries.length === 0} title="Copy day entries">
							{copied ? <Check className={`${styles.headerIcon} text-green-500`} /> : <Copy className={styles.headerIcon} />}
						</Button>
						<Button variant="ghost" size="icon" className={styles.headerButton} onClick={() => onAddEntry(day)}>
							<Plus className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent className={styles.content}>
				{dayEntries.length === 0 ? (
					<div className={styles.emptyState}>
						No entries
						<Button variant="link" size="sm" onClick={() => onAddEntry(day)} className={styles.emptyButton}>
							Add time
						</Button>
					</div>
				) : (
					dayEntries.map((entry) => <EntryRow key={entry.id} entry={entry} onEdit={onEditEntry} onDelete={onDeleteEntry} onView={onViewEntry} />)
				)}
			</CardContent>
		</Card>
	);
}
