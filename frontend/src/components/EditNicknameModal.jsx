import { useState } from 'react';
import { updateNickname } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const EditNicknameModal = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [nickname, setNickname] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = nickname.trim();

    if (!trimmed) {
      setError('请输入昵称');
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 50) {
      setError('昵称长度需在 2-50 个字符之间');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await updateNickname(trimmed);
      onSuccess(res.data);
      onClose();
    } catch (err) {
      setError(err.message || '修改失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border">
          <h2 className="text-base font-bold text-text1">修改昵称</h2>
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
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="mb-5">
            <label className="block text-sm font-medium text-text2 mb-2">
              新昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setError('');
              }}
              placeholder="请输入新昵称，2-50个字符"
              maxLength={50}
              className={`w-full px-3 py-2.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                error ? 'border-red-400 bg-red-50' : 'border-warm-border bg-warm-bg/50 focus:bg-white'
              }`}
              autoFocus
            />
            {error && (
              <p className="mt-1.5 text-xs text-red-500">{error}</p>
            )}
            <p className="mt-1.5 text-xs text-text2/60">
              长度 2-50 个字符
            </p>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-warm-border text-text2 hover:bg-warm-bg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary hover:bg-primary-dark text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  保存中
                </>
              ) : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditNicknameModal;
