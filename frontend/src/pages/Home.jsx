import { useState, useEffect, useCallback } from 'react';
import CategoryTree from '../components/CategoryTree';
import Waterfall from '../components/Waterfall';
import { useCategories } from '../hooks/useCategories';
import { getProducts } from '../api/product';

const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const { categories } = useCategories();

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
    fetchProducts(selectedCategory, 1, false);
  }, [selectedCategory, searchKeyword, fetchProducts]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(selectedCategory, nextPage, true);
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const findCategoryName = (items, id) => {
    for (const item of items) {
      if (item.id === id) return item.name;
      if (item.children) {
        const found = findCategoryName(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedName = selectedCategory
    ? findCategoryName(categories, selectedCategory)
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
            {categories.map((folder) => (
              <optgroup key={folder.id} label={folder.name}>
                {folder.children?.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text1">
            {selectedName || '好物推荐'}
          </h1>
          <p className="text-text2 mt-1 text-sm">
            发现值得推荐的好物，一起抄作业吧~
          </p>
        </div>

        {/* 瀑布流内容 */}
        <Waterfall
          products={products}
          loading={loading}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
        />
      </div>
    </div>
  );
};

export default Home;
