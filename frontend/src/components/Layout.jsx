import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SITE_NAME } from '../utils/constants';
import { useState, useRef, useEffect } from 'react';
import { getFavorites, removeFavorite } from '../api/favorites';
import { SubscriptionModal } from './SubscriptionModal';
import { ProductReviewStatusModal } from './ProductReviewStatusModal';

const Layout = () => {
  const { user, logout, isAdmin, isActiveMember, fetchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [favoritesModalOpen, setFavoritesModalOpen] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [reviewStatusModalOpen, setReviewStatusModalOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const hideTimer = useRef(null);

  const handleMouseEnter = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setMenuOpen(true);
  };

  const handleMouseLeave = () => {
    hideTimer.current = setTimeout(() => setMenuOpen(false), 150);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/');
  };

  const handleMenuItemClick = () => {
    setMenuOpen(false);
  };

  const openFavoritesModal = () => {
    setMenuOpen(false);
    setFavoritesModalOpen(true);
    fetchFavorites();
  };

  const openSubscriptionModal = () => {
    setMenuOpen(false);
    setSubscriptionModalOpen(true);
  };

  const openReviewStatusModal = () => {
    setMenuOpen(false);
    setReviewStatusModalOpen(true);
  };

  const handleSubscribed = async (subData) => {
    await fetchUser();
  };

  const fetchFavorites = async () => {
    setFavoritesLoading(true);
    try {
      const res = await getFavorites({ page: 1, limit: 100 });
      setFavorites(res.data.favorites);
    } catch (err) {
      console.error('获取收藏列表失败:', err);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const handleRemoveFavorite = async (e, productId, favoriteId) => {
    e.stopPropagation();
    // 乐观更新：先从列表移除
    setFavorites(prev => prev.filter(f => f.product_id !== productId));
    try {
      await removeFavorite(productId);
    } catch (err) {
      // 失败则恢复
      fetchFavorites();
      console.error('取消收藏失败:', err);
    }
  };

  const handleRowClick = (productId) => {
    setFavoritesModalOpen(false);
    navigate(`/product/${productId}`);
  };

  useEffect(() => {
    if (!favoritesModalOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') setFavoritesModalOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [favoritesModalOpen]);

  return (
    <div className="min-h-screen bg-warm-bg">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white border-b border-warm-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <img src="/favicon.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-bold text-text1 hidden sm:block">
                {SITE_NAME}
              </span>
            </Link>

            {/* 右侧操作 */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  {/* 用户头像下拉菜单 */}
                  <div
                    className="relative"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* 头像触发器 */}
                    <button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-base select-none">
                        {user.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </button>

                    {/* 下拉菜单 */}
                    {menuOpen && (
                      <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-warm-border py-2 z-50">
                        {/* 用户信息 */}
                        <div className="px-4 py-3 border-b border-warm-border">
                          <p className="text-sm font-semibold text-text1">{user.username}</p>
                          <p className="text-xs text-text2 mt-0.5">{user.email || '用户'}</p>
                          {/* 会员状态 */}
                          <div className="mt-1.5">
                            {isActiveMember ? (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                会员
                              </span>
                            ) : (
                              <button
                                //onClick={openSubscriptionModal}
                                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-warm-bg text-text2 hover:bg-primary/10 hover:text-primary transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                开通会员 {/*¥9.9/月*/}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 菜单项 */}
                        <Link
                          to="/upload"
                          onClick={handleMenuItemClick}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-text2 hover:bg-primary-light/50 hover:text-primary transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          上传好物
                        </Link>

                        <button
                          onClick={openFavoritesModal}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors w-full text-left ${
                            location.pathname === '/favorites'
                              ? 'bg-primary-light/50 text-primary-dark font-medium'
                              : 'text-text2 hover:bg-primary-light/50 hover:text-primary'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          我的收藏
                        </button>

                        <button
                          onClick={openReviewStatusModal}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors w-full text-left ${
                            location.pathname === '/favorites'
                              ? 'bg-primary-light/50 text-primary-dark font-medium'
                              : 'text-text2 hover:bg-primary-light/50 hover:text-primary'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          我的审核
                        </button>

                        {!isActiveMember && (
                          <button
                            //onClick={openSubscriptionModal}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors w-full text-left text-primary hover:bg-primary-light/50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            订阅会员
                          </button>
                        )}

                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={handleMenuItemClick}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                              location.pathname === '/admin'
                                ? 'bg-primary-light/50 text-primary-dark font-medium'
                                : 'text-text2 hover:bg-primary-light/50 hover:text-primary'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            管理后台
                          </Link>
                        )}

                        {/* 退出登录 */}
                        <div className="border-t border-warm-border mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            退出登录
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-text2 hover:text-primary transition-colors"
                  >
                    登录
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm"
                  >
                    注册
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main>
        <Outlet />
      </main>

      {/* 页脚 */}
      <footer className="bg-white border-t border-warm-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-text2">
              &copy; {new Date().getFullYear()} {SITE_NAME} — 亚文化好物推荐社区
            </p>
            <p className="text-xs text-text2/60 mt-2">
              互相抄作业，分享美好生活
            </p>
          </div>
        </div>
      </footer>

      {/* 收藏弹窗 */}
      {favoritesModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setFavoritesModalOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col">
            {/* 弹窗标题 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border flex-shrink-0">
              <h2 className="text-base font-bold text-text1">我收藏的好物</h2>
              <button
                onClick={() => setFavoritesModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-warm-bg text-text2 hover:text-text1 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto">
              {favoritesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <svg className="w-12 h-12 text-warm-border mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                  <p className="text-sm text-text2">还没有收藏任何好物</p>
                </div>
              ) : (
                <ul className="divide-y divide-warm-border">
                  {favorites.map((fav) => {
                    const p = fav.product;
                    if (!p) return null;
                    const firstImage = p.images && p.images.length > 0
                      ? p.images[0]
                      : 'https://via.placeholder.com/64/F0E8E4/E879A9?text=N/A';
                    return (
                      <li
                        key={fav.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-warm-bg/60 cursor-pointer transition-colors group"
                        onClick={() => handleRowClick(p.id)}
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-warm-bg flex-shrink-0">
                          <img
                            src={firstImage}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/64/F0E8E4/E879A9?text=N/A';
                            }}
                          />
                        </div>
                        <p className="flex-1 text-sm font-medium text-text1 line-clamp-2 group-hover:text-primary transition-colors">
                          {p.name}
                        </p>
                        <button
                          onClick={(e) => handleRemoveFavorite(e, p.id, fav.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-full text-text2 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                          title="取消收藏"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 订阅弹窗 */}
      {subscriptionModalOpen && (
        <SubscriptionModal
          onClose={() => setSubscriptionModalOpen(false)}
          onSubscribed={handleSubscribed}
        />
      )}

      {/* 审核状态弹窗 */}
      {reviewStatusModalOpen && (
        <ProductReviewStatusModal
          onClose={() => setReviewStatusModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
