"use client";
import { Moon, Sun, Palette, Leaf, Flower2, Waves, Heart, Sparkles, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
	DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
	const { setTheme, theme } = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="icon" className="relative overflow-hidden group">
					<Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
					<Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
					<span className="sr-only">Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				{/* Bento Themes - Calm & Focused */}
				<DropdownMenuLabel className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
					<Sparkles className="h-3 w-3" />
					Aesthetic Themes
				</DropdownMenuLabel>
				
				{/* Sage */}
				<DropdownMenuItem
					onClick={() => setTheme("bento-sage")}
					className={theme === "bento-sage" ? "bg-accent" : ""}
				>
					<Leaf className="h-4 w-4 mr-2 text-[#7C9A82]" />
					Sage Light
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("bento-sage-dark")}
					className={theme === "bento-sage-dark" ? "bg-accent" : ""}
				>
					<Leaf className="h-4 w-4 mr-2 text-[#5a8f69]" />
					Sage Dark
				</DropdownMenuItem>

				{/* Lavender - NEW */}
				<DropdownMenuItem
					onClick={() => setTheme("bento-lavender")}
					className={theme === "bento-lavender" ? "bg-accent" : ""}
				>
					<Flower2 className="h-4 w-4 mr-2 text-[#9B8AA5]" />
					Lavender Light
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("bento-lavender-dark")}
					className={theme === "bento-lavender-dark" ? "bg-accent" : ""}
				>
					<Flower2 className="h-4 w-4 mr-2 text-[#8B7A95]" />
					Lavender Dark
				</DropdownMenuItem>

				{/* Ocean - NEW */}
				<DropdownMenuItem
					onClick={() => setTheme("bento-ocean")}
					className={theme === "bento-ocean" ? "bg-accent" : ""}
				>
					<Waves className="h-4 w-4 mr-2 text-[#5B8FA8]" />
					Ocean Light
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("bento-ocean-dark")}
					className={theme === "bento-ocean-dark" ? "bg-accent" : ""}
				>
					<Waves className="h-4 w-4 mr-2 text-[#4A7A8F]" />
					Ocean Dark
				</DropdownMenuItem>

				{/* Rose - NEW */}
				<DropdownMenuItem
					onClick={() => setTheme("bento-rose")}
					className={theme === "bento-rose" ? "bg-accent" : ""}
				>
					<Heart className="h-4 w-4 mr-2 text-[#C4A4A4]" />
					Rose Light
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("bento-rose-dark")}
					className={theme === "bento-rose-dark" ? "bg-accent" : ""}
				>
					<Heart className="h-4 w-4 mr-2 text-[#A08080]" />
					Rose Dark
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				{/* Classic Themes */}
				<DropdownMenuLabel className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
					<Palette className="h-3 w-3" />
					Classic
				</DropdownMenuLabel>
				<DropdownMenuItem
					onClick={() => setTheme("light")}
					className={theme === "light" ? "bg-accent" : ""}
				>
					<Sun className="h-4 w-4 mr-2" />
					Light
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("dark")}
					className={theme === "dark" ? "bg-accent" : ""}
				>
					<Moon className="h-4 w-4 mr-2" />
					Dark
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("dark-modern")}
					className={theme === "dark-modern" ? "bg-accent" : ""}
				>
					<span className="w-4 h-4 rounded-full bg-[#924fd2] mr-2" />
					Modern Purple
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("dark-elegant")}
					className={theme === "dark-elegant" ? "bg-accent" : ""}
				>
					<span className="w-4 h-4 rounded-full bg-[#5a8f69] mr-2" />
					Elegant Sage
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					onClick={() => setTheme("system")}
					className={theme === "system" ? "bg-accent" : ""}
				>
					<Monitor className="h-4 w-4 mr-2" />
					System
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
