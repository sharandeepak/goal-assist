"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, startOfDay } from "date-fns";
import { TimeEntry } from "@/types";
import { subscribeToEntriesByDateRange, deleteEntry, MOCK_USER_ID } from "@/services/timeService";
import WeekSelector from "@/components/timesheet/week-selector";
import DayColumn from "@/components/timesheet/day-column";
import AddEntryDialog from "@/components/timesheet/add-entry-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import TimesheetLoading from "@/app/timesheet/loading";

export type DateFilter = "today" | "week" | "month";

export default function TimesheetPage() {
	const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday start
	const [dateFilter, setDateFilter] = useState<DateFilter>("week");
	const [entries, setEntries] = useState<TimeEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [selectedDay, setSelectedDay] = useState<Date | null>(null);
	const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const todayColumnRef = useRef<HTMLDivElement>(null);

	// Calculate date range based on filter - memoized to prevent infinite loops
	const dateRange = useMemo(() => {
		switch (dateFilter) {
			case "today":
				const today = startOfDay(new Date());
				return { start: today, end: today };
			case "week":
				return {
					start: currentWeekStart,
					end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
				};
			case "month":
				return {
					start: startOfMonth(currentWeekStart),
					end: endOfMonth(currentWeekStart),
				};
		}
	}, [dateFilter, currentWeekStart]);

	const { start: dateRangeStart, end: dateRangeEnd } = dateRange;

	useEffect(() => {
		setLoading(true);
		setError(null);

		const startDay = format(dateRangeStart, "yyyy-MM-dd");
		const endDay = format(dateRangeEnd, "yyyy-MM-dd");

		try {
			const unsubscribe = subscribeToEntriesByDateRange(MOCK_USER_ID, startDay, endDay, (fetchedEntries) => {
				setEntries(fetchedEntries);
				setLoading(false);
			});

			return () => unsubscribe();
		} catch (err) {
			console.error("Error fetching entries:", err);
			setError("Failed to load time entries. Please refresh the page.");
			setLoading(false);
		}
	}, [dateRangeStart, dateRangeEnd]);

	// Auto-scroll to today when filter changes
	useEffect(() => {
		if (!loading && (dateFilter === "week" || dateFilter === "month") && scrollContainerRef.current && todayColumnRef.current) {
			// Small delay to ensure DOM is ready
			setTimeout(() => {
				todayColumnRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "nearest",
					inline: "center",
				});
			}, 100);
		}
	}, [loading, dateFilter]);

	const displayDays = eachDayOfInterval({
		start: dateRangeStart,
		end: dateRangeEnd,
	});

	const handleAddEntry = (day: Date) => {
		setSelectedDay(day);
		setEditingEntry(null);
		setIsAddDialogOpen(true);
	};

	const handleEditEntry = (entry: TimeEntry) => {
		setSelectedDay(entry.startedAt.toDate());
		setEditingEntry(entry);
		setIsAddDialogOpen(true);
	};

	const handleDeleteEntry = (entryId: string) => {
		setEntryToDelete(entryId);
		setDeleteConfirmOpen(true);
	};

	const confirmDelete = async () => {
		if (entryToDelete) {
			try {
				await deleteEntry(entryToDelete);
				setEntryToDelete(null);
				setDeleteConfirmOpen(false);
			} catch (err) {
				console.error("Error deleting entry:", err);
				setError("Failed to delete entry. Please try again.");
			}
		}
	};

	const formatWeekTotal = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	};

	const weekTotal = entries.reduce((sum, entry) => sum + entry.durationSec, 0);

	if (loading) {
		return <TimesheetLoading />;
	}

	if (error) {
		return (
			<div className="container mx-auto p-4">
				<div className="text-center text-red-600 py-8">{error}</div>
			</div>
		);
	}

	const getFilterLabel = () => {
		switch (dateFilter) {
			case "today":
				return "Today";
			case "week":
				return "Week";
			case "month":
				return "Month";
		}
	};

	return (
		<div className="container mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Timesheet</h1>
					<p className="text-muted-foreground mt-1">Track your time across the {getFilterLabel().toLowerCase()}</p>
				</div>
				<div className="text-right">
					<p className="text-sm text-muted-foreground">{getFilterLabel()} Total</p>
					<p className="text-2xl font-bold">{formatWeekTotal(weekTotal)}</p>
				</div>
			</div>

			<WeekSelector currentWeekStart={currentWeekStart} onWeekChange={setCurrentWeekStart} dateFilter={dateFilter} onFilterChange={setDateFilter} />

			<div ref={scrollContainerRef} className="overflow-x-auto overflow-y-hidden pb-4">
				<div className="flex gap-4">
					{displayDays.map((day) => {
						const isToday = isSameDay(day, new Date());
						return (
							<div key={day.toISOString()} ref={isToday ? todayColumnRef : null} className="flex-shrink-0" style={{ width: "320px" }}>
								<DayColumn day={day} entries={entries} onAddEntry={handleAddEntry} onEditEntry={handleEditEntry} onDeleteEntry={handleDeleteEntry} />
							</div>
						);
					})}
				</div>
			</div>

			<AddEntryDialog isOpen={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} selectedDay={selectedDay} editingEntry={editingEntry} />

			<AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Time Entry</AlertDialogTitle>
						<AlertDialogDescription>Are you sure you want to delete this time entry? This action cannot be undone.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
