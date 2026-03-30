import { VISIT_TYPES, type VisitTypeDef } from "./surveys";

export interface ComputedReminder {
  subId: string;
  visitType: string;
  visitLabel: string;
  scheduledDate: Date;
  reminderNumber: number;
  channel: "email" | "text";
  incompleteSurveys: { name: string; label: string }[];
}

// Compute reminder dates: every 3 days for 3 weeks starting day after visit
// = days 1, 4, 7, 10, 13, 16, 19 after visit date
const REMINDER_DAYS = [1, 4, 7, 10, 13, 16, 19];
const MAX_REMINDER_WINDOW_DAYS = 21;

export function computeRemindersForParticipant(
  subId: string,
  visitDate: Date,
  visitTypeKey: string,
  incompleteSurveys: { name: string; label: string }[]
): ComputedReminder[] {
  if (incompleteSurveys.length === 0) return [];

  const visitType = VISIT_TYPES.find((v) => v.key === visitTypeKey);
  if (!visitType) return [];

  const now = new Date();
  const windowEnd = new Date(visitDate);
  windowEnd.setDate(windowEnd.getDate() + MAX_REMINDER_WINDOW_DAYS);

  // If the 3-week window has passed, no more reminders
  if (now > windowEnd) return [];

  const reminders: ComputedReminder[] = [];

  for (let i = 0; i < REMINDER_DAYS.length; i++) {
    const reminderDate = new Date(visitDate);
    reminderDate.setDate(reminderDate.getDate() + REMINDER_DAYS[i]);
    // Set to 5 PM
    reminderDate.setHours(17, 0, 0, 0);

    // Generate both email and text reminders
    for (const channel of ["email", "text"] as const) {
      reminders.push({
        subId,
        visitType: visitTypeKey,
        visitLabel: visitType.label,
        scheduledDate: reminderDate,
        reminderNumber: i + 1,
        channel,
        incompleteSurveys,
      });
    }
  }

  return reminders;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
