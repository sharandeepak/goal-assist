"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { subscribeToSatisfactionLogs } from "@/services/satisfactionService";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { SatisfactionLog } from "@/types";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";

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
					const date = log.date instanceof Timestamp ? log.date.toDate() : new Date(log.date);
					return {
						...log,
						date: format(date, "MMM d"),
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
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-40 w-full" />
				) : error ? (
					<p className="text-red-500">Failed to load satisfaction data.</p>
				) : (
					<ResponsiveContainer width="100%" height={200}>
						<LineChart data={satisfactionLogs}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="date" />
							<YAxis domain={[0, 10]} />
							<Tooltip />
							<Line type="monotone" dataKey="score" stroke="#8884d8" activeDot={{ r: 8 }} />
						</LineChart>
					</ResponsiveContainer>
				)}
			</CardContent>
		</Card>
	);
}
