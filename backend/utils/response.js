const formatResponse = (res, statusCode, data = null, message = '') => {
  const response = {
    success: statusCode < 400
  };

  if (message) {
    response.message = message;
  }

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

const success = (res, data = null, message = '') => {
  return formatResponse(res, 200, data, message);
};

const created = (res, data = null, message = '创建成功') => {
  return formatResponse(res, 201, data, message);
};

const badRequest = (res, message = '请求参数错误') => {
  return formatResponse(res, 400, null, message);
};

const unauthorized = (res, message = '未授权，请先登录') => {
  return formatResponse(res, 401, null, message);
};

const forbidden = (res, message = '权限不足') => {
  return formatResponse(res, 403, null, message);
};

const notFound = (res, message = '资源不存在') => {
  return formatResponse(res, 404, null, message);
};

const serverError = (res, message = '服务器内部错误') => {
  return formatResponse(res, 500, null, message);
};

const conflict = (res, message = '资源冲突') => {
  return formatResponse(res, 409, null, message);
};

module.exports = {
  success,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  conflict
};
