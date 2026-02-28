export const styles = {
	container: "mt-4 space-y-2",
	skeletonContainer: "mt-4 space-y-3",
	skeletonItem: "flex items-center gap-3 py-2.5 px-3 rounded-xl bg-muted/30 animate-fade-up",
	errorState: "mt-4 flex items-center gap-2 p-4 rounded-xl bg-destructive/5 text-destructive",
	emptyState: "mt-4 flex flex-col items-center justify-center py-8 text-center",
	emptyIcon: "p-3 rounded-full bg-muted/50 mb-3",
	emptyText: "text-sm text-muted-foreground",
	toggleError: "flex items-center gap-2 p-2 rounded-lg bg-destructive/5 text-destructive mb-2",
	taskItem: "flex items-center gap-3 text-sm py-2.5 px-3 rounded-xl transition-all duration-200 bg-muted/30 hover:bg-muted/50 cursor-pointer animate-fade-up",
	taskTitle: "flex-grow truncate font-medium",
	taskTitleCompleted: "flex-grow truncate font-medium line-through text-muted-foreground",
	viewAllLink: "flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary text-center py-3 rounded-xl hover:bg-muted/30 transition-colors",
} as const;
