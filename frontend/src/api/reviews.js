import api from './index';

export const getProductReviews = (productId, params) => {
  return api.get(`/reviews/product/${productId}`, { params });
};

export const createReview = (data) => {
  return api.post('/reviews', data);
};

export const deleteReview = (id) => {
  return api.delete(`/reviews/${id}`);
};
