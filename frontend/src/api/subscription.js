import api from './index';

export const getSubscriptionStatus = () => {
  return api.get('/subscription/status');
};

export const subscribe = () => {
  return api.post('/subscription/subscribe');
};

export const cancelSubscription = () => {
  return api.post('/subscription/cancel');
};
