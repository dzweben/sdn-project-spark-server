export interface SurveyStatus {
  instrumentName: string;
  label: string;
  completionValue: number; // 0=incomplete, 1=unverified, 2=complete
  isComplete: boolean;
  surveyLink?: string;
}

export interface VisitStatus {
  visitTypeKey: string;
  label: string;
  eventName: string;
  surveys: SurveyStatus[];
  totalComplete: number;
  totalSurveys: number;
  allComplete: boolean;
}

export interface Participant {
  subId: string;
  recordId: string;
  v1Date: string | null;
  v2Date: string | null;
  email: string;
  childEmail: string;
  phone: string;
  childPhone: string;
  visits: Record<string, VisitStatus>;
}

export interface ReminderRow {
  id: string;
  subId: string;
  visitType: string;
  visitLabel: string;
  scheduledDate: string;
  reminderNumber: number;
  channel: string;
  status: string;
  recipientEmail: string | null;
  recipientPhone: string | null;
  surveyNames: string[];
}

export interface DashboardStats {
  totalParticipants: number;
  v1Complete: number;
  v2Complete: number;
  overallCompletionPercent: number;
}

export interface FollowupRow {
  subId: string;
  v2Date: string | null;
  periods: {
    label: string;
    dueDate: string | null;
    childStatus: VisitStatus | null;
    parentStatus: VisitStatus | null;
    remindersSent: number;
  }[];
}
