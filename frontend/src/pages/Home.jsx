import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CategoryTree from '../components/CategoryTree';
import Waterfall from '../components/Waterfall';
import { useCategories } from '../hooks/useCategories';
import { getProducts } from '../api/product';

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

const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const { categories } = useCategories();

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
      <div className="flex-1 px-4 py-6 md:px-8">
        {/* 移动端分类选择 */}
        <div className="md:hidden mb-4">
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="w-full px-4 py-2.5 bg-white border border-warm-border rounded-lg text-sm"
          >
            <option value="">全部好物</option>
            {flatCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
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
        {selectedFolderContent ? (
          <div className="bg-white rounded-xl border border-warm-border p-6 md:p-8 shadow-sm">
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
          </div>
        ) : (
          <Waterfall
            products={products}
            loading={loading}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        )}
      </div>
    </div>
  );
};

export default Home;
