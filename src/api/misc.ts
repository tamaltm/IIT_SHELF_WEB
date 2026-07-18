import { api } from './client';

type BasicResponse = { success: boolean; message?: string } & Record<string, any>;

export const profileApi = {
  // Get user profile (already in auth.ts but adding here for completeness)
  getProfile: (email: string) =>
    api.post<BasicResponse>('/api/auth/get_profile.php', { email }),

  // Update profile
  updateProfile: (data: { email: string; [key: string]: any }) =>
    api.post<BasicResponse>('/api/auth/update_profile.php', data),

  // Upload profile image
  uploadProfileImage: (formData: FormData) =>
    fetch('/api/auth/upload_profile_image.php', {
      method: 'POST',
      body: formData,
    }).then(res => res.json()),

  // Get profile image
  getProfileImage: (path: string) =>
    `/api/auth/get_image.php?path=${encodeURIComponent(path)}`,
};

export const notificationsApi = {
  // Get user notifications
  getNotifications: (email: string, unreadOnly?: boolean) => {
    const query = unreadOnly ? `?email=${encodeURIComponent(email)}&unread_only=true` : `?email=${encodeURIComponent(email)}`;
    return api.get<BasicResponse>(`/api/auth/get_notifications.php${query}`);
  },

  // Send notification (likely admin/system only)
  sendNotification: (data: any) =>
    api.post<BasicResponse>('/api/auth/send_notifications.php', data),
};

export const reportsApi = {
  // Generate report
  generateReport: (params: { type: string; [key: string]: any }) => {
    const query = new URLSearchParams(params as any).toString();
    return api.get<BasicResponse>(`/api/reports/generate_report.php?${query}`);
  },
};

export const coursesApi = {
  // Search courses
  searchCourses: (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return api.get<BasicResponse>(`/api/courses/search_courses.php${query}`);
  },
};
