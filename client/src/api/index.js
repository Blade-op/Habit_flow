import axios from 'axios';

// In dev: Vite proxies /api → http://localhost:5000 (see vite.config.js)
// In prod: VITE_API_URL is set to your deployed backend URL
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ht_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Habits ──
export const getHabits  = () => api.get('/habits').then((r) => r.data);
export const createHabit = (data) => api.post('/habits', data).then((r) => r.data);
export const updateHabit = (id, data) => api.put(`/habits/${id}`, data).then((r) => r.data);
export const deleteHabit = (id) => api.delete(`/habits/${id}`).then((r) => r.data);

// ── Tracking ──
export const getTracking = (startDate, endDate) =>
  api.get(`/track?startDate=${startDate}&endDate=${endDate}`).then((r) => r.data);

/**
 * Set the status of a habit on a specific date.
 * @param {string} habitId
 * @param {string} date  YYYY-MM-DD
 * @param {string} status  'completed' | 'missed' | 'skipped'
 */
export const setTrackingStatus = (habitId, date, status) =>
  api.post('/track', { habitId, date, status }).then((r) => r.data);

/**
 * Legacy alias — kept so any code that still calls toggleTracking still works.
 * Maps the old boolean `completed` param to the new status enum.
 */
export const toggleTracking = (habitId, date, completed) =>
  setTrackingStatus(habitId, date, completed ? 'completed' : 'missed');

/**
 * Mark all provided habits as skipped for a given date (day-level skip).
 * @param {string} date  YYYY-MM-DD
 * @param {string[]} habitIds
 */
export const skipDay = (date, habitIds) =>
  api.post('/track/skip-day', { date, habitIds }).then((r) => r.data);

// ── Analytics ──
export const getAnalytics = () => api.get('/analytics').then((r) => r.data);

// ── Auth ──
export const register = (data) => api.post('/auth/register', data).then((r) => r.data);
export const login    = (data) => api.post('/auth/login', data).then((r) => r.data);

// ── Admin ──
export const getAdminUsers = () => api.get('/admin/users').then((r) => r.data);
export const makeAdmin     = (id) => api.patch(`/admin/users/${id}/make-admin`).then((r) => r.data);
export const removeAdmin   = (id) => api.patch(`/admin/users/${id}/remove-admin`).then((r) => r.data);

export default api;
