import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageUpload from '../components/ImageUpload';
import { useCategories } from '../hooks/useCategories';
import { createProduct } from '../api/product';

const RATING_LABELS = [
  { max: 1.5, label: '拉完了', color: 'text-gray-400' },
  { max: 2.5, label: 'NPC', color: 'text-green-500' },
  { max: 3.5, label: '人上人', color: 'text-blue-500' },
  { max: 4.5, label: '顶级', color: 'text-purple-500' },
  { max: 5.0, label: '夯爆了', color: 'text-red-500' },
];

const getRatingLabel = (rating) => {
  const r = parseFloat(rating);
  if (r <= 0) return null;
  return RATING_LABELS.find((l) => r <= l.max) || RATING_LABELS[RATING_LABELS.length - 1];
};

const flattenCategories = (nodes, ancestors = []) => {
  const result = [];
  for (const node of nodes) {
    const path = [...ancestors, node.name];
    if (node.children) {
      result.push(...flattenCategories(node.children, path));
    } else {
      result.push({ id: node.id, label: node.name, ancestors: path.slice(0, -1) });
    }
  }
  return result;
};

const CategorySelect = ({ value, onChange, categories, error }) => {
  const [open, setOpen] = useState(false);

  const flatCategories = categories.length > 0 ? flattenCategories(categories) : [];

  const selected = flatCategories.find((c) => c.id === value);

  const handleSelect = (cat) => {
    onChange({ target: { name: 'category_id', value: cat.id } });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full px-4 py-3 border rounded-lg text-sm bg-white text-left focus:ring-2 focus:ring-primary/20 transition-colors flex items-center justify-between ${
          error ? 'border-red-400' : 'border-warm-border'
        }`}
      >
        <span className={selected ? 'text-text1' : 'text-text2/60'}>
          {selected ? (
            <>
              {selected.ancestors.map((a, i) => (
                <span key={i} className="text-text2">{i > 0 ? ' / ' : ''}{a}</span>
              ))}
              {selected.ancestors.length > 0 && <span className="text-text2"> / </span>}
              <span className="text-text1">{selected.label}</span>
            </>
          ) : (
            '请选择分类'
          )}
        </span>
        <svg className={`w-4 h-4 text-text2 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-warm-border rounded-lg shadow-lg max-h-[500px] overflow-y-auto">
          <CategoryTree nodes={categories} onSelect={handleSelect} selectedId={value} ancestors={[]} />
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

const CategoryTree = ({ nodes, onSelect, selectedId, ancestors }) => {
  return (
    <div className="py-1">
      {nodes.map((node) => {
        const path = [...ancestors, node.name];
        if (node.children) {
          return (
            <CategoryBranch
              key={node.id || node.name}
              node={node}
              path={path}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          );
        }
        const isSelected = node.id === selectedId;
        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelect({ id: node.id, label: node.name, ancestors })}
            className={`w-full px-4 py-2 text-sm text-left hover:bg-primary/5 transition-colors ${
              isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-text1'
            }`}
          >
            {node.name}
          </button>
        );
      })}
    </div>
  );
};

const CategoryBranch = ({ node, path, onSelect, selectedId }) => {
  const [expanded, setExpanded] = useState(false);

  const hasSelectedChild = (nodes) => {
    for (const n of nodes) {
      if (n.id === selectedId) return true;
      if (n.children && hasSelectedChild(n.children)) return true;
    }
    return false;
  };

  const isChildSelected = hasSelectedChild(node.children || []);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`w-full px-4 py-2 text-sm text-left flex items-center justify-between hover:bg-primary/5 transition-colors ${
          isChildSelected ? 'text-primary font-medium' : 'text-text1'
        }`}
      >
        <span>{node.name}</span>
        <svg
          className={`w-3 h-3 text-text2 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {expanded && (
        <div className="pl-4 border-l border-warm-border/50 ml-3">
          <CategoryTree
            nodes={node.children}
            onSelect={onSelect}
            selectedId={selectedId}
            ancestors={path}
          />
        </div>
      )}
    </div>
  );
};

const Upload = () => {
  const navigate = useNavigate();
  const { categories, loading: categoriesLoading } = useCategories();
  const [form, setForm] = useState({
    category_id: '',
    name: '',
    description: '',
    purchase_link: ''
  });
  const [images, setImages] = useState([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [recommendType, setRecommendType] = useState('specific');

  const validate = () => {
    const errors = {};

    if (!form.category_id) {
      errors.category_id = '请选择分类';
    }

    if (!form.name.trim()) {
      errors.name = recommendType === 'specific' ? '请输入商品名称' : '请输入某一类/某家店的产品';
    } else if (form.name.length > 200) {
      errors.name = (recommendType === 'specific' ? '商品名称' : '产品信息') + '不能超过 200 个字符';
    }

    if (!form.description.trim()) {
      errors.description = recommendType === 'specific'
        ? '请输入使用感受或推荐理由'
        : '请输入主要购买途径、类目特征、吐槽/谩骂、推荐/避雷理由等';
    }

    if (recommendType === 'specific') {
      if (!form.purchase_link.trim()) {
        errors.purchase_link = '请输入参考购买链接';
      } else if (!/^https?:\/\/.+/.test(form.purchase_link)) {
        errors.purchase_link = '请输入有效的链接（以 http:// 或 https:// 开头）';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    if (images.length === 0) {
      setError('请至少上传一张图片');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('category_id', form.category_id);
      formData.append('name', form.name.trim());
      formData.append('description', form.description.trim());
      formData.append('purchase_link', form.purchase_link.trim());
      if (rating > 0) {
        formData.append('rating', rating);
      }

      const newImages = images.filter((img) => img.isNew);
      newImages.forEach((img) => {
        formData.append('images', img.file);
      });

      await createProduct(formData);

      alert('提交成功！你的好物推荐正在等待审核，通过后就会出现在首页啦~');
      navigate('/');
    } catch (err) {
      setError(err.message || '提交失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: '' });
    }
  };

  if (categoriesLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center text-text2">
        加载分类中...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text1">上传好物</h1>
        <p className="text-text2 mt-1">分享你使用过的好物，为更多可爱的小南娘扫清变美路上的重重障碍~</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-6 md:p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text1 mb-1.5">
              分类 <span className="text-red-500">*</span>
            </label>
            <CategorySelect
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              categories={categories}
              error={fieldErrors.category_id}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text1 mb-1.5">
              分享类型
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRecommendType('specific')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors ${
                  recommendType === 'specific'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-text1 border-warm-border hover:border-primary/30'
                }`}
              >
                具体商品
              </button>
              <button
                type="button"
                onClick={() => setRecommendType('category')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors ${
                  recommendType === 'category'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-text1 border-warm-border hover:border-primary/30'
                }`}
              >
                某一类/某家店的产品
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text1 mb-1.5">
              {recommendType === 'specific' ? '商品名称' : '某一类/某家店的产品'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder={recommendType === 'specific'
                ? '建议直接粘贴电商平台商品名称'
                : '拼多多杂牌xx / 某淘宝店铺或品牌 等'}
              maxLength={200}
              className={`w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-colors ${
                fieldErrors.name ? 'border-red-400' : 'border-warm-border'
              }`}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
            )}
            <p className="mt-1 text-xs text-text2/60 text-right">{form.name.length}/200</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text1 mb-1.5">
              {recommendType === 'specific'
                ? '使用感受 / 推荐理由 / 使用方法'
                : '购买经历、感受，推荐/避雷理由，吐槽/谩骂等'} <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder={recommendType === 'specific'
                ? '裙子尺码很大，适合大体型小南娘 / 香水味道很廉价劣质，不值得买 ...（内容丰富、长篇、优质的评价更易通过审核）'
                : '主要购买途径，类目特征等。\n质量差、掉色、缝合线严重等等\n（内容丰富、长篇、优质的分享更易通过审核）'}
              rows={5}
              className={`w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-colors resize-none ${
                fieldErrors.description ? 'border-red-400' : 'border-warm-border'
              }`}
            />
            {fieldErrors.description && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text1 mb-1.5">
              {recommendType === 'specific' ? '参考购买链接' : '店铺链接（可选）'}
              {recommendType === 'specific' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="url"
              name="purchase_link"
              value={form.purchase_link}
              onChange={handleChange}
              placeholder="https://..."
              className={`w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-colors ${
                fieldErrors.purchase_link ? 'border-red-400' : 'border-warm-border'
              }`}
            />
            {fieldErrors.purchase_link && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.purchase_link}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text1 mb-1.5">
              {recommendType === 'specific'
                ? '图片（建议上传自己使用或上身效果图哦！）'
                : '相关图片（上身效果，踩坑经历等）'} <span className="text-red-500">*</span>
            </label>
            <ImageUpload images={images} onChange={setImages} maxImages={9} />
            {images.length === 0 && (
              <p className="mt-1 text-xs text-red-500">请至少上传一张图片</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text1 mb-1.5">
              你的评分
            </label>
            <p className="text-xs text-text2 mb-2">给这个好物打个分吧！上传后会自动生成一条上传者评分记录~</p>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1"
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star === rating ? 0 : star)}
                    onMouseEnter={() => setHoverRating(star)}
                    className="transition-transform hover:scale-110"
                    title={`${star}星`}
                  >
                    <img
                      src="/evaluationIcon.png"
                      alt={`${star}星`}
                      className="block"
                      style={{
                        width: 32,
                        height: 32,
                        opacity: (hoverRating || rating) >= star ? 1 : 0.3,
                        filter: (hoverRating || rating) >= star ? 'none' : 'grayscale(100%)'
                      }}
                    />
                  </button>
                ))}
              </span>
              {(hoverRating || rating) > 0 && (() => {
                const label = getRatingLabel(hoverRating || rating);
                return label ? (
                  <span className={`text-sm font-semibold ${label.color}`}>
                    {label.label}
                  </span>
                ) : null;
              })()}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? '提交中...' : '提交审核'}
            </button>
            <p className="mt-3 text-xs text-text2/60 text-center">
              右上角可查看审核状态，通过后才会展示在首页
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Upload;
