"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export const QueryProvider = ({ children }: { children: React.ReactNode }) => {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						// Prevent queries from blocking navigation
						staleTime: 1000 * 60, // 1 minute
						gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
						refetchOnWindowFocus: false,
						refetchOnMount: false,
						// Don't retry failed queries immediately
						retry: 1,
						retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
						// Use background fetching - don't block UI
						networkMode: "online",
					},
				},
			})
	);

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
