import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Spotlight from "@/components/spotlight";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { StagewiseToolbar } from "@stagewise/toolbar-next";
import { ReactPlugin } from "@stagewise-plugins/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Goal Assist",
	description: "AI-powered productivity tracking for software engineers",
	generator: "v0.dev",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={inter.className}>
				<QueryProvider>
					<ThemeProvider attribute="class" defaultTheme="system" enableSystem themes={["light", "dark", "dark-modern", "dark-elegant", "dark-cozy", "dark-cool", "dark-nature", "dark-blue", "system"]}>
						<StagewiseToolbar config={{ plugins: [ReactPlugin] }} />
						<div className="min-h-screen flex flex-col">
							<Navbar />
							<main className="flex-1 container mx-auto px-4 py-6">{children}</main>
							<Spotlight />
						</div>
					</ThemeProvider>
				</QueryProvider>
			</body>
		</html>
	);
}

import "./globals.css";
