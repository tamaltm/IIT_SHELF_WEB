import { api } from './client';

type BasicResponse = { success: boolean; message?: string } & Record<string, any>;

export const notificationsApi = {
  // Get all notifications for a user
  getNotifications: (email: string, limit = 50) =>
    api.get<BasicResponse>('/api/auth/get_notifications.php', {
      params: { email, limit },
    }),

  // Mark a single notification as read
  markAsRead: (notification_id: number, user_email: string) =>
    api.post<BasicResponse>('/api/auth/mark_notification_read.php', {
      notification_id,
      user_email
    }),

  // Mark all notifications as read
  markAllAsRead: (user_email: string) =>
    api.post<BasicResponse>('/api/auth/mark_notification_read.php', {
      user_email,
      mark_all: true
    }),

  // Delete a notification
  deleteNotification: (notification_id: number, user_email: string) =>
    api.post<BasicResponse>('/api/auth/delete_notification.php', {
      notification_id,
      user_email
    }),
};
