import { api } from './client';

type BasicResponse = { success: boolean; message?: string } & Record<string, any>;

export const librarianApi = {
  // Dashboard stats
  getDashboardStats: () =>
    api.get<BasicResponse>('/api/librarian/dashboard_stats.php'),

  // Get borrow/return requests
  getRequests: (type?: 'borrow' | 'return') => {
    const query = type ? `?type=${type}` : '';
    return api.get<BasicResponse>(`/api/librarian/get_requests.php${query}`);
  },

  // Approve borrow request
  approveBorrowRequest: (data: { request_id: number; librarian_email: string }) =>
    api.post<BasicResponse>('/api/librarian/approve_borrow_request.php', data),

  // Approve return request
  approveReturnRequest: (data: { transaction_id: number; librarian_email: string }) =>
    api.post<BasicResponse>('/api/librarian/approve_return_request.php', data),

  // Get transaction history
  getTransactionHistory: (params?: { email?: string; isbn?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return api.get<BasicResponse>(`/api/librarian/get_transaction_history.php${query ? '?' + query : ''}`);
  },

  // Get available copies
  getAvailableCopies: (isbn: string) =>
    api.get<BasicResponse>(`/api/librarian/get_available_copies.php?isbn=${encodeURIComponent(isbn)}`),

  // Manage shelves
  manageShelves: (data: { action: string; [key: string]: any }) =>
    api.post<BasicResponse>('/api/librarian/manage_shelves.php', data),
};
