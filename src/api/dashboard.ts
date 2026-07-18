import { api } from './client';
import { borrowApi } from './borrow';

type BasicResponse = { success: boolean; message?: string } & Record<string, any>;

export const dashboardApi = {
  // Get dashboard data (borrowed books, overdue, stats)
  getDashboard: (email: string) =>
    api.get<BasicResponse>('/api/auth/get_student_dashboard.php', { 
      params: { email } 
    }),

  // Get user fines (from payments API)
  getUserFines: (email: string) =>
    api.get<BasicResponse>('/api/payments/get_user_fines.php', { 
      params: { user_email: email } 
    }),

  // Process payment for fines (from payments API)
  processPayment: (fine_ids: number[], user_email: string, payment_method: string = 'bkash') =>
    api.post<BasicResponse>('/api/payments/process_payment.php', {
      fine_ids,
      user_email,
      payment_method
    }),

  // Get user reservations - use the borrow transactions API and filter for reserved status
  getUserReservations: async (email: string) => {
    try {
      const data = await borrowApi.getUserTransactions(email);
      if (data.success) {
        // Filter for reserved books
        const reserved = (data.transactions || []).filter(t => t.status === 'Reserved');
        return {
          success: true,
          reservations: reserved.map(r => ({
            id: r.transaction_id,
            isbn: r.isbn,
            title: r.book_title || 'Unknown',
            reservationDate: r.borrow_date,
            status: 'Reserved',
            isReady: false
          }))
        };
      }
      return { success: false, reservations: [] };
    } catch (error) {
      console.error('Error fetching reservations:', error);
      return { success: false, reservations: [] };
    }
  },

  // Submit digital resource request
  submitResourceRequest: (formData: FormData) =>
    api.post<BasicResponse>('/api/auth/request_book_upload.php', formData),
};
