import api from './index';

export const getAdminProducts = (params) => {
  return api.get('/admin/products', { params });
};

export const verifyProduct = (id, status) => {
  return api.put(`/admin/products/${id}/verify`, { status });
};

export const deleteAdminProduct = (id) => {
  return api.delete(`/admin/products/${id}`);
};

export const updateAdminProduct = (id, formData) => {
  return api.put(`/admin/products/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const getAdminUsers = (params) => {
  return api.get('/admin/users', { params });
};

export const updateUserStatus = (id, status) => {
  return api.put(`/admin/users/${id}/status`, { status });
};

export const getAdminContentEdits = (params) => {
  return api.get('/admin/content-edits', { params });
};

export const verifyContentEdit = (id, status) => {
  return api.put(`/admin/content-edits/${id}/verify`, { status });
};
