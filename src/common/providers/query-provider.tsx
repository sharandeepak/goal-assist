"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export const QueryProvider = ({ children }: { children: React.ReactNode }) => {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 1000 * 60, // 1 minute
						gcTime: 1000 * 60 * 5, // 5 minutes
						refetchOnWindowFocus: false,
						refetchOnMount: true,
						retry: 1,
						retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
						networkMode: "online",
					},
				},
			})
	);

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
