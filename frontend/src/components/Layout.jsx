import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SITE_NAME } from '../utils/constants';
import { useState, useRef } from 'react';

const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
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
    </div>
  );
};

export default Layout;
