import api from './index';

export const register = (data) => {
  return api.post('/auth/register', data);
};

export const sendRegisterCode = (data) => {
  return api.post('/auth/register/send-code', data);
};

export const verifyRegister = (data) => {
  return api.post('/auth/register/verify', data);
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

export const updateNickname = (nickname) => {
  return api.put('/auth/nickname', { nickname });
};

export const sendVerifyCode = () => {
  return api.post('/auth/send-verify-code');
};

export const verifyEmail = (code) => {
  return api.post('/auth/verify-email', { code });
};

export const sendForgotPasswordCode = (email) => {
  return api.post('/auth/forgot-password/send-code', { email });
};

export const resetPasswordByCode = (data) => {
  return api.post('/auth/forgot-password/reset', data);
};

export const sendChangePasswordCode = (oldPassword) => {
  return api.post('/auth/change-password/send-code', { oldPassword });
};

export const changePasswordByCode = (data) => {
  return api.post('/auth/change-password/reset', data);
};
