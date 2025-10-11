"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, ArrowRight } from "lucide-react";

interface SummaryCardProps {
	title: string;
	value: string | number;
	description: string;
	change?: number | null;
}

export default function SummaryCard({ title, value, description, change }: SummaryCardProps) {
	const renderChange = () => {
		if (change === null || change === undefined) {
			return null;
		}
		if (change > 0) {
			return (
				<p className="text-xs text-green-500 flex items-center">
					<ArrowUp className="h-4 w-4 mr-1" />
					{change.toFixed(1)}
				</p>
			);
		}
		if (change < 0) {
			return (
				<p className="text-xs text-red-500 flex items-center">
					<ArrowDown className="h-4 w-4 mr-1" />
					{change.toFixed(1)}
				</p>
			);
		}
		return (
			<p className="text-xs text-muted-foreground flex items-center">
				<ArrowRight className="h-4 w-4 mr-1" />
				No change
			</p>
		);
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				<div className="flex justify-between items-center">
					<p className="text-xs text-muted-foreground">{description}</p>
					{renderChange()}
				</div>
			</CardContent>
		</Card>
	);
}
