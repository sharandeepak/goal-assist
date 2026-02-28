import { startOfDay, differenceInCalendarDays } from "date-fns";

export const calculateDaysLeft = (endDate: string | null | undefined): number | undefined => {
  if (!endDate) return undefined;
  const today = startOfDay(new Date());
  const end = startOfDay(new Date(endDate));
  const diff = differenceInCalendarDays(end, today);
  return Math.max(0, diff);
};
