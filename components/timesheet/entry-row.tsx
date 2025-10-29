"use client";

import { TimeEntry } from "@/types";
import { format } from "date-fns";
import { Clock, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EntryRowProps {
	entry: TimeEntry;
	onEdit: (entry: TimeEntry) => void;
	onDelete: (entryId: string) => void;
	onView?: (entry: TimeEntry) => void;
}

export default function EntryRow({ entry, onEdit, onDelete, onView }: EntryRowProps) {
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

	const isRunning = !entry.endedAt;

	return (
		<div className="group p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => onView?.(entry)}>
			<div className="flex items-start justify-between gap-2">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<h4 className="text-sm font-medium truncate">{entry.taskTitleSnapshot}</h4>
						{entry.source === "timer" && (
							<Badge variant="outline" className="text-xs">
								Timer
							</Badge>
						)}
						{isRunning && (
							<Badge variant="default" className="text-xs">
								Running
							</Badge>
						)}
					</div>
					<div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
						<Clock className="h-3 w-3" />
						<span>
							{formatTime(entry.startedAt)} - {isRunning ? "Running" : formatTime(entry.endedAt)}
						</span>
						<span className="font-medium">{formatDuration(entry.durationSec)}</span>
					</div>
					{entry.note && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.note}</p>}
				</div>
				<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						onClick={(e) => {
							e.stopPropagation();
							onEdit(entry);
						}}
					>
						<Edit2 className="h-3 w-3" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-destructive"
						onClick={(e) => {
							e.stopPropagation();
							onDelete(entry.id);
						}}
					>
						<Trash2 className="h-3 w-3" />
					</Button>
				</div>
			</div>
		</div>
	);
}
