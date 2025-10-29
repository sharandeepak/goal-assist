"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addWeeks, subWeeks, addMonths, subMonths, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DateFilter = "today" | "week" | "month";

interface WeekSelectorProps {
	currentWeekStart: Date;
	onWeekChange: (newWeekStart: Date) => void;
	dateFilter: DateFilter;
	onFilterChange: (filter: DateFilter) => void;
}

export default function WeekSelector({ currentWeekStart, onWeekChange, dateFilter, onFilterChange }: WeekSelectorProps) {
	const goToPrev = () => {
		switch (dateFilter) {
			case "today":
				onWeekChange(subDays(currentWeekStart, 1));
				break;
			case "week":
				onWeekChange(subWeeks(currentWeekStart, 1));
				break;
			case "month":
				onWeekChange(subMonths(currentWeekStart, 1));
				break;
		}
	};

	const goToNext = () => {
		switch (dateFilter) {
			case "today":
				onWeekChange(addDays(currentWeekStart, 1));
				break;
			case "week":
				onWeekChange(addWeeks(currentWeekStart, 1));
				break;
			case "month":
				onWeekChange(addMonths(currentWeekStart, 1));
				break;
		}
	};

	const handleFilterChange = (value: DateFilter) => {
		const today = new Date();
		onFilterChange(value);
		switch (value) {
			case "today":
				onWeekChange(startOfDay(today));
				break;
			case "week":
				onWeekChange(startOfWeek(today, { weekStartsOn: 1 }));
				break;
			case "month":
				onWeekChange(startOfMonth(today));
				break;
		}
	};

	const getDisplayText = () => {
		switch (dateFilter) {
			case "today":
				return format(currentWeekStart, "EEEE, MMM d, yyyy");
			case "week":
				const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
				return `${format(currentWeekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
			case "month":
				return format(currentWeekStart, "MMMM yyyy");
		}
	};

	return (
		<div className="flex items-center justify-between py-4 flex-wrap gap-4">
			<div className="flex items-center gap-2">
				<Button variant="outline" size="icon" onClick={goToPrev}>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<div className="min-w-[200px] text-center">
					<h2 className="text-lg font-semibold">{getDisplayText()}</h2>
				</div>
				<Button variant="outline" size="icon" onClick={goToNext}>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
			<Select value={dateFilter} onValueChange={handleFilterChange}>
				<SelectTrigger className="w-[150px]">
					<SelectValue placeholder="Quick Filter" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="today">Today</SelectItem>
					<SelectItem value="week">This Week</SelectItem>
					<SelectItem value="month">This Month</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
}
