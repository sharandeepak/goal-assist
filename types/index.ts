import { Timestamp } from "firebase/firestore";

export interface Task {
	id: string; // Firestore document ID
	title: string;
	completed: boolean;
	createdAt?: Timestamp; // Optional: for ordering/filtering
	date?: Timestamp; // Optional: specific date for the task (used in planner/calendar)
	priority?: "low" | "medium" | "high"; // Optional: for planner
	urgency?: "low" | "medium" | "high"; // Optional: for Eisenhower matrix
	tags?: string[]; // Optional: for planner
	userId?: string; // Optional: if you need multi-user support later
	milestoneId?: string; // Optional: if the task is associated with a milestone
}

export interface Milestone {
	id: string; // Firestore document ID
	title: string;
	description?: string; // Optional
	progress: number; // Percentage (0-100)
	urgency: "low" | "medium" | "high";
	status: "planned" | "active" | "completed" | "on_hold";
	startDate?: Timestamp;
	endDate?: Timestamp;
	tasks?: Partial<Task>[]; // Optional: Sub-collection or array of associated tasks
	userId?: string;
}

export interface SatisfactionLog {
	id: string; // Firestore document ID
	date: Timestamp;
	score: number; // e.g., 1-10
	notes?: string; // Optional
	userId?: string;
}

export interface StandupLog {
	id: string; // Firestore document ID
	date: Timestamp;
	completed: string[];
	blockers: string[];
	planned: string[];
	notes?: string; // Optional: General notes for the standup
	userId?: string;
}

// Interface for data fetched specifically for the Milestone Progress component
export interface MilestoneProgressData extends Milestone {
	daysLeft?: number; // Dynamically calculated
}

// Interface for data fetched specifically for the main Page's Milestone Summary card
export interface PageMilestoneSummary {
	id: string;
	title: string;
	urgency: "high" | "medium" | "low";
	daysLeft?: number;
}

export interface SatisfactionSummary {
	currentScore: number | null;
	change: number | null;
}

export interface TimeEntry {
	id: string; // Firestore document ID
	userId: string; // Owner of the entry
	taskId: string | null; // Linked task or null for ad-hoc
	taskTitleSnapshot: string; // Title at the time of logging (or ad-hoc title)
	emoji?: string | null; // Optional emoji for the entry
	milestoneIdSnapshot?: string | null; // Optional snapshot
	tagsSnapshot?: string[]; // Optional snapshot
	note?: string | null; // Optional note
	source: "manual" | "timer";
	startedAt: Timestamp | null; // Start time (null for duration-based entries)
	endedAt: Timestamp | null; // Null while timer is running or for duration-based entries
	durationSec: number; // Denormalized duration; 0 while running
	day: string; // YYYY-MM-DD (for fast queries)
	createdAt: Timestamp;
	updatedAt: Timestamp;
}
