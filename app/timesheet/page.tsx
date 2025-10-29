"use client";

import { useState, useEffect } from "react";
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from "date-fns";
import { TimeEntry } from "@/types";
import { subscribeToEntriesByDateRange, deleteEntry, MOCK_USER_ID } from "@/services/timeService";
import WeekSelector from "@/components/timesheet/week-selector";
import DayColumn from "@/components/timesheet/day-column";
import AddEntryDialog from "@/components/timesheet/add-entry-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import TimesheetLoading from "@/app/timesheet/loading";

export default function TimesheetPage() {
	const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday start
	const [entries, setEntries] = useState<TimeEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [selectedDay, setSelectedDay] = useState<Date | null>(null);
	const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

	useEffect(() => {
		setLoading(true);
		setError(null);

		const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
		const startDay = format(currentWeekStart, "yyyy-MM-dd");
		const endDay = format(weekEnd, "yyyy-MM-dd");

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
	}, [currentWeekStart]);

	const weekDays = eachDayOfInterval({
		start: currentWeekStart,
		end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
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

	return (
		<div className="container mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Timesheet</h1>
					<p className="text-muted-foreground mt-1">Track your time across the week</p>
				</div>
				<div className="text-right">
					<p className="text-sm text-muted-foreground">Week Total</p>
					<p className="text-2xl font-bold">{formatWeekTotal(weekTotal)}</p>
				</div>
			</div>

			<WeekSelector currentWeekStart={currentWeekStart} onWeekChange={setCurrentWeekStart} />

			<div className="overflow-x-auto pb-4">
				<div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 min-w-max md:min-w-0">
					{weekDays.map((day) => (
						<div key={day.toISOString()} className="w-80 md:w-auto flex-shrink-0">
							<DayColumn day={day} entries={entries} onAddEntry={handleAddEntry} onEditEntry={handleEditEntry} onDeleteEntry={handleDeleteEntry} />
						</div>
					))}
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
