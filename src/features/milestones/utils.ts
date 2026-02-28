import { Timestamp } from "firebase/firestore";
import { startOfDay, differenceInCalendarDays } from "date-fns";

/** Calculate days left until end date, ensuring non-negative. */
export const calculateDaysLeft = (endDate: Timestamp | undefined): number | undefined => {
  if (!endDate) return undefined;
  const today = startOfDay(new Date());
  const end = startOfDay(endDate.toDate());
  const diff = differenceInCalendarDays(end, today);
  return Math.max(0, diff);
};
