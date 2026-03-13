"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/common/components/sidebar";
import TopHeader from "@/common/components/top-header";
import Spotlight from "@/common/components/spotlight";

const AUTH_ROUTES = ["/auth", "/onboarding"];

export default function AppShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

	if (isAuthRoute) {
		return <>{children}</>;
	}

	return (
		<div className="flex h-screen overflow-hidden bg-background">
			<Sidebar />
			<div className="flex-1 flex flex-col overflow-hidden">
				<TopHeader />
				<main className="flex-1 overflow-y-auto bg-muted/20 p-6 md:p-8 page-enter">{children}</main>
			</div>
			<Spotlight />
		</div>
	);
}
