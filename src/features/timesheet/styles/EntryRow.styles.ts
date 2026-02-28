export const styles = {
	card: "p-3 rounded-lg border bg-card transition-colors cursor-pointer hover:bg-accent/50",
	contentRow: "flex items-start justify-between gap-2",
	leftContent: "flex-1 min-w-0",
	titleRow: "flex items-center gap-2",
	title: "text-sm font-medium truncate",
	emoji: "mr-1",
	timeRow: "flex items-center gap-2 mt-1 text-xs text-muted-foreground",
	actions: "flex items-center gap-1 transition-opacity",
	actionButton: "h-7 w-7",
	actionIcon: "h-3 w-3",
} as const;
