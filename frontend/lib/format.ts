import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import type { UserBrief } from "./types";

dayjs.extend(relativeTime);

/** "3 hours ago" for the last week, then a date like "Mar 4, 2026". */
export function formatPostDate(date: string) {
  const value = dayjs(date);
  return dayjs().diff(value, "day") < 7 ? value.fromNow() : value.format("MMM D, YYYY");
}

/** "Cardiology · City Hospital" */
export function doctorLine(user: Pick<UserBrief, "specialization" | "hospital">) {
  return [user.specialization, user.hospital].filter(Boolean).join(" · ");
}
