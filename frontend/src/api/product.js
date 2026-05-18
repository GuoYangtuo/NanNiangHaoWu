import api from './index';

export const getProducts = (params) => {
  return api.get('/products', { params });
};

export const getProductById = (id) => {
  return api.get(`/products/${id}`);
};

export const createProduct = (formData) => {
  return api.post('/products', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const updateProduct = (id, formData) => {
  return api.put(`/products/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const deleteProduct = (id) => {
  return api.delete(`/products/${id}`);
};

export const submitContentEdit = (category_id, new_content) => {
  return api.post('/categories/content-edits', { category_id, new_content });
};
