import { useState, useEffect, useCallback } from 'react';
import CategoryTree from '../components/CategoryTree';
import Waterfall from '../components/Waterfall';
import { getProducts } from '../api/product';
import { CATEGORY_TREE } from '../utils/constants';

const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');

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
            <optgroup label="小裙子">
              <option value="lolita">Lolita 小裙子</option>
              <option value="jk">JK 制服</option>
              <option value="soft-girl">软妹服 / 日常可爱风</option>
              <option value="hanfu">漢服 / 漢元素</option>
            </optgroup>
            <optgroup label="化妆品">
              <option value="foundation">底妆</option>
              <option value="eye-makeup">眼妆</option>
              <option value="lip-makeup">唇妆</option>
              <option value="nail">指甲油 / 美甲</option>
            </optgroup>
            <optgroup label="洗护用品">
              <option value="body-care">沐浴露 / 身体乳</option>
              <option value="hair-care">洗发护发</option>
              <option value="oral-care">口腔护理</option>
            </optgroup>
            <optgroup label="大码女装">
              <option value="plus-dress">连衣裙</option>
              <option value="plus-top">上装</option>
              <option value="plus-bottom">下装</option>
            </optgroup>
            <optgroup label="饰品">
              <option value="hair-accessories">发饰</option>
              <option value="earrings">耳饰</option>
              <option value="necklace-bracelet">项链 / 手链</option>
            </optgroup>
            <optgroup label="情趣玩具">
              <option value="vibrators">按摩棒 / 跳蛋</option>
              <option value="lingerie">情趣内衣</option>
              <option value="lubes">润滑液 / 辅助用品</option>
            </optgroup>
          </select>
        </div>

        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text1">
            {selectedCategory
              ? (() => {
                  const findCategory = (items) => {
                    for (const item of items) {
                      if (item.id === selectedCategory) return item.name;
                      if (item.children) {
                        const found = findCategory(item.children);
                        if (found) return found;
                      }
                    }
                    return null;
                  };
                  return findCategory(CATEGORY_TREE) || '商品列表';
                })()
              : '好物推荐'}
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
