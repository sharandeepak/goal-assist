import type React from "react";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "../src/common/styles/globals.css";
import Navbar from "@/common/components/navbar";
import Spotlight from "@/common/components/spotlight";
import NavigationProgress from "@/common/components/navigation-progress";
import { ThemeProvider } from "@/common/providers/theme-provider";
import { QueryProvider } from "@/common/providers/query-provider";
import { StagewiseToolbar } from "@stagewise/toolbar-next";
import { ReactPlugin } from "@stagewise-plugins/react";

// Primary display font - distinctive and modern
const plusJakarta = Plus_Jakarta_Sans({
	subsets: ["latin"],
	variable: "--font-display",
	display: "swap",
	weight: ["400", "500", "600", "700", "800"],
});

// Body font - clean and readable
const dmSans = DM_Sans({
	subsets: ["latin"],
	variable: "--font-body",
	display: "swap",
	weight: ["400", "500", "600", "700"],
});

// Monospace font - for code and data
const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
	display: "swap",
	weight: ["400", "500", "600", "700"],
});

// Alternative display for brutalist theme
const spaceGrotesk = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-grotesk",
	display: "swap",
	weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
	title: "Goal Assist",
	description: "AI-powered productivity tracking for software engineers",
	generator: "v0.dev",
	icons: {
		icon: "/target.svg",
		shortcut: "/target.svg",
		apple: "/target.svg",
	},
};

// All available themes
const themes = [
	"light",
	"dark",
	// Bento themes - Beautiful aesthetic themes
	"bento-sage",
	"bento-sage-dark",
	"bento-lavender",
	"bento-lavender-dark",
	"bento-ocean",
	"bento-ocean-dark",
	"bento-rose",
	"bento-rose-dark",
	// Classic themes
	"dark-modern",
	"dark-elegant",
	"system",
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} font-body antialiased`}>
				<QueryProvider>
					<ThemeProvider attribute="class" defaultTheme="bento-sage-dark" enableSystem themes={themes}>
						<StagewiseToolbar config={{ plugins: [ReactPlugin] }} />
						<NavigationProgress />
						<div className="min-h-screen flex flex-col">
							<Navbar />
							<main className="flex-1 container mx-auto px-4 py-6 page-enter">{children}</main>
							<Spotlight />
						</div>
					</ThemeProvider>
				</QueryProvider>
			</body>
		</html>
	);
}
