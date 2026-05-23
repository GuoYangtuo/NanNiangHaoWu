import api from './index';

export const getMyProducts = (params = {}) => {
  return api.get('/products/my-products', { params });
};
