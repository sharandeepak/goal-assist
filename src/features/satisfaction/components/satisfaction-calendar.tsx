"use client";

import { useState, useEffect } from "react";
import { Button } from "@/common/ui/button";
import { styles } from "../styles/SatisfactionCalendar.styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, getYear, getMonth, addWeeks } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/ui/card";
import Lottie from "lottie-react";
import type { SupabaseSatisfactionLog } from "@/common/types";
import { useRequiredAuth } from "@/common/hooks/use-auth";
import { subscribeToSatisfactionForMonth, saveSatisfactionEntry } from "@/features/satisfaction/services/satisfactionService";

import happyAnimation from "../../../../public/lottie/happy_green.json";
import coolAnimation from "../../../../public/lottie/cool.json";
import angryAnimation from "../../../../public/lottie/angry.json";
import okayAnimation from "../../../../public/lottie/okay.json";

interface SatisfactionEntry {
	id?: string;
	date: Date | string;
	mood: "happy" | "cool" | "angry" | "okay";
	score: number;
}

export default function SatisfactionCalendar() {
	const { userId, workspaceId } = useRequiredAuth();
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [satisfactionData, setSatisfactionData] = useState<SatisfactionEntry[]>([]);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [playingMoodAnimation, setPlayingMoodAnimation] = useState<"happy" | "cool" | "angry" | "okay" | null>(null);
	useEffect(() => {
		if (!workspaceId) return;
		setLoading(true);
		setError(null);
		setSatisfactionData([]);

		const year = getYear(currentMonth);
		const month = getMonth(currentMonth) + 1;

		const unsubscribe = subscribeToSatisfactionForMonth(
			workspaceId,
			year,
			month,
			(fetchedEntries: SupabaseSatisfactionLog[]) => {
				const mapped: SatisfactionEntry[] = fetchedEntries.map((e) => {
					let mood: SatisfactionEntry["mood"] = "okay";
					if (e.score >= 8) mood = "happy";
					else if (e.score >= 6) mood = "cool";
					else if (e.score <= 3) mood = "angry";
					return {
						id: e.id,
						date: new Date(e.log_date),
						mood,
						score: e.score,
					};
				});
				setSatisfactionData(mapped);
				setLoading(false);
			},
			(err) => {
				console.error("Failed to fetch satisfaction data:", err);
				setError("Could not load satisfaction data.");
				setLoading(false);
			}
		);

		return () => unsubscribe();
	}, [currentMonth, workspaceId]);

	const handlePreviousMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
	const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));

	const handleDayClick = (day: Date) => {
		if (day > new Date()) return;
		setSelectedDate(day);
		setIsModalOpen(true);
	};

	const handleMoodSelect = async (mood: SatisfactionEntry["mood"]) => {
		if (!selectedDate) return;

		const scoreMap: Record<string, number> = { happy: 9, cool: 7, okay: 5, angry: 2 };
		const score = scoreMap[mood] ?? 5;

		setPlayingMoodAnimation(mood);
		setTimeout(() => setPlayingMoodAnimation(null), 1500);

		try {
			const logDate = format(selectedDate, "yyyy-MM-dd");
			await saveSatisfactionEntry({
				workspace_id: workspaceId,
				user_id: userId,
				log_date: logDate,
				score,
				notes: mood,
			});

			setSatisfactionData((prev) => {
				const existingIndex = prev.findIndex((e) => isSameDay(new Date(e.date), selectedDate));
				const newEntry: SatisfactionEntry = { date: selectedDate, mood, score };
				if (existingIndex >= 0) {
					const updated = [...prev];
					updated[existingIndex] = { ...updated[existingIndex], ...newEntry };
					return updated;
				}
				return [...prev, newEntry];
			});

		} catch (err) {
			console.error("Failed to save satisfaction entry:", err);
		}

		setIsModalOpen(false);
	};

	const getMoodForDay = (day: Date): SatisfactionEntry["mood"] | null => {
		const entry = satisfactionData.find((e) => isSameDay(new Date(e.date), day));
		return entry?.mood ?? null;
	};

	const getMoodColor = (mood: string | null) => {
		switch (mood) {
			case "happy":
				return "bg-green-500/20 border-green-500/40";
			case "cool":
				return "bg-blue-500/20 border-blue-500/40";
			case "angry":
				return "bg-red-500/20 border-red-500/40";
			case "okay":
				return "bg-yellow-500/20 border-yellow-500/40";
			default:
				return "hover:bg-muted/50";
		}
	};

	const getMoodEmoji = (mood: string | null) => {
		switch (mood) {
			case "happy":
				return "😊";
			case "cool":
				return "😎";
			case "angry":
				return "😡";
			case "okay":
				return "😐";
			default:
				return null;
		}
	};

	const monthStart = startOfMonth(currentMonth);
	const monthEnd = endOfMonth(currentMonth);
	const calendarStart = startOfWeek(monthStart);
	const calendarEnd = endOfWeek(addWeeks(endOfWeek(monthEnd), 0));
	const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

	const moodAnimationData = {
		happy: happyAnimation,
		cool: coolAnimation,
		angry: angryAnimation,
		okay: okayAnimation,
	};

	return (
		<Card className="relative overflow-hidden">
			<AnimatePresence>
				{playingMoodAnimation && (
					<motion.div
						initial={{ opacity: 0, scale: 0.5 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.5 }}
						className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
					>
						<Lottie animationData={moodAnimationData[playingMoodAnimation]} loop={false} style={{ width: 200, height: 200 }} />
					</motion.div>
				)}
			</AnimatePresence>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<div>
					<CardTitle className="text-lg">Mood Calendar</CardTitle>
					<CardDescription>Track your daily satisfaction</CardDescription>
				</div>
				<div className="flex items-center gap-1">
					<Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
						<FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
					</Button>
					<span className="text-sm font-medium min-w-[120px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
					<Button variant="ghost" size="icon" onClick={handleNextMonth}>
						<FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<FontAwesomeIcon icon={faSpinner} className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				) : error ? (
					<div className="flex items-center justify-center py-12">
						<p className="text-sm text-destructive">{error}</p>
					</div>
				) : (
					<>
						<div className="grid grid-cols-7 gap-1 mb-1">
							{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
								<div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
									{day}
								</div>
							))}
						</div>
						<div className="grid grid-cols-7 gap-1">
							{days.map((day, i) => {
								const isCurrentMonth = isSameMonth(day, currentMonth);
								const isToday = isSameDay(day, new Date());
								const mood = getMoodForDay(day);
								const isFuture = day > new Date();

								return (
									<button
										key={i}
										onClick={() => handleDayClick(day)}
										disabled={isFuture || !isCurrentMonth}
										className={`
											relative aspect-square flex flex-col items-center justify-center rounded-lg border text-sm transition-all
											${!isCurrentMonth ? "opacity-30" : ""}
											${isToday ? "ring-2 ring-primary ring-offset-1" : ""}
											${isFuture ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
											${getMoodColor(isCurrentMonth ? mood : null)}
										`}
									>
										<span className={`text-xs ${isToday ? "font-bold" : ""}`}>{format(day, "d")}</span>
										{mood && isCurrentMonth && (
											<div className="w-8 h-8 mt-0.5 flex items-center justify-center">
												<Lottie animationData={moodAnimationData[mood as keyof typeof moodAnimationData]} loop={true} style={{ width: '100%', height: '100%' }} />
											</div>
										)}
									</button>
								);
							})}
						</div>
					</>
				)}

				<AnimatePresence>
					{isModalOpen && selectedDate && (
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
							<motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card rounded-xl p-6 shadow-xl border max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
								<h3 className="font-semibold text-center mb-1">{format(selectedDate, "MMMM d, yyyy")}</h3>
								<p className="text-sm text-muted-foreground text-center mb-4">How are you feeling?</p>
								<div className="grid grid-cols-4 gap-3">
									{(["happy", "cool", "okay", "angry"] as const).map((mood) => (
										<button key={mood} onClick={() => handleMoodSelect(mood)} className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-muted transition-colors">
											<div className="w-12 h-12">
												<Lottie animationData={moodAnimationData[mood]} loop={true} style={{ width: '100%', height: '100%' }} />
											</div>
											<span className="text-xs capitalize">{mood}</span>
										</button>
									))}
								</div>
							</motion.div>
						</motion.div>
					)}
				</AnimatePresence>
			</CardContent>
		</Card>
	);
}
