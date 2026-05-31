import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
};

export const alumniAPI = {
  getMe: () => api.get('/alumni/me'),
  updateMe: (data) => api.put('/alumni/me', data),
  getList: (params) => api.get('/alumni/list', { params }),
  getById: (id) => api.get(`/alumni/${id}`),
  addJobChange: (data) => api.post('/alumni/job-changes', data),
  getFilters: () => api.get('/alumni/stats/filters'),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  sendReminder: (data) => api.post('/admin/send-reminder', data),
  sendBatchReminders: (data) => api.post('/admin/send-batch-reminders', data),
  getReminders: (params) => api.get('/admin/reminders', { params }),
  getAlumniWithoutUpdates: (params) => api.get('/admin/alumni-without-recent-updates', { params }),
  confirmUpdate: (userId) => api.post(`/admin/confirm-update/${userId}`),
};

export const eventsAPI = {
  getList: (params) => api.get('/events', { params }),
  getMyEvents: () => api.get('/events/my'),
  getById: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  register: (id) => api.post(`/events/${id}/register`),
  unregister: (id) => api.delete(`/events/${id}/register`),
  getPending: () => api.get('/events/pending/list'),
  approve: (id) => api.post(`/events/${id}/approve`),
  reject: (id) => api.post(`/events/${id}/reject`),
};

export const circlesAPI = {
  getList: (params) => api.get('/circles', { params }),
  getMyCircles: () => api.get('/circles/my'),
  getById: (id) => api.get(`/circles/${id}`),
  create: (data) => api.post('/circles', data),
  update: (id, data) => api.put(`/circles/${id}`, data),
  delete: (id) => api.delete(`/circles/${id}`),
  join: (id) => api.post(`/circles/${id}/join`),
  leave: (id) => api.delete(`/circles/${id}/leave`),
  createPost: (circleId, content) => api.post(`/circles/${circleId}/posts`, { content }),
  getPost: (circleId, postId) => api.get(`/circles/${circleId}/posts/${postId}`),
  deletePost: (circleId, postId) => api.delete(`/circles/${circleId}/posts/${postId}`),
  addComment: (circleId, postId, content) => api.post(`/circles/${circleId}/posts/${postId}/comments`, { content }),
  deleteComment: (circleId, postId, commentId) => api.delete(`/circles/${circleId}/posts/${postId}/comments/${commentId}`),
};

export const messagesAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getConversation: (userId, params) => api.get(`/messages/conversations/${userId}`, { params }),
  send: (userId, content) => api.post(`/messages/send/${userId}`, { content }),
  getUnreadCount: () => api.get('/messages/unread/count'),
  markRead: (messageId) => api.post(`/messages/mark-read/${messageId}`),
  markAllRead: (userId) => api.post(`/messages/mark-all-read/${userId}`),
  delete: (messageId) => api.delete(`/messages/${messageId}`),
};

export const newsAPI = {
  getList: (params) => api.get('/news', { params }),
  getById: (id) => api.get(`/news/${id}`),
  create: (data) => api.post('/news', data),
  update: (id, data) => api.put(`/news/${id}`, data),
  delete: (id) => api.delete(`/news/${id}`),
  getSources: () => api.get('/news/stats/sources'),
};

export default api;
