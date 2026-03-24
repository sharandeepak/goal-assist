import type React from "react";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "../src/common/styles/globals.css";
import NavigationProgress from "@/common/components/navigation-progress";
import AppShell from "@/common/components/app-shell";
import { ThemeProvider } from "@/common/providers/theme-provider";
import { QueryProvider } from "@/common/providers/query-provider";
import { AuthProvider } from "@/common/providers/auth-provider";

const plusJakarta = Plus_Jakarta_Sans({
	subsets: ["latin"],
	variable: "--font-display",
	display: "swap",
	weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
	subsets: ["latin"],
	variable: "--font-body",
	display: "swap",
	weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
	display: "swap",
	weight: ["400", "500", "600", "700"],
});

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

const themes = [
	"light",
	"dark",
	"bento-sage",
	"bento-sage-dark",
	"bento-lavender",
	"bento-lavender-dark",
	"bento-ocean",
	"bento-ocean-dark",
	"bento-rose",
	"bento-rose-dark",
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
						<AuthProvider>
							<NavigationProgress />
							<AppShell>{children}</AppShell>
						</AuthProvider>
					</ThemeProvider>
				</QueryProvider>
			</body>
		</html>
	);
}
