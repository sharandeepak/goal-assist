"use client";

import { TimeEntry } from "@/types";
import { format, isSameDay } from "date-fns";
import { Plus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EntryRow from "./entry-row";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface DayColumnProps {
	day: Date;
	entries: TimeEntry[];
	onAddEntry: (day: Date) => void;
	onEditEntry: (entry: TimeEntry) => void;
	onDeleteEntry: (entryId: string) => void;
}

export default function DayColumn({ day, entries, onAddEntry, onEditEntry, onDeleteEntry }: DayColumnProps) {
	const [copied, setCopied] = useState(false);
	const { toast } = useToast();

	const dayEntries = entries.filter((entry) => {
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
				const startTime = formatTime(entry.startedAt);
				const endTime = entry.endedAt ? formatTime(entry.endedAt) : "Running";
				const duration = formatDuration(entry.durationSec);
				const note = entry.note ? ` - ${entry.note}` : "";
				return `• ${entry.taskTitleSnapshot} (${startTime} - ${endTime}, ${duration})${note}`;
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

	const isToday = isSameDay(day, new Date());

	return (
		<Card className={isToday ? "border-primary" : ""}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex-1 min-w-0">
						<CardTitle className="text-sm font-medium">{format(day, "EEE, MMM d")}</CardTitle>
						<p className="text-xs text-muted-foreground mt-1">Total: {formatTotal(totalSeconds)}</p>
					</div>
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} disabled={dayEntries.length === 0} title="Copy day entries">
							{copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
						</Button>
						<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddEntry(day)}>
							<Plus className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-2">
				{dayEntries.length === 0 ? (
					<div className="text-center py-8 text-sm text-muted-foreground">
						No entries
						<Button variant="link" size="sm" onClick={() => onAddEntry(day)} className="block mx-auto mt-2">
							Add time
						</Button>
					</div>
				) : (
					dayEntries.map((entry) => <EntryRow key={entry.id} entry={entry} onEdit={onEditEntry} onDelete={onDeleteEntry} />)
				)}
			</CardContent>
		</Card>
	);
}
