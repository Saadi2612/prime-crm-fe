export type NotificationType =
  | "lead_assigned"
  | "lead_transferred"
  | "follow_up_reminder"
  | "lead_bounced"
  | (string & {});

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}
