"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/common/ui/card";
import { styles } from "../styles/SatisfactionTracker.styles";
import { subscribeToSatisfactionLogs } from "@/features/satisfaction/services/satisfactionService";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/common/ui/skeleton";
import { SatisfactionLog } from "@/common/types";
import { format } from "date-fns";

interface FormattedLog {
	date: string;
	score: number;
}

export default function SatisfactionTracker() {
	const [satisfactionLogs, setSatisfactionLogs] = useState<FormattedLog[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		const unsubscribe = subscribeToSatisfactionLogs(
			(logs: SatisfactionLog[]) => {
				const formattedLogs = logs.map((log) => {
					return {
						...log,
						date: format(new Date(log.log_date), "MMM d"),
					};
				});
				setSatisfactionLogs(formattedLogs.reverse());
				setIsLoading(false);
			},
			(err) => {
				setError(err);
				setIsLoading(false);
			}
		);

		return () => unsubscribe();
	}, []);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Satisfaction Tracker</CardTitle>
				<CardDescription>Your satisfaction score over the last 7 entries.</CardDescription>
			</CardHeader>
			<CardContent className={styles.chartContainer}>
				{isLoading ? (
					<Skeleton className="h-full w-full" />
				) : error ? (
					<p className={styles.errorText}>Error loading data.</p>
				) : satisfactionLogs.length === 0 ? (
					<p className={styles.emptyText}>No data yet. Log your first entry!</p>
				) : (
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={satisfactionLogs}>
							<CartesianGrid strokeDasharray="3 3" className={styles.cartesianGrid} />
							<XAxis dataKey="date" className={styles.axisText} />
							<YAxis domain={[0, 10]} className={styles.axisText} />
							<Tooltip />
							<Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 5 }} />
						</LineChart>
					</ResponsiveContainer>
				)}
			</CardContent>
		</Card>
	);
}
