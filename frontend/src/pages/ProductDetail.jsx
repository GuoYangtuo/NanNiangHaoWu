import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../api/product';
import { addFavorite, removeFavorite } from '../api/favorites';
import { useAuth } from '../context/AuthContext';
import ProductEditModal from '../components/ProductEditModal';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editModalProduct, setEditModalProduct] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);

  const isAdmin = user?.role === 'admin';

  const fetchProduct = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getProductById(id);
      setProduct(res.data);
    } catch (err) {
      setError(err.message || '获取商品详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    if (product && user) {
      import('../api/favorites').then(({ checkFavorites }) => {
        checkFavorites([product.id])
          .then(res => setIsFavorited(res.data.favorite_ids.includes(product.id)))
          .catch(() => {});
      });
    } else if (!user) {
      setIsFavorited(false);
    }
  }, [product, user]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const handleFavoriteToggle = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    // 乐观更新：先切换状态
    const newState = !isFavorited;
    setIsFavorited(newState);
    try {
      if (newState) {
        await addFavorite(product.id);
      } else {
        await removeFavorite(product.id);
      }
    } catch (err) {
      // 失败则恢复原状态
      setIsFavorited(!newState);
      console.error('收藏操作失败:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text2">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 mb-4 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-text1 mb-2">{error || '商品不存在'}</h2>
        <p className="text-text2 mb-6">可能已被删除或审核未通过</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
        >
          返回首页
        </button>
      </div>
    );
  }

  const images = product.images || [];
  const displayImage = images[currentImageIndex] || 'https://via.placeholder.com/600x400/F0E8E4/E879A9?text=No+Image';
  // images 已经是完整路径，直接使用
  const actualImage = displayImage;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-text2 hover:text-primary transition-colors mb-6"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>返回</span>
      </button>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {/* 图片画廊 */}
        {images.length > 0 ? (
          <div className="relative">
            <div className="aspect-[4/3] bg-warm-border overflow-hidden">
              <img
                src={actualImage}
                alt={product.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/600x400/F0E8E4/E879A9?text=No+Image';
                }}
              />
            </div>

            {/* 图片指示器 */}
            {images.length > 1 && (
              <>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>

                {/* 左右箭头 */}
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors"
                >
                  <svg className="w-5 h-5 text-text1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors"
                >
                  <svg className="w-5 h-5 text-text1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="aspect-[4/3] bg-warm-border flex items-center justify-center">
            <svg className="w-16 h-16 text-warm-border" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* 缩略图列表 */}
        {images.length > 1 && (
          <div className="px-6 py-3 border-b border-warm-border flex gap-2 overflow-x-auto">
            {images.map((img, index) => {
              // images 已经是完整路径
              const imgUrl = img;
              return (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    index === currentImageIndex ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`缩略图 ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/64/F0E8E4/E879A9?text=?';
                    }}
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* 商品信息 */}
        <div className="p-6 md:p-8">
          {/* 标题和分类 */}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              {product.category && (
                <span className="px-3 py-1 bg-primary-light/60 text-primary-dark text-xs font-medium rounded-full">
                  {product.category.name}
                </span>
              )}
              {isAdmin && (
                <button
                  onClick={() => setEditModalProduct(product)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  编辑
                </button>
              )}
              {user && (
                <button
                  onClick={handleFavoriteToggle}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    isFavorited
                      ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
                      : 'bg-white border-warm-border text-text2 hover:border-red-300 hover:text-red-400'
                  }`}
                  title={isFavorited ? '取消收藏' : '收藏'}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill={isFavorited ? 'currentColor' : 'none'}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {isFavorited ? '已收藏' : '收藏'}
                </button>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-text1">{product.name}</h1>
          </div>

          {/* 推荐人信息 */}
          <div className="flex items-center gap-3 pb-6 border-b border-warm-border">
            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
              <span className="text-primary font-bold">
                {product.user?.username?.charAt(0).toUpperCase() || 'N'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-text1">{product.user?.username || '匿名用户'}</p>
              <p className="text-xs text-text2">推荐于 {formatDate(product.created_at)}</p>
            </div>
          </div>

          {/* 简介 */}
          {product.description && (
            <div className="py-6 border-b border-warm-border">
              <h2 className="text-sm font-semibold text-text1 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                使用感受 / 推荐理由 / 使用方法
              </h2>
              <div className="text-text2 text-sm leading-relaxed whitespace-pre-wrap">
                {product.description}
              </div>
            </div>
          )}

          {/* 购买链接 */}
          {product.purchase_link && (
            <div className="pt-6">
              <h2 className="text-sm font-semibold text-text1 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                参考购买链接
              </h2>
              <a
                href={product.purchase_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
              >
                <span>前往购买</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* 商品编辑弹窗 */}
      {editModalProduct && (
        <ProductEditModal
          product={editModalProduct}
          onClose={() => setEditModalProduct(null)}
          onSuccess={() => {
            fetchProduct();
          }}
        />
      )}
    </div>
  );
};

export default ProductDetail;
