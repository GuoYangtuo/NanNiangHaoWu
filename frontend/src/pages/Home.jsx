import { useState, useEffect, useCallback, useRef } from 'react';
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

// 双滑条筛选面板
// TICKS 最后一项 100 代表"无限制"，左侧滑块最大只能滑动到 50 档（index 8）
const TICKS = [0, 1, 2, 3, 5, 8, 12, 20, 50, 100];
const MAX_INDEX = TICKS.length - 1;    // 9（100 档）
const MAX_LEFT_INDEX = MAX_INDEX - 1;  // 8（50 档，左侧滑块上限）

// TICKS 索引转滑条百分比
const indexToPercent = (index) => {
  const t = index / MAX_INDEX;
  return Math.pow(t, 1 / 1.4) * 100;
};

// 根据滑条百分比找出最近的 TICKS 索引
const nearestTickIndex = (percent) => {
  let nearest = 0;
  let nearestDist = Infinity;
  for (let i = 0; i <= MAX_INDEX; i++) {
    const pct = indexToPercent(i);
    const dist = Math.abs(pct - percent);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = i;
    }
  }
  return nearest;
};

// 判断右侧滑块当前是否处于"无限制"位置
const isUnlimited = (val) => val === '' || val === '100';

const RangeFilterPanel = ({ minValue, maxValue, onChange }) => {
  const [localMin, setLocalMin] = useState(minValue);
  const [localMax, setLocalMax] = useState(maxValue);
  const trackRef = useRef(null);
  const draggingRef = useRef(null);

  useEffect(() => {
    setLocalMin(minValue);
    setLocalMax(maxValue);
  }, [minValue, maxValue]);

  const minIdx = localMin !== '' ? TICKS.indexOf(parseInt(localMin)) : 0;
  // maxIdx：空字符串视为"无限制"，即最后一档（100）
  const maxIdx = localMax !== '' ? TICKS.indexOf(parseInt(localMax)) : MAX_INDEX;

  const displayMin = localMin !== '' ? localMin : '0';
  const displayMax = isUnlimited(localMax) ? '无限制' : localMax;

  // 限制左侧滑块最大可拖到 50 档（index 8）
  const leftThumbMaxIdx = Math.min(minIdx > MAX_LEFT_INDEX ? minIdx : MAX_LEFT_INDEX, MAX_LEFT_INDEX);

  const handlePointerDown = (e) => {
    if (!trackRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const idx = nearestTickIndex(percent);
    const minDist = Math.abs(percent - indexToPercent(minIdx));
    const maxDist = Math.abs(percent - indexToPercent(maxIdx));
    draggingRef.current = minDist <= maxDist ? 'min' : 'max';
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const idx = nearestTickIndex(percent);
    if (draggingRef.current === 'min') {
      // 左侧滑块不能超过 MAX_LEFT_INDEX（50 档）
      const clamped = Math.min(idx, MAX_LEFT_INDEX);
      setLocalMin(String(TICKS[Math.min(clamped, maxIdx)]));
    } else {
      // 右侧滑块：滑动到 MAX_INDEX（100）时设为无限制
      if (idx >= MAX_INDEX) {
        setLocalMax('');
      } else {
        const clamped = Math.max(idx, minIdx);
        setLocalMax(String(TICKS[clamped]));
      }
    }
  };

  const commitChange = (min, max) => {
    // 将 '0' 视为"无下限"（空字符串），避免筛选按钮误亮
    const committedMin = min === '0' ? '' : min;
    const committedMax = max === '0' ? '' : max;
    onChange(committedMin, committedMax);
  };

  const handlePointerUp = () => {
    commitChange(localMin, localMax);
    draggingRef.current = null;
  };

  return (
    <>
      <div className="flex justify-between items-center mb-1">
        <p className="text-xs font-semibold text-text2 uppercase tracking-wider">按评论数筛选</p>
        <span className="text-xs text-text2">{displayMin} ~ {displayMax}</span>
      </div>

      {/* 轨道 + 两只滑块 */}
      <div
        ref={trackRef}
        className="relative h-8 mt-1 mb-0 cursor-pointer select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* 轨道 */}
        <div className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[#E8DDD8]" style={{ left: 0, right: 0 }}>
          <div
            className="absolute h-full rounded-full bg-[#E879A9]"
            style={{
              left: `${indexToPercent(minIdx)}%`,
              right: `${100 - indexToPercent(maxIdx)}%`,
            }}
          />
        </div>

        {/* 左侧滑块 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-white border-2 border-[#E879A9] shadow cursor-grab active:cursor-grabbing pointer-events-auto"
          style={{ left: `calc(${indexToPercent(minIdx)}% - 9px)` }}
        />

        {/* 右侧滑块 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-white border-2 border-[#E879A9] shadow cursor-grab active:cursor-grabbing pointer-events-auto"
          style={{ left: `calc(${indexToPercent(maxIdx)}% - 9px)` }}
        />
      </div>
    </>
  );
};

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
  const [sort, setSort] = useState(init.sort ?? 'time');
  const [order, setOrder] = useState(init.order ?? 'desc');
  const [reviewCountMin, setReviewCountMin] = useState(init.reviewCountMin ?? '');
  const [reviewCountMax, setReviewCountMax] = useState(init.reviewCountMax ?? '');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortFilterExpanded, setSortFilterExpanded] = useState(false);
  const mobileSortFilterRef = useRef(null);

  // 点击移动端排序/筛选浮层外部时关闭
  useEffect(() => {
    if (!sortFilterExpanded) return;
    const handleClick = (e) => {
      if (mobileSortFilterRef.current && !mobileSortFilterRef.current.contains(e.target)) {
        setSortFilterExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sortFilterExpanded]);
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
        sort,
        order,
        reviewCountMin,
        reviewCountMax,
      }));
    } catch {
      // Silently ignore storage errors (quota exceeded, etc.)
    }
  }, [selectedCategory, products, page, searchKeyword, sort, order, reviewCountMin, reviewCountMax]);

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
        limit: 12,
        sort,
        order,
      };
      if (categoryId) {
        params.category_id = categoryId;
      }
      if (searchKeyword.trim()) {
        params.keyword = searchKeyword.trim();
      }
      if (reviewCountMin !== '') {
        params.review_count_min = reviewCountMin;
      }
      if (reviewCountMax !== '') {
        params.review_count_max = reviewCountMax;
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
  }, [searchKeyword, sort, order, reviewCountMin, reviewCountMax]);

  useEffect(() => {
    setPage(1);
    fetchProducts(isLeafSelected ? selectedCategory : null, 1, false);
  }, [selectedCategory, searchKeyword, sort, order, reviewCountMin, reviewCountMax, fetchProducts, isLeafSelected]);

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
      <div className="flex-1 px-2 py-3 sm:px-4 md:px-8 md:py-6">
        {/* 移动端分类选择 */}
        <div className="md:hidden mb-2">
          <MobileCategoryDropdown selectedId={selectedCategory} onSelect={handleCategorySelect} />
        </div>

        {/* 页面标题 — markdown 模式下隐藏 */}
        {!selectedFolderContent && (
          <div className="mb-3 md:mb-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-text1">
                  {selectedName || '好物推荐'}
                </h1>
                <p className="text-text2 mt-1 text-sm">
                  {subtitle}
                </p>
              </div>

              {/* 排序与筛选 — 桌面端 */}
              <div className="hidden md:flex items-center gap-2 relative">
                {/* 排序 Tab */}
                <div className="flex bg-warm-bg rounded-lg p-0.5 text-sm">
                  {[
                    { value: 'time', label: '时间' },
                    { value: 'review_count', label: '评论数' },
                    { value: 'rating', label: '评分' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSort(opt.value)}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        sort === opt.value
                          ? 'bg-white text-text1 font-medium shadow-sm'
                          : 'text-text2 hover:text-text1'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* 升/降序切换 */}
                <button
                  onClick={() => setOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-2 rounded-lg bg-warm-bg hover:bg-warm-border/50 text-text2 hover:text-text1 transition-colors"
                  title={order === 'asc' ? '从高到低' : '从低到高'}
                >
                  {order === 'asc' ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    </svg>
                  )}
                </button>

                {/* 筛选按钮 */}
                <button
                  onClick={() => setFilterOpen(prev => !prev)}
                  className={`p-2 rounded-lg transition-colors ${
                    reviewCountMin !== '' || reviewCountMax !== ''
                      ? 'bg-primary text-white'
                      : 'bg-warm-bg text-text2 hover:text-text1 hover:bg-warm-border/50'
                  }`}
                  title="筛选"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>

                {/* 筛选下拉面板 */}
                {filterOpen && (
                  <div className="absolute right-0 top-full mt-2 z-20 bg-white rounded-xl border border-warm-border shadow-lg py-3.5 px-5 w-64">
                    <RangeFilterPanel
                      minValue={reviewCountMin}
                      maxValue={reviewCountMax}
                      onChange={(min, max) => {
                        setReviewCountMin(min);
                        setReviewCountMax(max);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* 排序与筛选 — 移动端折叠浮层 */}
              <div className="md:hidden relative self-end" ref={mobileSortFilterRef}>
                {/* 触发按钮，始终显示 */}
                <button
                  onClick={() => setSortFilterExpanded(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    sort !== 'time' || order !== 'desc' || reviewCountMin !== '' || reviewCountMax !== ''
                      ? 'bg-primary text-white'
                      : 'bg-warm-bg text-text2 hover:bg-warm-border/50 hover:text-text1'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  筛选排序
                  <svg className={`w-3 h-3 transition-transform ${sortFilterExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* 浮层面板 */}
                {sortFilterExpanded && (
                  <div className="absolute right-0 top-full mt-2 z-20 bg-white rounded-xl border border-warm-border shadow-lg py-4 px-5 w-[min(90vw,360px)]">
                    {/* 排序选项 */}
                    <div className="mb-3">
                      <p className="text-xs text-text2 mb-1.5 font-semibold">排序方式</p>
                      <div className="flex gap-1.5">
                        {[
                          { value: 'time', label: '时间' },
                          { value: 'review_count', label: '评论数' },
                          { value: 'rating', label: '评分' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setSort(opt.value)}
                            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              sort === opt.value
                                ? 'bg-primary text-white'
                                : 'bg-warm-bg text-text2 hover:bg-warm-border/50 hover:text-text1'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 升/降序 */}
                    <div className="mb-3">
                      <p className="text-xs text-text2 mb-1.5 font-semibold">排序顺序</p>
                      <div className="flex gap-1.5">
                        {[
                          { value: 'asc', label: '从高到低' },
                          { value: 'desc', label: '从低到高' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setOrder(opt.value)}
                            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              order === opt.value
                                ? 'bg-primary text-white'
                                : 'bg-warm-bg text-text2 hover:bg-warm-border/50 hover:text-text1'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 评论数筛选 */}
                    <div className="mb-2">
                      <RangeFilterPanel
                        minValue={reviewCountMin}
                        maxValue={reviewCountMax}
                        onChange={(min, max) => {
                          setReviewCountMin(min);
                          setReviewCountMax(max);
                        }}
                      />
                    </div>

                    {/* 重置按钮 */}
                    <button
                      onClick={() => {
                        setSort('time');
                        setOrder('desc');
                        setReviewCountMin('');
                        setReviewCountMax('');
                      }}
                      className="w-full py-2 rounded-lg text-sm text-text2 hover:text-text1 bg-warm-bg hover:bg-warm-border/50 transition-colors"
                    >
                      重置全部
                    </button>
                  </div>
                )}
              </div>
            </div>
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
