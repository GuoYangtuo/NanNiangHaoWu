import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器：添加 JWT token
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

// 响应拦截器：统一处理错误
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // 处理 401 未授权
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // 只有在不是登录页面时才跳转
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }

      // 返回统一格式的错误信息
      const message = data?.message || '请求失败，请稍后重试';
      return Promise.reject(new Error(message));
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('请求超时，请检查网络连接'));
    }

    return Promise.reject(new Error('网络错误，请检查网络连接'));
  }
);

export default api;
