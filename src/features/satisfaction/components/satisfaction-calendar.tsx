"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/common/ui/button";
import styles from "../styles/SatisfactionCalendar.module.css";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, getYear, getMonth, addWeeks } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/ui/card";
import Lottie from "lottie-react";
import { Timestamp } from "firebase/firestore";

import { subscribeToSatisfactionForMonth, saveSatisfactionEntry } from "@/features/satisfaction/services/satisfactionService";
import type { SatisfactionEntry } from "@/features/satisfaction/repository/satisfactionRepository";

import happyAnimation from "../../../../public/lottie/happy_green.json";
import coolAnimation from "../../../../public/lottie/cool.json";
import angryAnimation from "../../../../public/lottie/angry.json";
import okayAnimation from "../../../../public/lottie/okay.json";

// const initialMockData: SatisfactionEntry[] = [...];

export default function SatisfactionCalendar() {
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [satisfactionData, setSatisfactionData] = useState<SatisfactionEntry[]>([]);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [playingMoodAnimation, setPlayingMoodAnimation] = useState<"happy" | "cool" | "angry" | "okay" | null>(null);
	const queryClient = useQueryClient();

	useEffect(() => {
		setLoading(true);
		setError(null);
		setSatisfactionData([]); // Clear previous month's data

		const year = getYear(currentMonth);
		const month = getMonth(currentMonth); // 0-indexed (January is 0)

		const unsubscribe = subscribeToSatisfactionForMonth(
			year,
			month,
			(fetchedEntries) => {
				setSatisfactionData(fetchedEntries);
				setLoading(false);
			},
			(err) => {
				console.error("Failed to fetch satisfaction data:", err);
				setError("Could not load your satisfaction data for this month.");
				setLoading(false);
			}
		);

		// Return a cleanup function for the subscription
		return () => unsubscribe();
	}, [currentMonth]);

	const handleDayClick = (day: Date) => {
		if (!isSameMonth(day, currentMonth) || loading) return;
		setSelectedDate(day);
		setIsModalOpen(true);
	};

	const handleMoodSelect = async (mood: "happy" | "cool" | "angry" | "okay") => {
		if (!selectedDate) return;

		let score = 0;
		if (mood === "happy") score = 9;
		else if (mood === "cool") score = 6;
		else if (mood === "angry") score = 3;
		else if (mood === "okay") score = 5;

		const entryToSave: Omit<SatisfactionEntry, "id" | "userId"> & { date: any } = {
			date: selectedDate, // This might need to be converted to Firebase Timestamp or ISO string before saving
			mood,
			score,
			// userId: "currentUser123", // Replace with actual user ID from your auth context
		};

		// --- Placeholder for actual data saving ---
		// This is where you would call your service to save the entry.
		// You'll need to define 'saveSatisfactionEntry' in your satisfactionService.ts

		try {
			const savedEntry = await saveSatisfactionEntry(entryToSave); // entryToSave.date might need conversion here
			console.log("Satisfaction entry saved:", savedEntry);
			queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
			// Optimistic update or refetch will be handled by the subscription in useEffect
			// If not using a subscription, you might need to manually add to satisfactionData here.
		} catch (err) {
			console.error("Failed to save satisfaction entry:", err);
			setError("Failed to save your mood. Please try again."); // Optionally, show an error to the user
		}
		// For now, demonstrating optimistic update locally (remove when service is integrated)
		// setSatisfactionData((prev) => {
		// 	const existingEntryIndex = prev.findIndex((e) => isSameDay(e.date, selectedDate));
		// 	const newEntry: SatisfactionEntry = {
		// 		id: Math.random().toString(36).substr(2, 9), // Mock ID, backend will generate real one
		// 		date: selectedDate,
		// 		mood,
		// 		score,
		// 	};
		// 	if (existingEntryIndex > -1) {
		// 		const updated = [...prev];
		// 		updated[existingEntryIndex] = newEntry;
		// 		return updated;
		// 	}
		// 	return [...prev, newEntry];
		// });
		// console.log(`Mock save: Mood for ${format(selectedDate, "yyyy-MM-dd")}: ${mood}, Score: ${score}`);
		// --- End of data saving placeholder ---

		setIsModalOpen(false);
		setSelectedDate(null);
	};

	const renderHeader = () => {
		return (
			<div className={styles.header}>
				<Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} disabled={loading}>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<span className={styles.monthTitle}>{format(currentMonth, "MMMM yyyy")}</span>
				<Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} disabled={loading}>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		);
	};

	const renderDays = () => {
		const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		return (
			<div className={styles.daysGrid}>
				{daysOfWeek.map((day) => (
					<div key={day} className={styles.dayLabel}>
						{day}
					</div>
				))}
			</div>
		);
	};

	const renderCells = () => {
		if (loading) {
			return (
				<div className={styles.loadingGrid}>
					<Loader2 className={styles.loader} />
				</div>
			);
		}
		// No need for explicit error display in cells, header error is sufficient or a general message

		const monthStart = startOfMonth(currentMonth);
		const monthEnd = endOfMonth(monthStart);
		const startDate = startOfWeek(monthStart);
		// Ensure we always show 6 weeks (42 days) for consistent height
		const endDate = endOfWeek(addWeeks(startDate, 5));

		const days = eachDayOfInterval({ start: startDate, end: endDate });

		return (
			<div className={styles.cellsGrid}>
				{days.map((day) => {
					const moodEntry = satisfactionData.find((entry) => isSameDay(entry.date instanceof Timestamp ? entry.date.toDate() : entry.date, day));
					let moodIcon = null;
					if (moodEntry) {
						if (moodEntry.mood === "happy") moodIcon = <Lottie animationData={happyAnimation} loop={false} autoplay={false} style={{ height: "100%", width: "100%" }} />;
						else if (moodEntry.mood === "cool") moodIcon = <Lottie animationData={coolAnimation} loop={false} autoplay={false} style={{ height: "100%", width: "100%" }} />;
						else if (moodEntry.mood === "angry") moodIcon = <Lottie animationData={angryAnimation} loop={false} autoplay={false} style={{ height: "100%", width: "100%" }} />;
						else if (moodEntry.mood === "okay") moodIcon = <Lottie animationData={okayAnimation} loop={false} autoplay={false} style={{ height: "100%", width: "100%" }} />;
					}

					const isCurrentMonthDay = isSameMonth(day, monthStart);

					return (
						<div
							key={day.toString()}
							className={`${styles.cell} ${isCurrentMonthDay ? styles.cellCurrentMonth : styles.cellOtherMonth} ${isSameDay(day, new Date()) && isCurrentMonthDay ? styles.cellToday : ""} ${!isCurrentMonthDay && isSameDay(day, new Date()) ? "border-transparent" : ""}`}
							onClick={() => isCurrentMonthDay && handleDayClick(day)}
						>
							{moodIcon ? moodIcon : <span className={`text-sm ${!isCurrentMonthDay ? "text-muted-foreground/60" : ""}`}>{format(day, "d")}</span>}
						</div>
					);
				})}
			</div>
		);
	};

	return (
		<div className={styles.root}>
			{renderHeader()}
			{error && <p className={styles.errorMessage}>{error}</p>}
			{renderDays()}
			{renderCells()}
			<AnimatePresence>
				{isModalOpen && selectedDate && (
					<motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
						<motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.2 }}>
							<Card className={styles.modalCard} style={{ backgroundColor: "#1C1C1E", color: "#FFFFFF" }}>
								<CardHeader>
									<CardTitle className="text-center" style={{ fontSize: "20px" }}>
										How was your day?
									</CardTitle>
									<CardDescription className="text-center" style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.7)" }}>
										{format(selectedDate, "EEEE, MMMM d, yyyy")}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className={styles.moodButtons}>
										{/* Sad Mood Button */}
										<motion.div
											whileHover={{ scale: 1.1 }}
											whileTap={{ scale: 0.95 }}
											onClick={() => {
												setPlayingMoodAnimation("angry");
												setTimeout(() => {
													setPlayingMoodAnimation(null);
													handleMoodSelect("angry");
												}, 100);
											}}
											className={styles.moodButtonWrapper}
										>
											<Button variant="ghost" size="icon" className={`${styles.moodButton} hover:bg-red-500/10 focus-visible:ring-red-500`}>
												<Lottie animationData={angryAnimation} loop={false} style={{ height: "100%", width: "100%" }} />
											</Button>
											{playingMoodAnimation === "angry" && <motion.div className="absolute inset-0 rounded-full" animate={{ boxShadow: ["0 0 0px #EF4444", "0 0 15px #EF4444", "0 0 0px #EF4444"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />}
										</motion.div>

										{/* Neutral Mood Button */}
										<motion.div
											whileHover={{ scale: 1.1 }}
											whileTap={{ scale: 0.95 }}
											onClick={() => {
												setPlayingMoodAnimation("okay");
												setTimeout(() => {
													setPlayingMoodAnimation(null);
													handleMoodSelect("okay");
												}, 100);
											}}
											className={styles.moodButtonWrapper}
										>
											<Button variant="ghost" size="icon" className={`${styles.moodButton} hover:bg-yellow-500/10 focus-visible:ring-yellow-500`}>
												<Lottie animationData={okayAnimation} loop={false} style={{ height: "100%", width: "100%" }} />
											</Button>
											{playingMoodAnimation === "okay" && <motion.div className="absolute inset-0 rounded-full" animate={{ boxShadow: ["0 0 0px #F59E0B", "0 0 15px #F59E0B", "0 0 0px #F59E0B"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />}
										</motion.div>

										{/* Happy Mood Button */}
										<motion.div
											whileHover={{ scale: 1.1 }}
											whileTap={{ scale: 0.95 }}
											onClick={() => {
												setPlayingMoodAnimation("happy");
												setTimeout(() => {
													setPlayingMoodAnimation(null);
													handleMoodSelect("happy");
												}, 100); // Play animation for 1.5 seconds
											}}
											className={styles.moodButtonWrapper}
										>
											<Button variant="ghost" size="icon" className={`${styles.moodButton} hover:bg-green-500/10 focus-visible:ring-green-500`}>
												<Lottie animationData={happyAnimation} loop={false} style={{ height: "100%", width: "100%" }} />
											</Button>
											{playingMoodAnimation === "happy" && <motion.div className="absolute inset-0 rounded-full" animate={{ boxShadow: ["0 0 0px #34D399", "0 0 15px #34D399", "0 0 0px #34D399"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />}
										</motion.div>

										{/* Cool Mood Button */}
										<motion.div
											whileHover={{ scale: 1.1 }}
											whileTap={{ scale: 0.95 }}
											onClick={() => {
												setPlayingMoodAnimation("cool");
												setTimeout(() => {
													setPlayingMoodAnimation(null);
													handleMoodSelect("cool");
												}, 100);
											}}
											className={styles.moodButtonWrapper}
										>
											<Button variant="ghost" size="icon" className={`${styles.moodButton} hover:bg-blue-500/10 focus-visible:ring-blue-500`}>
												<Lottie animationData={coolAnimation} loop={false} style={{ height: "100%", width: "100%" }} />
											</Button>
											{playingMoodAnimation === "cool" && <motion.div className="absolute inset-0 rounded-full" animate={{ boxShadow: ["0 0 0px #3B82F6", "0 0 15px #3B82F6", "0 0 0px #3B82F6"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />}
										</motion.div>
									</div>

									<div className={styles.cancelArea}>
										<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
											<Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white hover:bg-white/10" style={{ borderRadius: "12px" }}>
												Cancel
											</Button>
										</motion.div>
									</div>
								</CardContent>
							</Card>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
