"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, startOfDay, startOfMonth } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DateFilter = "today" | "week" | "month";

interface WeekSelectorProps {
	currentWeekStart: Date;
	onWeekChange: (newWeekStart: Date) => void;
}

export default function WeekSelector({ currentWeekStart, onWeekChange }: WeekSelectorProps) {
	const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 }); // Monday start

	const goToPrevWeek = () => {
		onWeekChange(subWeeks(currentWeekStart, 1));
	};

	const goToNextWeek = () => {
		onWeekChange(addWeeks(currentWeekStart, 1));
	};

	const handleFilterChange = (value: DateFilter) => {
		const today = new Date();
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

	return (
		<div className="flex items-center justify-between py-4 flex-wrap gap-4">
			<div className="flex items-center gap-2">
				<Button variant="outline" size="icon" onClick={goToPrevWeek}>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<div className="min-w-[200px] text-center">
					<h2 className="text-lg font-semibold">
						{format(currentWeekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
					</h2>
				</div>
				<Button variant="outline" size="icon" onClick={goToNextWeek}>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
			<Select onValueChange={handleFilterChange}>
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
