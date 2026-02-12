"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const progressVariants = cva(
	"relative w-full overflow-hidden bg-secondary transition-all",
	{
		variants: {
			variant: {
				default: "rounded-full",
				brutal: "rounded-none border-2 border-foreground",
				glow: "rounded-lg shadow-glow",
				pill: "rounded-full",
			},
			size: {
				default: "h-3",
				sm: "h-2",
				lg: "h-4",
				xl: "h-6",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
);

const indicatorVariants = cva("h-full w-full flex-1 transition-all duration-500 ease-spring", {
	variants: {
		variant: {
			default: "bg-primary rounded-full",
			brutal: "bg-primary rounded-none",
			glow: "bg-primary rounded-lg shadow-glow",
			pill: "bg-primary rounded-full",
		},
		animated: {
			true: "animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-primary via-primary/80 to-primary",
			false: "",
		},
	},
	defaultVariants: {
		variant: "default",
		animated: false,
	},
});

export interface ProgressProps
	extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
		VariantProps<typeof progressVariants> {
	indicatorClassName?: string;
	animated?: boolean;
	showValue?: boolean;
}

const Progress = React.forwardRef<
	React.ElementRef<typeof ProgressPrimitive.Root>,
	ProgressProps
>(({ className, value, variant, size, indicatorClassName, animated, showValue, ...props }, ref) => (
	<div className="relative w-full">
		<ProgressPrimitive.Root
			ref={ref}
			className={cn(progressVariants({ variant, size }), className)}
			{...props}
		>
			<ProgressPrimitive.Indicator
				className={cn(
					indicatorVariants({ variant, animated }),
					indicatorClassName
				)}
				style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
			/>
		</ProgressPrimitive.Root>
		{showValue && (
			<span className="absolute right-0 -top-6 text-xs font-mono text-muted-foreground">
				{Math.round(value || 0)}%
			</span>
		)}
	</div>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress, progressVariants };
