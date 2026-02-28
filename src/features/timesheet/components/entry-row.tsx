"use client";

import { TimeEntry } from "@/common/types";
import { format } from "date-fns";
import { Clock, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/common/ui/button";
import { Badge } from "@/common/ui/badge";
import styles from "../styles/EntryRow.module.css";

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

	const isRunning = entry.startedAt && !entry.endedAt;
	const isDurationOnly = !entry.startedAt && !entry.endedAt;

	return (
		<div className={`group ${styles.card}`} onClick={() => onView?.(entry)}>
			<div className={styles.contentRow}>
				<div className={styles.leftContent}>
					<div className={styles.titleRow}>
						<h4 className={styles.title}>
							{entry.emoji && <span className={styles.emoji}>{entry.emoji}</span>}
							{entry.taskTitleSnapshot}
						</h4>
						{/* {entry.source === "timer" && (
							<Badge variant="outline" className="text-xs">
								Timer
							</Badge>
						)}
						{isRunning && (
							<Badge variant="default" className="text-xs">
								Running
							</Badge>
						)} */}
					</div>
					<div className={styles.timeRow}>
						<Clock className={styles.actionIcon} />
						{isDurationOnly ? (
							<span className="font-medium">{formatDuration(entry.durationSec)}</span>
						) : (
							<>
								<span>
									{formatTime(entry.startedAt)} - {isRunning ? "Running" : formatTime(entry.endedAt)}
								</span>
								<span className="font-medium">{formatDuration(entry.durationSec)}</span>
							</>
						)}
					</div>
				</div>
				<div className={`${styles.actions} opacity-0 group-hover:opacity-100`}>
					<Button
						variant="ghost"
						size="icon"
						className={styles.actionButton}
						onClick={(e) => {
							e.stopPropagation();
							onEdit(entry);
						}}
					>
						<Edit2 className={styles.actionIcon} />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className={`${styles.actionButton} text-destructive`}
						onClick={(e) => {
							e.stopPropagation();
							onDelete(entry.id);
						}}
					>
						<Trash2 className={styles.actionIcon} />
					</Button>
				</div>
			</div>
		</div>
	);
}
