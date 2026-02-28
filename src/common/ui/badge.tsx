import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/common/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
	{
		variants: {
			variant: {
				default:
					"border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
				secondary:
					"border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
				destructive:
					"border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
				outline:
					"text-foreground border-current",
				success:
					"border-transparent bg-green-500/10 text-green-600 dark:text-green-400",
				warning:
					"border-transparent bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
				info:
					"border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400",
				// Theme-specific variants
				brutal:
					"rounded-none border-2 border-foreground bg-primary text-primary-foreground font-bold uppercase tracking-wider",
				glass:
					"border-white/20 bg-white/10 backdrop-blur-sm text-foreground",
				soft:
					"border-transparent bg-primary/10 text-primary",
				glow:
					"border-transparent bg-primary text-primary-foreground shadow-glow",
			},
			size: {
				default: "px-2.5 py-0.5 text-xs rounded-full",
				sm: "px-2 py-0.5 text-[10px] rounded-full",
				lg: "px-3 py-1 text-sm rounded-full",
				// Brutal size (no rounded)
				brutal: "px-2 py-0.5 text-[10px] rounded-sm",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {
	dot?: boolean;
	dotColor?: string;
}

function Badge({ className, variant, size, dot, dotColor, children, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant, size }), className)} {...props}>
			{dot && (
				<span
					className={cn(
						"w-1.5 h-1.5 rounded-full mr-1.5",
						dotColor || "bg-current"
					)}
				/>
			)}
			{children}
		</div>
	);
}

export { Badge, badgeVariants };
