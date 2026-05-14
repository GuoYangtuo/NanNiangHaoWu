import api from './index';

export const register = (data) => {
  return api.post('/auth/register', data);
};

export const login = (data) => {
  return api.post('/auth/login', data);
};

export const getCurrentUser = () => {
  return api.get('/auth/me');
};

export const checkEmail = (email) => {
  return api.get('/auth/check-email', { params: { email } });
};
