import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CategoryTree from '../components/CategoryTree';
import MobileCategoryDropdown from '../components/MobileCategoryDropdown';
import Waterfall from '../components/Waterfall';
import ProductEditModal from '../components/ProductEditModal';
import { useCategories } from '../hooks/useCategories';
import { getProducts } from '../api/product';
import { submitContentEdit } from '../api/product';
import { useAuth } from '../context/AuthContext';

const findFolderById = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id && node.type === 'folder') {
      return node;
    }
    if (node.children) {
      const found = findFolderById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

const findLeafById = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id && node.type === 'leaf') {
      return node;
    }
    if (node.children) {
      const found = findLeafById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

const STORAGE_KEY = 'home_state_v1';

const loadState = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const Home = () => {
  const { user, isAdmin, isActiveMember } = useAuth();
  const init = loadState();
  const [selectedCategory, setSelectedCategory] = useState(init.selectedCategory ?? null);
  const [products, setProducts] = useState(init.products ?? []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(init.page ?? 1);
  const [hasMore, setHasMore] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState(init.searchKeyword ?? '');
  const { categories, lockedIds } = useCategories();
  const isSubscribed = isActiveMember;
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editModalProduct, setEditModalProduct] = useState(null);

  // Persist state to sessionStorage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        selectedCategory,
        products,
        page,
        searchKeyword,
      }));
    } catch {
      // Silently ignore storage errors (quota exceeded, etc.)
    }
  }, [selectedCategory, products, page, searchKeyword]);

  const selectedFolder = selectedCategory ? findFolderById(categories, selectedCategory) : null;
  const selectedFolderContent = selectedFolder?.content || null;
  const isLeafSelected = selectedCategory && !selectedFolderContent;

  const selectedLeaf = selectedCategory ? findLeafById(categories, selectedCategory) : null;
  const subtitle = selectedLeaf?.content || '发现值得入手的好物，一起抄作业吧~';

  const fetchProducts = useCallback(async (categoryId, pageNum, append = false) => {
    setLoading(true);
    try {
      const params = {
        page: pageNum,
        limit: 12
      };
      if (categoryId) {
        params.category_id = categoryId;
      }
      if (searchKeyword.trim()) {
        params.keyword = searchKeyword.trim();
      }

      const res = await getProducts(params);

      if (append) {
        setProducts(prev => [...prev, ...res.data.products]);
      } else {
        setProducts(res.data.products);
      }

      setHasMore(res.data.pagination.page < res.data.pagination.totalPages);
    } catch (err) {
      console.error('获取商品失败:', err);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword]);

  useEffect(() => {
    setPage(1);
    fetchProducts(isLeafSelected ? selectedCategory : null, 1, false);
  }, [selectedCategory, searchKeyword, fetchProducts, isLeafSelected]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(selectedCategory, nextPage, true);
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleEditClick = () => {
    if (!user) {
      alert('请先登录后再改进此文案');
      return;
    }
    setEditContent(selectedFolderContent || '');
    setEditError('');
    setEditModalOpen(true);
  };

  const handleEditProduct = useCallback((product) => {
    setEditModalProduct(product);
  }, []);

  const handleEditSuccess = useCallback(() => {
    setPage(1);
    fetchProducts(selectedCategory, 1, false);
  }, [fetchProducts, selectedCategory]);

  const handleEditSubmit = async () => {
    if (!editContent.trim()) {
      setEditError('内容不能为空');
      return;
    }
    setEditSubmitting(true);
    setEditError('');
    try {
      const res = await submitContentEdit(selectedCategory, editContent.trim());
      if (res.data?.autoApproved) {
        // Force categories hook to refetch by dispatching a custom event
        window.dispatchEvent(new Event('categories-updated'));
      } else {
        alert('改进申请已提交，等待管理员审核！');
      }
      setEditModalOpen(false);
    } catch (err) {
      setEditError(err.message || '提交失败，请稍后重试');
    } finally {
      setEditSubmitting(false);
    }
  };

  const flattenCategories = (nodes, ancestors = []) => {
    const result = [];
    for (const node of nodes) {
      const path = [...ancestors, node.name];
      if (node.type === 'leaf') {
        result.push({ id: node.id, label: path.join(' / '), name: node.name });
      } else if (node.children) {
        result.push(...flattenCategories(node.children, path));
      }
    }
    return result;
  };

  const flatCategories = categories.length > 0 ? flattenCategories(categories) : [];

  const selectedName = selectedCategory
    ? flatCategories.find((c) => c.id === selectedCategory)?.name || null
    : null;

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* 左侧分类栏 */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-warm-border hidden md:block sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
        <div className="py-4">
          <h2 className="px-4 text-xs font-semibold text-text2 uppercase tracking-wider mb-2">
            分类浏览
          </h2>
          <CategoryTree selectedId={selectedCategory} onSelect={handleCategorySelect} />
        </div>
      </aside>

      {/* 右侧主内容 */}
      <div className="flex-1 px-2 py-6 sm:px-4 md:px-8">
        {/* 移动端分类选择 */}
        <div className="md:hidden mb-4">
          <MobileCategoryDropdown selectedId={selectedCategory} onSelect={handleCategorySelect} />
        </div>

        {/* 页面标题 — markdown 模式下隐藏 */}
        {!selectedFolderContent && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text1">
              {selectedName || '好物推荐'}
            </h1>
            <p className="text-text2 mt-1 text-sm">
              {subtitle}
            </p>
          </div>
        )}

        {/* 主内容区域 */}
        {selectedCategory && lockedIds.includes(selectedCategory) && !isSubscribed && !isAdmin ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text1 mb-2">此类目的内容已被锁定</h2>
            <p className="text-text2 text-sm mb-6 max-w-sm">
              每个月会随机锁定几个类目，付费订阅或上传三个好物即可成为会员并查看内容
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors"
            >
              登录 / 订阅
            </button>
          </div>
        ) : selectedFolderContent ? (
          <div className="bg-white rounded-xl border border-warm-border p-6 md:p-8 shadow-sm relative">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-text1 mt-6 mb-3 first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-bold text-text1 mt-6 mb-3 first:mt-0">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold text-text1 mt-4 mb-2">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-text2 leading-relaxed mb-3">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-text2 mb-3 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-text2 mb-3 space-y-1">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-text1">{children}</strong>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto mb-3">
                    <table className="min-w-full border-collapse border border-warm-border text-sm">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-primary-light/30">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="border border-warm-border px-3 py-2 text-left font-semibold text-text1">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="border border-warm-border px-3 py-2 text-text2">{children}</td>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-4 italic text-text2 my-3">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-primary-light/30 text-primary px-1.5 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                ),
              }}
            >
              {selectedFolderContent}
            </ReactMarkdown>
            {/* 右下角改进文案按钮 */}
            <button
              onClick={handleEditClick}
              className="absolute bottom-6 right-6 flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-primary/80 hover:bg-primary border border-primary/20 hover:border-primary rounded-lg transition-colors shadow-sm"
              title="改进此文案"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              改进此文案
            </button>
          </div>
        ) : (
          <Waterfall
            products={products}
            loading={loading}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            onEdit={isAdmin ? handleEditProduct : undefined}
          />
        )}

        {/* 文案编辑弹窗 */}
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border">
                <h2 className="text-base font-bold text-text1">帮助改进此篇经验分享帖</h2>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-warm-bg text-text2 hover:text-text1 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <label className="block text-sm font-medium text-text1 mb-2">
                  分类：{selectedFolder?.name}
                </label>
                <p className="text-xs text-text2 mb-3">
                  {isAdmin
                    ? '管理员可直接更新内容，无需审核。'
                    : '请使用 Markdown 语法编辑内容。提交后需管理员审核，通过后内容将更新到首页。'}
                </p>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={16}
                  className={`w-full px-4 py-3 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 transition-colors resize-none ${
                    editError ? 'border-red-400' : 'border-warm-border'
                  }`}
                  placeholder="请输入 Markdown 格式的内容..."
                />
                {editError && <p className="mt-2 text-xs text-red-500">{editError}</p>}
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-warm-border">
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="px-5 py-2 text-sm border border-warm-border rounded-lg text-text2 hover:bg-warm-bg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={editSubmitting}
                  className="px-5 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  {editSubmitting ? '提交中...' : isAdmin ? '直接更新' : '提交审核'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 商品编辑弹窗 */}
        {editModalProduct && (
          <ProductEditModal
            product={editModalProduct}
            onClose={() => setEditModalProduct(null)}
            onSuccess={handleEditSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default Home;
