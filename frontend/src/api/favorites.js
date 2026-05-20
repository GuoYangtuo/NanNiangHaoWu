import api from './index';

export const getFavorites = (params) => api.get('/favorites', { params });
export const checkFavorites = (productIds) =>
  api.get('/favorites/check', { params: { product_ids: productIds.join(',') } });
export const addFavorite = (productId) => api.post('/favorites', { product_id: productId });
export const removeFavorite = (productId) => api.delete(`/favorites/${productId}`);
