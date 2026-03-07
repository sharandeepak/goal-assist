"use client";

import { useState } from "react";
import { styles } from "../styles/MatrixFilters.styles";
import { Button } from "@/common/ui/button";
import { Input } from "@/common/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/common/ui/popover";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar } from "@fortawesome/free-solid-svg-icons";
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

	return (
		<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" className={styles.triggerButton}>
					<FontAwesomeIcon icon={faCalendar} className={styles.calendarIcon} />
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
