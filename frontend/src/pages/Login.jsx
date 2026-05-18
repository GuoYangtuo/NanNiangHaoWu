import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/auth';
import { SITE_NAME } from '../utils/constants';

const Login = () => {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.username.trim() || !form.password) {
      setError('请填写用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const res = await login(form);
      authLogin(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/favicon.png"
            alt="Logo"
            className="w-16 h-16 mx-auto rounded-2xl object-cover mb-4"
          />
          <h1 className="text-2xl font-bold text-text1">{SITE_NAME}</h1>
          <p className="text-text2 mt-1">欢迎回来~</p>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text1 mb-1.5">
                用户名 / 邮箱
              </label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="请输入用户名或邮箱"
                className="w-full px-4 py-3 border border-warm-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text1 mb-1.5">
                密码
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="请输入密码"
                className="w-full px-4 py-3 border border-warm-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </div>

          <p className="text-sm text-text2 text-center mt-6">
            还没有账号？{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              立即注册
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
