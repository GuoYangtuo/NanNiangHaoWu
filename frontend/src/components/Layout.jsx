import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SITE_NAME } from '../utils/constants';

const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
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
                  <Link
                    to="/upload"
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                  >
                    上传好物
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                        location.pathname === '/admin'
                          ? 'bg-primary-light text-primary-dark'
                          : 'text-text2 hover:text-primary hover:bg-primary-light/50'
                      }`}
                    >
                      管理后台
                    </Link>
                  )}
                  <div className="flex items-center gap-2 pl-3 border-l border-warm-border">
                    <span className="text-sm text-text2 hidden sm:block">
                      {user.username}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="text-sm text-text2 hover:text-red-500 transition-colors"
                    >
                      退出
                    </button>
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
