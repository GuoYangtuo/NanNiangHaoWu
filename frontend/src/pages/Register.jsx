import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendRegisterCode, verifyRegister } from '../api/auth';
import { SITE_NAME } from '../utils/constants';

const Register = () => {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [step, setStep] = useState(1); // 1=填写信息, 2=输入验证码
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [code, setCode] = useState('');
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

  const validateForm = () => {
    const errors = {};

    if (!form.username.trim()) {
      errors.username = '请输入用户名';
    } else if (form.username.length < 2 || form.username.length > 50) {
      errors.username = '用户名长度需在 2-50 个字符之间';
    }

    if (!form.email.trim()) {
      errors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = '请输入有效的邮箱地址';
    }

    if (!form.password) {
      errors.password = '请输入密码';
    } else if (form.password.length < 8) {
      errors.password = '密码长度至少为 8 个字符';
    }

    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = '两次密码输入不一致';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: '' });
    }
  };

  const handleCodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    if (fieldErrors.code) setFieldErrors({ ...fieldErrors, code: '' });
  };

  const handleSendCode = async () => {
    if (!form.email.trim()) {
      setFieldErrors({ email: '请输入邮箱地址' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setFieldErrors({ email: '请输入有效的邮箱地址' });
      return;
    }

    setError('');
    setLoading(true);
    try {
      await sendRegisterCode({
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password
      });
      setStep(2);
      startCountdown();
    } catch (err) {
      setError(err.message || '发送验证码失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!code.trim() || code.length !== 6) {
      setFieldErrors({ code: '请输入6位验证码' });
      return;
    }

    setLoading(true);
    try {
      const res = await verifyRegister({
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        code: code.trim()
      });
      authLogin(res.data.token, res.data.user);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      navigate('/');
    } catch (err) {
      setError(err.message || '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);
    try {
      await sendRegisterCode({
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password
      });
      startCountdown();
    } catch (err) {
      setError(err.message || '发送失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: 填写注册信息
  if (step === 1) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img
              src="/favicon.png"
              alt="Logo"
              className="w-16 h-16 mx-auto rounded-2xl object-cover mb-4"
            />
            <h1 className="text-2xl font-bold text-text1">{SITE_NAME}</h1>
            <p className="text-text2 mt-1">加入社区，一起分享女装经验吧~</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSendCode(); }} className="bg-white rounded-2xl shadow-card p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text1 mb-1.5">
                  用户名
                </label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="设置用户名（2-50个字符）"
                  className={`w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-colors ${
                    fieldErrors.username ? 'border-red-400' : 'border-warm-border'
                  }`}
                />
                {fieldErrors.username && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.username}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text1 mb-1.5">
                  邮箱
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="请输入邮箱地址"
                  className={`w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-colors ${
                    fieldErrors.email ? 'border-red-400' : 'border-warm-border'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
                )}
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
                  placeholder="设置密码（至少8个字符）"
                  className={`w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-colors ${
                    fieldErrors.password ? 'border-red-400' : 'border-warm-border'
                  }`}
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text1 mb-1.5">
                  确认密码
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="再次输入密码"
                  className={`w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-colors ${
                    fieldErrors.confirmPassword ? 'border-red-400' : 'border-warm-border'
                  }`}
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-60 mt-6"
              >
                {loading ? '发送验证码...' : '注册'}
              </button>
            </div>

            <p className="text-sm text-text2 text-center mt-6">
              已有账号？{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                立即登录
              </Link>
            </p>
          </form>
        </div>
      </div>
    );
  }

  // Step 2: 输入验证码
  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/favicon.png"
            alt="Logo"
            className="w-16 h-16 mx-auto rounded-2xl object-cover mb-4"
          />
          <h1 className="text-2xl font-bold text-text1">{SITE_NAME}</h1>
          <p className="text-text2 mt-1">验证您的邮箱</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-text1">
              验证码已发送至 <span className="font-bold text-primary">{form.email}</span>
            </p>
            <p className="text-xs text-text2 mt-1">请查收邮件并输入验证码完成注册</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text1 mb-1.5">
                邮箱验证码
              </label>
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
                  onClick={handleResendCode}
                  disabled={loading || countdown > 0}
                  className="px-4 py-3 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {loading ? '发送中...' : countdown > 0 ? `${countdown}s` : '重新获取'}
                </button>
              </div>
              {fieldErrors.code && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.code}</p>
              )}
              <p className="mt-1 text-xs text-text2">验证码10分钟内有效</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-60 mt-6"
            >
              {loading ? '注册中...' : '完成注册'}
            </button>

            <button
              type="button"
              onClick={() => { setStep(1); setCode(''); setFieldErrors({}); }}
              className="w-full py-3 bg-warm-bg hover:bg-warm-border text-text2 font-medium rounded-lg transition-colors"
            >
              返回修改信息
            </button>
          </div>

          <p className="text-sm text-text2 text-center mt-6">
            已有账号？{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              立即登录
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
