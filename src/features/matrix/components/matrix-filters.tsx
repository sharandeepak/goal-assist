"use client";

import { useState } from "react";
import styles from "../styles/MatrixFilters.module.css";
import { Button } from "@/common/ui/button";
import { Input } from "@/common/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/common/ui/popover";
import { Calendar as CalendarIcon, AlertCircle, Clock, Users, Archive, Grid3x3, Search } from "lucide-react";
import { Calendar } from "@/common/ui/calendar";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { QuadrantType } from "@/features/matrix/services/matrixService";
import { Badge } from "@/common/ui/badge";

interface MatrixFiltersProps {
	dateRange: { start: Date; end: Date } | null;
	onDateRangeChange: (range: { start: Date; end: Date } | null) => void;
	selectedQuadrant: QuadrantType | "all";
	onQuadrantChange: (quadrant: QuadrantType | "all") => void;
	searchQuery: string;
	onSearchChange: (query: string) => void;
	taskCounts?: {
		q1: number;
		q2: number;
		q3: number;
		q4: number;
	};
}

type DatePreset = "today" | "week" | "month" | "all";

export function MatrixFilters({ dateRange, onDateRangeChange, selectedQuadrant, onQuadrantChange, searchQuery, onSearchChange, taskCounts }: MatrixFiltersProps) {
	const [calendarOpen, setCalendarOpen] = useState(false);
	const [datePreset, setDatePreset] = useState<DatePreset>("all");

	const handlePresetClick = (preset: DatePreset) => {
		setDatePreset(preset);
		const now = new Date();

		switch (preset) {
			case "today":
				onDateRangeChange({
					start: startOfDay(now),
					end: endOfDay(now),
				});
				break;
			case "week":
				onDateRangeChange({
					start: startOfWeek(now),
					end: endOfWeek(now),
				});
				break;
			case "month":
				onDateRangeChange({
					start: startOfMonth(now),
					end: endOfMonth(now),
				});
				break;
			case "all":
				onDateRangeChange(null);
				break;
		}
		setCalendarOpen(false);
	};

	const quadrantButtons = [
		{
			id: "all" as const,
			label: "All",
			icon: Grid3x3,
			color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600",
			activeColor: "bg-slate-600 dark:bg-slate-400 text-white dark:text-slate-900 border-slate-600 dark:border-slate-400",
			count: taskCounts ? taskCounts.q1 + taskCounts.q2 + taskCounts.q3 + taskCounts.q4 : 0,
		},
		{
			id: "q1" as const,
			label: "Do First",
			icon: AlertCircle,
			color: "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800",
			activeColor: "bg-red-600 dark:bg-red-500 text-white border-red-600 dark:border-red-500",
			count: taskCounts?.q1 || 0,
		},
		{
			id: "q2" as const,
			label: "Schedule",
			icon: Clock,
			color: "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800",
			activeColor: "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500",
			count: taskCounts?.q2 || 0,
		},
		{
			id: "q3" as const,
			label: "Delegate",
			icon: Users,
			color: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800",
			activeColor: "bg-amber-600 dark:bg-amber-500 text-white border-amber-600 dark:border-amber-500",
			count: taskCounts?.q3 || 0,
		},
		{
			id: "q4" as const,
			label: "Eliminate",
			icon: Archive,
			color: "bg-slate-50 dark:bg-slate-950/20 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-800",
			activeColor: "bg-slate-600 dark:bg-slate-500 text-white border-slate-600 dark:border-slate-500",
			count: taskCounts?.q4 || 0,
		},
	];

	return (
		<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" className={styles.triggerButton}>
					<CalendarIcon className={styles.calendarIcon} />
					{dateRange ? `${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d, yyyy")}` : "All Time"}
				</Button>
			</PopoverTrigger>
			<PopoverContent className={styles.popoverContent} align="start">
				<div className={styles.presetSection}>
					<div className={styles.presetButtonsRow}>
						<Button variant={datePreset === "today" ? "default" : "outline"} size="sm" onClick={() => handlePresetClick("today")} className={styles.presetButton}>
							Today
						</Button>
						<Button variant={datePreset === "week" ? "default" : "outline"} size="sm" onClick={() => handlePresetClick("week")} className={styles.presetButton}>
							Week
						</Button>
						<Button variant={datePreset === "month" ? "default" : "outline"} size="sm" onClick={() => handlePresetClick("month")} className={styles.presetButton}>
							Month
						</Button>
						<Button variant={datePreset === "all" ? "default" : "outline"} size="sm" onClick={() => handlePresetClick("all")} className={styles.presetButton}>
							All
						</Button>
					</div>
				</div>
				<Calendar
					mode="range"
					selected={dateRange ? { from: dateRange.start, to: dateRange.end } : undefined}
					onSelect={(range) => {
						if (range?.from && range?.to) {
							onDateRangeChange({
								start: startOfDay(range.from),
								end: endOfDay(range.to),
							});
							setDatePreset("all"); // Custom range
						} else if (!range?.from && !range?.to) {
							onDateRangeChange(null);
						}
					}}
					numberOfMonths={2}
					className={styles.calendarWrapper}
				/>
			</PopoverContent>
		</Popover>
	);
}
