import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminProducts, verifyProduct, deleteAdminProduct } from '../api/admin';
import { getAdminUsers, updateUserStatus } from '../api/admin';
import { getAdminContentEdits, verifyContentEdit } from '../api/admin';
import { STATUS_COLORS } from '../utils/constants';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('review');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [contentEdits, setContentEdits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const tabs = [
    { id: 'review', label: '商品审核', badge: null },
    { id: 'users', label: '用户管理', badge: null },
    { id: 'products', label: '商品管理', badge: null },
    { id: 'content-edits', label: '文案改进', badge: null }
  ];

  // 获取待审核商品
  const fetchPendingProducts = async () => {
    setLoading(true);
    try {
      const res = await getAdminProducts({ status: 'pending', limit: 50 });
      setProducts(res.data.products);
    } catch (err) {
      console.error('获取待审核商品失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 获取所有用户
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getAdminUsers({ limit: 50 });
      setUsers(res.data.users);
    } catch (err) {
      console.error('获取用户列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 获取所有商品
  const fetchAllProducts = async () => {
    setLoading(true);
    try {
      const res = await getAdminProducts({ limit: 50 });
      setProducts(res.data.products);
    } catch (err) {
      console.error('获取商品列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 获取文案改进申请
  const fetchContentEdits = async () => {
    setLoading(true);
    try {
      const res = await getAdminContentEdits({ limit: 50 });
      setContentEdits(res.data.contentEdits);
    } catch (err) {
      console.error('获取文案改进列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'review') {
      fetchPendingProducts();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'products') {
      fetchAllProducts();
    } else if (activeTab === 'content-edits') {
      fetchContentEdits();
    }
  }, [activeTab]);

  // 审核商品
  const handleVerify = async (productId, status) => {
    if (!confirm(`确定要${status === 'approved' ? '通过' : '拒绝'}这个推荐吗？`)) return;

    setActionLoading(productId);
    try {
      await verifyProduct(productId, status);
      // 从列表中移除（审核）或更新状态
      if (status === 'approved' || status === 'rejected') {
        setProducts(products.filter((p) => p.id !== productId));
      }
      alert(status === 'approved' ? '已通过审核' : '已拒绝');
    } catch (err) {
      alert(err.message || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 删除商品
  const handleDeleteProduct = async (productId) => {
    if (!confirm('确定要删除这个商品吗？此操作不可撤销。')) return;

    setActionLoading(productId);
    try {
      await deleteAdminProduct(productId);
      setProducts(products.filter((p) => p.id !== productId));
      alert('删除成功');
    } catch (err) {
      alert(err.message || '删除失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 更新用户状态
  const handleUpdateUserStatus = async (userId, newStatus) => {
    const action = newStatus === 'banned' ? '封禁' : '激活';
    if (!confirm(`确定要${action}这个用户吗？`)) return;

    setActionLoading(userId);
    try {
      await updateUserStatus(userId, newStatus);
      setUsers(users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)));
      alert(`已${action}用户`);
    } catch (err) {
      alert(err.message || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 审核文案改进
  const handleVerifyContentEdit = async (editId, status) => {
    const action = status === 'approved' ? '通过' : '拒绝';
    if (!confirm(`确定要${action}这个文案改进申请吗？${status === 'approved' ? '通过后内容将直接更新到 categories.json。' : ''}`)) return;

    setActionLoading(editId);
    try {
      await verifyContentEdit(editId, status);
      setContentEdits(contentEdits.filter((e) => e.id !== editId));
      alert(`已${action}`);
    } catch (err) {
      alert(err.message || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text1">管理后台</h1>
        <p className="text-text2 mt-1">管理好物推荐和用户账号</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b border-warm-border mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
              activeTab === tab.id
                ? 'text-primary'
                : 'text-text2 hover:text-text1'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-text2">加载中...</p>
            </div>
          </div>
        ) : (
          <>
            {/* 商品审核 Tab */}
            {activeTab === 'review' && (
              <div>
                {products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
                      <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-text2 text-lg">太棒了！</p>
                    <p className="text-text2/60 text-sm mt-1">目前没有待审核的好物推荐</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => (
                      <div key={product.id} className="bg-white rounded-xl shadow-card overflow-hidden">
                        {/* 图片 */}
                        <div className="aspect-[4/3] bg-warm-border">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0].startsWith('/uploads') ? product.images[0] : `/uploads/${product.images[0]}`}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/300x200/F0E8E4/E879A9?text=No+Image';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-warm-border">
                              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* 内容 */}
                        <div className="p-4">
                          <h3 className="text-sm font-medium text-text1 line-clamp-2 mb-2">{product.name}</h3>
                          <p className="text-xs text-text2 mb-3">
                            推荐人：{product.user?.username || '未知'} · {formatDate(product.created_at)}
                          </p>
                          {product.description && (
                            <p className="text-xs text-text2/80 line-clamp-2 mb-3">{product.description}</p>
                          )}

                          {/* 操作按钮 */}
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleVerify(product.id, 'approved')}
                              disabled={actionLoading === product.id}
                              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              通过
                            </button>
                            <button
                              onClick={() => handleVerify(product.id, 'rejected')}
                              disabled={actionLoading === product.id}
                              className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              拒绝
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 用户管理 Tab */}
            {activeTab === 'users' && (
              <div className="bg-white rounded-xl shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-warm-bg">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text2 uppercase tracking-wider">用户</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text2 uppercase tracking-wider">邮箱</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text2 uppercase tracking-wider">角色</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text2 uppercase tracking-wider">状态</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text2 uppercase tracking-wider">注册时间</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text2 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-border">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-warm-bg/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center">
                                <span className="text-primary text-sm font-bold">
                                  {user.username?.charAt(0).toUpperCase() || 'U'}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-text1">{user.username}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-text2">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {user.role === 'admin' ? '管理员' : '用户'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {user.status === 'active' ? '正常' : '已封禁'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-text2">{formatDate(user.created_at)}</td>
                          <td className="px-4 py-3">
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => handleUpdateUserStatus(user.id, user.status === 'active' ? 'banned' : 'active')}
                                disabled={actionLoading === user.id}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                                  user.status === 'active'
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                }`}
                              >
                                {user.status === 'active' ? '封禁' : '激活'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {users.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-text2">暂无用户数据</p>
                  </div>
                )}
              </div>
            )}

            {/* 商品管理 Tab */}
            {activeTab === 'products' && (
              <div className="bg-white rounded-xl shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-warm-bg">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text2 uppercase tracking-wider">商品</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text2 uppercase tracking-wider">分类</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text2 uppercase tracking-wider">推荐人</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text2 uppercase tracking-wider">状态</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text2 uppercase tracking-wider">发布时间</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text2 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-border">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-warm-bg/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-warm-border flex-shrink-0">
                                {product.images && product.images.length > 0 ? (
                                  <img
                                    src={product.images[0].startsWith('/uploads') ? product.images[0] : `/uploads/${product.images[0]}`}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.src = 'https://via.placeholder.com/48/F0E8E4/E879A9?text=?';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-warm-border">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <span className="text-sm font-medium text-text1 line-clamp-1">{product.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-text2">
                            {product.category?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-text2">
                            {product.user?.username || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              STATUS_COLORS[product.status]?.bg || 'bg-gray-100'
                            } ${STATUS_COLORS[product.status]?.text || 'text-gray-600'}`}>
                              {STATUS_COLORS[product.status]?.label || product.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-text2">
                            {formatDate(product.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/product/${product.id}`}
                                className="text-xs px-2 py-1 bg-primary-light/60 text-primary-dark rounded-lg hover:bg-primary-light transition-colors"
                              >
                                查看
                              </Link>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                disabled={actionLoading === product.id}
                                className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {products.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-text2">暂无商品数据</p>
                  </div>
                )}
              </div>
            )}

            {/* 文案改进 Tab */}
            {activeTab === 'content-edits' && (
              <div>
                {contentEdits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
                      <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-text2 text-lg">暂无待审核的文案改进</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contentEdits.map((edit) => (
                      <div key={edit.id} className="bg-white rounded-xl shadow-card overflow-hidden">
                        <div className="px-5 py-4 border-b border-warm-border">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-medium text-text1">{edit.category_name}</h3>
                              <p className="text-xs text-text2 mt-0.5">
                                申请人：{edit.user?.username || '未知'} · {formatDate(edit.created_at)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleVerifyContentEdit(edit.id, 'approved')}
                                disabled={actionLoading === edit.id}
                                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                              >
                                通过
                              </button>
                              <button
                                onClick={() => handleVerifyContentEdit(edit.id, 'rejected')}
                                disabled={actionLoading === edit.id}
                                className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                              >
                                拒绝
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="px-5 py-4 bg-warm-bg/50">
                          <p className="text-xs text-text2 font-medium mb-2">改进后内容预览：</p>
                          <div className="bg-white rounded-lg border border-warm-border p-4 max-h-64 overflow-y-auto">
                            <pre className="text-xs text-text1 whitespace-pre-wrap font-mono leading-relaxed">{edit.new_content}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
