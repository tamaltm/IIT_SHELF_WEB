import { api } from './client';

type BasicResponse = { success: boolean; message?: string } & Record<string, any>;

export const authApi = {
  // Registration flow
  sendRegisterOtp: (email: string) =>
    api.post<BasicResponse>('/api/auth/send_register_otp.php', { email }),

  verifyEmail: (email: string, otp: string) =>
    api.post<BasicResponse>('/api/auth/verify_email.php', { email, otp }),

  setPassword: (email: string, newPassword: string) =>
    api.post<BasicResponse>('/api/auth/set_password.php', { email, new_password: newPassword }),

  // Login
  login: (email: string, password: string) =>
    api.post<BasicResponse>('/api/auth/login.php', { email, password }),

  // Profile
  getProfile: (email: string) =>
    api.post<BasicResponse>('/api/auth/get_profile.php', { email }),

  // Update profile basic info
  updateProfile: (data: { email: string; name?: string; contact?: string }) =>
    api.post<BasicResponse>('/api/auth/update_profile.php', data),

  // Change password
  changePassword: (
    email: string,
    current_password: string,
    new_password: string,
  ) => api.post<BasicResponse>('/api/auth/change_password.php', {
    email,
    current_password,
    new_password,
  }),

  // Upload profile image (multipart)
  uploadProfileImage: (email: string, file: File) => {
    const form = new FormData();
    form.append('email', email);
    form.append('image', file);
    return api.post<BasicResponse>('/api/auth/upload_profile_image.php', form);
  },

  // Password reset flow
  sendResetOtp: (email: string) =>
    api.post<BasicResponse>('/api/auth/send_reset_otp.php', { email }),

  verifyResetOtp: (email: string, otp: string) =>
    api.post<BasicResponse>('/api/auth/verify_reset_otp.php', { email, otp }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    api.post<BasicResponse>('/api/auth/reset_password.php', { email, otp, new_password: newPassword }),
};
