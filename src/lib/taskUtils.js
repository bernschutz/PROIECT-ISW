import { isBefore, startOfMinute, addDays, addWeeks, addMonths } from "date-fns";

export function computeStatus(task) {
  if (task.status === "completed" || task.status === "canceled") return task.status;
  if (task.due_at && isBefore(new Date(task.due_at), startOfMinute(new Date()))) return "overdue";
  return "upcoming";
}

export function nextDue(due_at, recurrence) {
  if (!due_at) return null;
  const d = new Date(due_at);
  if (recurrence === "daily") return addDays(d, 1);
  if (recurrence === "weekly") return addWeeks(d, 1);
  if (recurrence === "monthly") return addMonths(d, 1);
  return null;
}
