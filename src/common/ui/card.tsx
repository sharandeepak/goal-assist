import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/common/lib/utils";

const cardVariants = cva(
	"rounded-lg bg-card text-card-foreground transition-all duration-300 ease-spring",
	{
		variants: {
			variant: {
				default: "shadow-sm border",
				glass: "card-glass backdrop-blur-xl border border-white/10",
				brutal: "card-brutal",
				glow: "card-glow",
				elevated: "shadow-soft hover:shadow-hover hover:-translate-y-1",
				flat: "bg-muted/50",
				outline: "border-2 bg-transparent",
			},
			hover: {
				none: "",
				lift: "hover:-translate-y-1 hover:shadow-hover",
				scale: "hover:scale-[1.02]",
				glow: "hover:shadow-glow",
				brutal: "hover:translate-x-[-2px] hover:translate-y-[-2px]",
			},
			padding: {
				default: "",
				none: "p-0",
				sm: "p-4",
				lg: "p-8",
			},
		},
		defaultVariants: {
			variant: "default",
			hover: "none",
			padding: "default",
		},
	}
);

export interface CardProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof cardVariants> {
	border?: boolean;
	animate?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
	({ className, variant, hover, padding, border = true, animate = false, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				cardVariants({ variant, hover, padding }),
				border && variant === "default" && "border",
				animate && "animate-fade-up",
				className
			)}
			{...props}
		/>
	)
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("flex flex-col space-y-1.5 p-6", className)}
			{...props}
		/>
	)
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				"font-display text-xl font-semibold leading-none tracking-tight",
				className
			)}
			{...props}
		/>
	)
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("text-sm text-muted-foreground font-body", className)}
			{...props}
		/>
	)
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
	)
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("flex items-center p-6 pt-0", className)}
			{...props}
		/>
	)
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
