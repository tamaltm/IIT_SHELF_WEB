import { api } from './client';

type BasicResponse = { success: boolean; message?: string } & Record<string, any>;

export const borrowApi = {
  // Request to borrow a book
  requestBorrow: (data: { isbn: string; user_email: string; copy_id?: number | null }) =>
    api.post<BasicResponse>('/api/borrow/request_borrow.php', data),

  // Request to return a book
  requestReturn: (data: { user_email: string; transaction_id: number }) =>
    api.post<BasicResponse>('/api/borrow/request_return.php', data),

  // Get user transactions
  getUserTransactions: (email: string) =>
    api.get<BasicResponse>(`/api/borrow/get_user_transactions.php?email=${encodeURIComponent(email)}`),

  // Direct borrow (if endpoint exists)
  borrowBook: (data: { user_email: string; isbn: string }) =>
    api.post<BasicResponse>('/api/borrow/borrow_book.php', data),

  // Direct return (if endpoint exists)
  returnBook: (data: { transaction_id: number }) =>
    api.post<BasicResponse>('/api/borrow/return_book.php', data),

  // Cancel a pending borrow request
  cancelRequest: (data: { user_email: string; request_id: number }) =>
    api.post<BasicResponse>('/api/borrow/cancel_request.php', data),
};
