"use client";

import { TimeEntry } from "@/types";
import { format as formatDate } from "date-fns";

// Alias to avoid conflict with variable name
const format = formatDate;
import { Clock, Calendar, Edit2, Copy, Check, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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

	const formatTime = (timestamp: any): string => {
		if (!timestamp) return "";
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return format(date, "HH:mm");
	};

	const formatFullDate = (timestamp: any): string => {
		if (!timestamp) return "";
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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

	const isRunning = !entry.endedAt;

	const handleCopy = async () => {
		const entryDate = entry.startedAt ? formatFullDate(entry.startedAt) : format(new Date(entry.day), "EEEE, MMMM d, yyyy");
		const duration = formatDuration(entry.durationSec);
		const note = entry.note ? `\n\nNotes:\n${entry.note}` : "";

		let timeInfo = "";
		if (entry.startedAt && entry.endedAt) {
			const startTime = formatTime(entry.startedAt);
			const endTime = formatTime(entry.endedAt);
			timeInfo = `${startTime} - ${endTime} (${duration})`;
		} else if (entry.startedAt && !entry.endedAt) {
			const startTime = formatTime(entry.startedAt);
			timeInfo = `${startTime} - Running (${duration})`;
		} else {
			timeInfo = `Duration: ${duration}`;
		}

		const clipboardText = `${entry.taskTitleSnapshot}\n${entryDate}\n${timeInfo}${note}`;

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
			<SheetContent className="sm:max-w-[500px]">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						<span className="flex-1 text-xl">{entry.taskTitleSnapshot}</span>
						{entry.source === "timer" && (
							<Badge variant="outline" className="text-xs">
								<Timer className="h-3 w-3 mr-1" />
								Timer
							</Badge>
						)}
						{isRunning && entry.startedAt && (
							<Badge variant="default" className="text-xs animate-pulse">
								Running
							</Badge>
						)}
					</SheetTitle>
					<SheetDescription className="flex items-center gap-2 text-base">
						<Calendar className="h-4 w-4" />
						{entry.startedAt ? formatFullDate(entry.startedAt) : format(new Date(entry.day), "EEEE, MMMM d, yyyy")}
					</SheetDescription>
				</SheetHeader>

				<div className="space-y-6 py-6">
					{/* Time Section - Only show if times are available */}
					{(entry.startedAt || entry.endedAt) && (
						<div className="space-y-3">
							<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
								<Clock className="h-4 w-4" />
								Time Details
							</div>
							<div className="pl-6 space-y-2">
								{entry.startedAt && (
									<div className="flex justify-between items-center">
										<span className="text-sm text-muted-foreground">Start Time:</span>
										<span className="text-base font-semibold">{formatTime(entry.startedAt)}</span>
									</div>
								)}
								{entry.startedAt && (
									<div className="flex justify-between items-center">
										<span className="text-sm text-muted-foreground">End Time:</span>
										<span className="text-base font-semibold">{isRunning ? <Badge variant="default">Running</Badge> : entry.endedAt ? formatTime(entry.endedAt) : "N/A"}</span>
									</div>
								)}
								<Separator />
								<div className="flex justify-between items-center">
									<span className="text-sm text-muted-foreground">Total Duration:</span>
									<span className="text-lg font-bold text-primary">{formatDuration(entry.durationSec)}</span>
								</div>
							</div>
						</div>
					)}

					{/* Duration Only Section - Show if no times */}
					{!entry.startedAt && !entry.endedAt && (
						<div className="space-y-3">
							<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
								<Clock className="h-4 w-4" />
								Duration
							</div>
							<div className="pl-6">
								<div className="flex justify-between items-center">
									<span className="text-sm text-muted-foreground">Total Time:</span>
									<span className="text-lg font-bold text-primary">{formatDuration(entry.durationSec)}</span>
								</div>
							</div>
						</div>
					)}

					{/* Notes Section */}
					{entry.note && (
						<div className="space-y-3">
							<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
									<polyline points="14 2 14 8 20 8" />
									<line x1="16" x2="8" y1="13" y2="13" />
									<line x1="16" x2="8" y1="17" y2="17" />
									<line x1="10" x2="8" y1="9" y2="9" />
								</svg>
								Notes
							</div>
							<div className="pl-6">
								<p className="text-sm leading-relaxed whitespace-pre-wrap bg-muted p-4 rounded-lg">{entry.note}</p>
							</div>
						</div>
					)}
				</div>

				<SheetFooter className="flex-col sm:flex-row gap-2">
					<Button variant="outline" onClick={handleCopy} disabled={copied} className="w-full sm:w-auto">
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
					<Button onClick={handleEdit} className="w-full sm:w-auto">
						<Edit2 className="mr-2 h-4 w-4" />
						Edit Entry
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
