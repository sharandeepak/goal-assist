import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
	"flex w-full rounded-lg border bg-background px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 font-body",
	{
		variants: {
			variant: {
				default:
					"border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				filled:
					"border-transparent bg-muted focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring",
				ghost:
					"border-transparent bg-transparent focus-visible:bg-muted focus-visible:ring-0",
				brutal:
					"border-2 border-foreground rounded-sm focus-visible:ring-0 focus-visible:shadow-brutal",
				glass:
					"border-white/20 bg-white/5 backdrop-blur-sm focus-visible:bg-white/10 focus-visible:border-white/30",
			},
			inputSize: {
				default: "h-10",
				sm: "h-9 text-sm px-3",
				lg: "h-12 text-base px-5",
				xl: "h-14 text-lg px-6",
			},
		},
		defaultVariants: {
			variant: "default",
			inputSize: "default",
		},
	}
);

export interface InputProps
	extends Omit<React.ComponentProps<"input">, "size">,
		VariantProps<typeof inputVariants> {
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type, variant, inputSize, leftIcon, rightIcon, ...props }, ref) => {
		if (leftIcon || rightIcon) {
			return (
				<div className="relative">
					{leftIcon && (
						<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
							{leftIcon}
						</div>
					)}
					<input
						type={type}
						className={cn(
							inputVariants({ variant, inputSize }),
							leftIcon && "pl-10",
							rightIcon && "pr-10",
							className
						)}
						ref={ref}
						{...props}
					/>
					{rightIcon && (
						<div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
							{rightIcon}
						</div>
					)}
				</div>
			);
		}

		return (
			<input
				type={type}
				className={cn(inputVariants({ variant, inputSize }), className)}
				ref={ref}
				{...props}
			/>
		);
	}
);
Input.displayName = "Input";

export { Input, inputVariants };
