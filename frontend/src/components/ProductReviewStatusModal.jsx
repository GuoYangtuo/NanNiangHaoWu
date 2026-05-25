import { useState, useEffect } from 'react';
import { getMyProducts } from '../api/products';

const STATUS_CONFIG = {
  pending: { label: '待审核', dotColor: 'bg-yellow-400', textColor: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  approved: { label: '已通过', dotColor: 'bg-green-500', textColor: 'text-green-600', bgColor: 'bg-green-50' },
  rejected: { label: '未通过', dotColor: 'bg-red-400', textColor: 'text-red-500', bgColor: 'bg-red-50' },
};

export const ProductReviewStatusModal = ({ onClose }) => {
  const [products, setProducts] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getMyProducts({ page: 1, limit: 100 });
      setProducts(res.data.products || []);
      setCounts(res.data.counts || { pending: 0, approved: 0, rejected: 0 });
    } catch {
      console.error('加载商品失败');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = filter === 'all'
    ? products
    : products.filter((p) => p.status === filter);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[75vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border flex-shrink-0">
          <h2 className="text-base font-bold text-text1">我的好物审核状态</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-warm-bg text-text2 hover:text-text1 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 统计卡片 */}
        {!loading && (
          <div className="px-6 py-3 border-b border-warm-border flex-shrink-0">
            <div className="flex gap-3">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <div
                  key={key}
                  className={`flex-1 rounded-lg px-3 py-2 text-center ${cfg.bgColor}`}
                >
                  <p className={`text-lg font-bold ${cfg.textColor}`}>{counts[key] || 0}</p>
                  <p className={`text-xs ${cfg.textColor}`}>{cfg.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-text2/70 mt-2 text-center">
              每审核通过 3 个商品，可获得一个月会员
            </p>
          </div>
        )}

        {/* 筛选标签 */}
        {!loading && products.length > 0 && (
          <div className="px-6 pt-3 pb-1 flex-shrink-0">
            <div className="flex gap-2">
              {[
                { key: 'all', label: `全部 (${products.length})` },
                { key: 'pending', label: `待审核 (${counts.pending || 0})` },
                { key: 'approved', label: `已通过 (${counts.approved || 0})` },
                { key: 'rejected', label: `未通过 (${counts.rejected || 0})` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    filter === key
                      ? 'bg-primary text-white'
                      : 'bg-warm-bg text-text2 hover:bg-primary-light/50 hover:text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 商品列表 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <svg className="w-12 h-12 text-warm-border mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-sm text-text2">
                {filter === 'all' ? '还没有上传任何商品' : `没有${STATUS_CONFIG[filter]?.label}的商品`}
              </p>
              <p className="text-xs text-text2/60 mt-1">去上传好物，有机会获得会员资格</p>
            </div>
          ) : (
            <ul className="divide-y divide-warm-border">
              {filteredProducts.map((product) => {
                const cfg = STATUS_CONFIG[product.status] || STATUS_CONFIG.pending;
                const firstImage = product.images && product.images.length > 0
                  ? product.images[0]
                  : 'https://via.placeholder.com/64/F0E8E4/E879A9?text=N/A';

                return (
                  <li key={product.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-warm-bg flex-shrink-0">
                      <img
                        src={firstImage}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/64/F0E8E4/E879A9?text=N/A';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text1 line-clamp-1">{product.name}</p>
                      <p className="text-xs text-text2/70 mt-0.5">
                        {product.category?.name || product.category_id}
                      </p>
                      <p className="text-xs text-text2/50 mt-0.5">
                        {new Date(product.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <div className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${cfg.bgColor} ${cfg.textColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`}></span>
                      {cfg.label}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
