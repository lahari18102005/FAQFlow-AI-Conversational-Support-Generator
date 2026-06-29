import axios from 'axios';

export const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = (username, password) => {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  return api.post('/login', params);
};

export const register = (username, password, full_name) => 
  api.post('/register', { username, password, full_name });

export const getSessions = () => api.get('/sessions');

export const createSession = (title) => api.post(`/sessions?title=${encodeURIComponent(title)}`);

export const deleteSession = (sessionId) => api.delete(`/sessions/${sessionId}`);

export const getHistory = (sessionId) => api.get(`/history/${sessionId}`);

export const sendMessage = (sessionId, query) => 
  api.post('/chat', { session_id: sessionId, query });

export const getMe = () => api.get('/me');

export default api;
