import api from './index';

export const getCategories = () => {
  return api.get('/categories');
};

export const createCategory = (data) => {
  return api.post('/categories', data);
};

export const getLockStatus = () => {
  return api.get('/categories/lock-status');
};

export const getAdminLockConfig = () => {
  return api.get('/categories/admin/lock-config');
};

export const updateAdminLock = (lockedIds) => {
  return api.put('/categories/admin/lock', { lockedIds });
};

export const randomizeAdminLock = (count) => {
  return api.post('/categories/admin/lock/randomize', { count });
};

export const updateAdminRandomSchedule = (schedule) => {
  return api.put('/categories/admin/random-schedule', schedule);
};
