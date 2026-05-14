import api from './index';

export const getCategories = () => {
  return api.get('/categories');
};

export const createCategory = (data) => {
  return api.post('/categories', data);
};
