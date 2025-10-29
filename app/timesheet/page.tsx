"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, startOfDay } from "date-fns";
import { TimeEntry } from "@/types";
import { subscribeToEntriesByDateRange, deleteEntry, MOCK_USER_ID } from "@/services/timeService";
import WeekSelector from "@/components/timesheet/week-selector";
import DayColumn from "@/components/timesheet/day-column";
import AddEntryDialog from "@/components/timesheet/add-entry-dialog";
import ViewEntryDialog from "@/components/timesheet/view-entry-dialog";
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
	const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
	const [entriesToDelete, setEntriesToDelete] = useState<string[]>([]);
	const [deleteDayName, setDeleteDayName] = useState<string>("");
	const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
	const [viewingEntry, setViewingEntry] = useState<TimeEntry | null>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const todayColumnRef = useRef<HTMLDivElement>(null);

	// Calculate date range based on filter - memoized to prevent infinite loops
	const dateRange = useMemo(() => {
		switch (dateFilter) {
			case "today":
				// Use currentWeekStart as the selected day (not always "new Date()")
				const selectedDay = startOfDay(currentWeekStart);
				return { start: selectedDay, end: selectedDay };
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
		// For duration-based entries without startedAt, use the day field
		const selectedDate = entry.startedAt ? entry.startedAt.toDate() : new Date(entry.day);
		setSelectedDay(selectedDate);
		setEditingEntry(entry);
		setIsAddDialogOpen(true);
	};

	const handleDeleteEntry = (entryId: string) => {
		setEntryToDelete(entryId);
		setDeleteConfirmOpen(true);
	};

	const handleViewEntry = (entry: TimeEntry) => {
		setViewingEntry(entry);
		setIsViewDialogOpen(true);
	};

	const handleEditFromView = (entry: TimeEntry) => {
		// For duration-based entries without startedAt, use the day field
		const selectedDate = entry.startedAt ? entry.startedAt.toDate() : new Date(entry.day);
		setSelectedDay(selectedDate);
		setEditingEntry(entry);
		setIsAddDialogOpen(true);
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

	const handleDeleteAllEntries = (day: Date, entryIds: string[]) => {
		setEntriesToDelete(entryIds);
		setDeleteDayName(format(day, "EEEE, MMMM d, yyyy"));
		setDeleteAllConfirmOpen(true);
	};

	const confirmDeleteAll = async () => {
		try {
			await Promise.all(entriesToDelete.map((id) => deleteEntry(id)));
			setEntriesToDelete([]);
			setDeleteDayName("");
			setDeleteAllConfirmOpen(false);
		} catch (err) {
			console.error("Error deleting entries:", err);
			setError("Failed to delete entries. Please try again.");
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

	if (error) {
		return (
			<div className="container mx-auto p-4">
				<div className="text-center text-red-600 py-8">{error}</div>
			</div>
		);
	}

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

			{loading ? (
				<div ref={scrollContainerRef} className="overflow-x-auto overflow-y-hidden pb-4">
					<div className={dateFilter === "today" ? "w-full" : "flex gap-4"}>
						{displayDays.map((day) => (
							<div key={day.toISOString()} className="flex-shrink-0" style={{ width: dateFilter === "today" ? "100%" : "320px" }}>
								<TimesheetLoading />
							</div>
						))}
					</div>
				</div>
			) : (
				<div ref={scrollContainerRef} className="overflow-x-auto overflow-y-hidden pb-4">
					<div className={dateFilter === "today" ? "w-full" : "flex gap-4"}>
						{displayDays.map((day) => {
							const isToday = isSameDay(day, new Date());
							return (
								<div key={day.toISOString()} ref={isToday ? todayColumnRef : null} className="flex-shrink-0" style={{ width: dateFilter === "today" ? "100%" : "320px" }}>
									<DayColumn day={day} entries={entries} onAddEntry={handleAddEntry} onEditEntry={handleEditEntry} onDeleteEntry={handleDeleteEntry} onViewEntry={handleViewEntry} onDeleteAllEntries={handleDeleteAllEntries} />
								</div>
							);
						})}
					</div>
				</div>
			)}

			<AddEntryDialog isOpen={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} selectedDay={selectedDay} editingEntry={editingEntry} />

			<ViewEntryDialog isOpen={isViewDialogOpen} onOpenChange={setIsViewDialogOpen} entry={viewingEntry} onEdit={handleEditFromView} />

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

			<AlertDialog open={deleteAllConfirmOpen} onOpenChange={setDeleteAllConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete All Entries for {deleteDayName}</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete all {entriesToDelete.length} {entriesToDelete.length === 1 ? "entry" : "entries"} for this day? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							Delete All
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
