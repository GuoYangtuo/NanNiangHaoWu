import { useState, useEffect } from 'react';
import { getSubscriptionStatus, subscribe, cancelSubscription } from '../api/subscription';

export const SubscriptionModal = ({ onClose, onSubscribed }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await getSubscriptionStatus();
      setStatus(res.data);
    } catch {
      setMessage('加载状态失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    setMessage('');
    try {
      const res = await subscribe();
      setStatus(res.data);
      setMessage(res.message || '订阅成功！');
      if (onSubscribed) onSubscribed(res.data);
    } catch (err) {
      setMessage(err.message || '订阅失败，请重试');
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('确定要取消订阅吗？')) return;
    setSubscribing(true);
    try {
      await cancelSubscription();
      await loadStatus();
      setMessage('已取消订阅');
    } catch (err) {
      setMessage(err.message || '取消失败');
    } finally {
      setSubscribing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '无';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border">
          <h2 className="text-base font-bold text-text1">会员订阅</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-warm-bg text-text2 hover:text-text1 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* 会员卡片 */}
              <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark p-5 text-white mb-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-base">
                      {status?.is_active_member ? '已开通会员' : '开通会员'}
                    </p>
                    <p className="text-xs text-white/80">
                      {status?.is_active_member
                        ? `有效期至 ${formatDate(status.expires_at)}`
                        : '解锁全部付费内容'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 权益说明 */}
              <div className="space-y-2.5 mb-5">
                {[
                  '解锁所有付费分类内容',
                  '每月会随机锁定部分分类',
                  '每审核通过3个商品获得一个月会员',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm text-text2">{item}</span>
                  </div>
                ))}
              </div>

              {/* 订阅按钮 / 续费 */}
              {status?.is_active_member ? (
                <div className="space-y-2">
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                  >
                    {subscribing ? '处理中...' : '立即续费'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={subscribing}
                    className="w-full py-2 text-sm text-text2 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    取消订阅
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="w-full py-3 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
                >
                  {subscribing ? '订阅中...' : `立即订阅 ¥${status?.price || 9.9}/月`}
                </button>
              )}

              {message && (
                <p className={`mt-3 text-sm text-center ${message.includes('成功') ? 'text-green-600' : 'text-red-500'}`}>
                  {message}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
