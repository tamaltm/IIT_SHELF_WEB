import { api } from './client';

type BasicResponse = { success: boolean; message?: string } & Record<string, any>;

export const booksApi = {
  // Get books with optional filters
  getBooks: (params?: {
    search?: string;
    category?: string;
    course_id?: string;
    semester?: string;
    availability?: string;
    book_type?: string;
  }) => {
    const query = new URLSearchParams(params as any).toString();
    return api.get<BasicResponse>(`/api/books/get_books.php${query ? '?' + query : ''}`);
  },

  // Get book status and availability
  getBookStatus: (isbn: string) =>
    api.get<BasicResponse>(`/api/books/get_book_status.php?isbn=${encodeURIComponent(isbn)}`),

  // Get categories
  getCategories: () =>
    api.get<BasicResponse>('/api/books/get_categories.php'),

  // Request a book (for digital resources)
  requestBook: (data: any) =>
    api.post<BasicResponse>('/api/books/request_book.php', data),

  // Reserve a book
  reserveBook: (isbn: string, user_email: string) =>
    api.post<BasicResponse>('/api/books/reserve_book.php', { isbn, user_email }),

  // Cancel reservation
  cancelReservation: (reservation_id: number) =>
    api.post<BasicResponse>('/api/books/cancel_reservation.php', { reservation_id }),

  // Get user reservations
  getUserReservations: (email: string) =>
    api.get<BasicResponse>(`/api/books/get_user_reservations.php?email=${encodeURIComponent(email)}`),

  // Add book (librarian only)
  addBook: (data: any) =>
    api.post<BasicResponse>('/api/books/add_book.php', data),

  // Update book
  updateBook: (data: any) =>
    api.post<BasicResponse>('/api/books/update_book.php', data),

  // Delete book
  deleteBook: (isbn: string) =>
    api.post<BasicResponse>('/api/books/delete_book.php', { isbn }),

  // Get book addition request details
  getRequestDetails: (requestId: number) =>
    api.get<BasicResponse>(`/api/books/get_request_details.php?request_id=${requestId}`),

  // Approve book addition request
  approveRequest: (requestId: number) =>
    api.post<BasicResponse>('/api/books/approve_request.php', { request_id: requestId }),

  // Decline book addition request
  declineRequest: (requestId: number, reason?: string) =>
    api.post<BasicResponse>('/api/books/decline_request.php', { request_id: requestId, reason }),
};
