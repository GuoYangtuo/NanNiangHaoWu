import { useState, useEffect, useRef } from 'react';
import ProductCard from './ProductCard';

const Waterfall = ({ products, loading, onLoadMore, hasMore, onEdit }) => {
  const [columns, setColumns] = useState(3);
  const containerRef = useRef(null);

  // 响应式列数
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setColumns(2);
      } else if (width < 1024) {
        setColumns(2);
      } else {
        setColumns(3);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // 瀑布流分组
  const getColumns = () => {
    const cols = Array.from({ length: columns }, () => []);
    const heights = Array(columns).fill(0);

    products.forEach((product, index) => {
      // 找到最短的列
      const minHeightIndex = heights.indexOf(Math.min(...heights));
      cols[minHeightIndex].push({ ...product, originalIndex: index });
      // 估算高度（基于图片比例和内容高度）
      heights[minHeightIndex] += 1;
    });

    return cols;
  };

  const columnData = getColumns();

  return (
    <div ref={containerRef}>
      {loading && products.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-text2">加载中...</p>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 mb-4 rounded-full bg-primary-light/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-text2 text-lg mb-2">暂无好物推荐</p>
          <p className="text-text2/60 text-sm">快来成为第一个分享者吧~</p>
        </div>
      ) : (
        <>
          <div
            className="grid gap-2 sm:gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {columnData.map((column, colIndex) => (
              <div key={colIndex} className="space-y-2 sm:space-y-4">
                {column.map((product) => (
                  <ProductCard key={product.id} product={product} onEdit={onEdit} />
                ))}
              </div>
            ))}
          </div>

          {/* 加载更多 */}
          {products.length > 0 && (
            <div className="mt-8 text-center">
              {hasMore ? (
                <button
                  onClick={onLoadMore}
                  disabled={loading}
                  className="px-6 py-2.5 bg-white border border-warm-border text-text2 hover:border-primary hover:text-primary rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? '加载中...' : '加载更多'}
                </button>
              ) : (
                <p className="text-text2/60 text-sm">— 已经到底啦 —</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Waterfall;
