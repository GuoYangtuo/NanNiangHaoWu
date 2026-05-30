import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordByCode, changePasswordByCode, sendForgotPasswordCode, sendChangePasswordCode } from '../api/auth';
import { SITE_NAME } from '../utils/constants';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('change') === '1' ? 'change' : 'forgot';

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const countdownTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    countdownTimer.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validate = () => {
    const errors = {};
    if (mode === 'forgot' && !email.trim()) {
      errors.email = '请输入邮箱地址';
    }
    if (!code.trim() || code.length !== 6) {
      errors.code = '请输入6位验证码';
    }
    if (!password) {
      errors.password = '请输入新密码';
    } else if (password.length < 8) {
      errors.password = '密码长度至少为 8 个字符';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = '两次密码输入不一致';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendCode = async () => {
    setError('');
    if (mode === 'forgot') {
      if (!email.trim()) {
        setFieldErrors({ email: '请输入邮箱地址' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldErrors({ email: '请输入有效的邮箱地址' });
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === 'forgot') {
        await sendForgotPasswordCode(email.trim().toLowerCase());
      } else {
        await sendChangePasswordCode();
      }
      startCountdown();
    } catch (err) {
      setError(err.message || '发送失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'forgot') {
        await resetPasswordByCode({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          password
        });
      } else {
        await changePasswordByCode({
          code: code.trim(),
          newPassword: password
        });
      }
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      navigate('/login');
    } catch (err) {
      setError(err.message || '操作失败，请稍后重试');
      setLoading(false);
    }
  };

  const handleCodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    if (fieldErrors.code) setFieldErrors({ ...fieldErrors, code: '' });
  };

  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/favicon.png"
            alt="Logo"
            className="w-16 h-16 mx-auto rounded-2xl object-cover mb-4"
          />
          <h1 className="text-2xl font-bold text-text1">{SITE_NAME}</h1>
          <p className="text-text2 mt-1">
            {mode === 'forgot' ? '记密码了吗？可爱捏~' : '修改密码'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-8">
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>修改密码后将自动登出所有已登录设备，请使用新密码重新登录。</span>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <p className="text-sm text-text2 mb-6 leading-relaxed">
            {mode === 'forgot'
              ? '输入邮箱和验证码，设置您的新密码'
              : '输入验证码和新密码'}
          </p>

          <div className="space-y-4">
            {mode === 'forgot' && (
              <div>
                <label className="block text-sm font-medium text-text1 mb-1.5">邮箱地址</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' }); }}
                  placeholder="请输入注册邮箱"
                  className={`w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-colors ${
                    fieldErrors.email ? 'border-red-400' : 'border-warm-border'
                  }`}
                />
                {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text1 mb-1.5">验证码</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="请输入6位验证码"
                  maxLength={6}
                  className={`flex-1 px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-colors ${
                    fieldErrors.code ? 'border-red-400' : 'border-warm-border'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading || countdown > 0}
                  className="px-4 py-3 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {loading ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
              {fieldErrors.code && <p className="mt-1 text-xs text-red-500">{fieldErrors.code}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text1 mb-1.5">新密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' }); }}
                placeholder="设置新密码（至少8个字符）"
                className={`w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-colors ${
                  fieldErrors.password ? 'border-red-400' : 'border-warm-border'
                }`}
              />
              {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text1 mb-1.5">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: '' }); }}
                placeholder="再次输入新密码"
                className={`w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-colors ${
                  fieldErrors.confirmPassword ? 'border-red-400' : 'border-warm-border'
                }`}
              />
              {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-60 mt-6"
            >
              {loading ? '提交中...' : '确认修改'}
            </button>
          </div>

          <p className="text-sm text-text2 text-center mt-6">
            <Link to="/login" className="text-primary hover:underline font-medium">
              返回登录
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
