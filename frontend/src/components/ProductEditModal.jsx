import { useState, useEffect } from 'react';
import ImageUpload from './ImageUpload';
import { useCategories } from '../hooks/useCategories';

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
        <div className="absolute z-[60] mt-1 w-full bg-white border border-warm-border rounded-lg shadow-lg max-h-[500px] overflow-y-auto">
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

const ProductEditModal = ({ product, onClose, onSuccess, onAfterSave }) => {
  const { categories, loading: categoriesLoading } = useCategories();

  const getInitialImages = () => {
    return (product.images || []).map((img) => {
      const src = img.startsWith('/uploads/') ? img : `/uploads/${img}`;
      return { preview: src, isNew: false, original: img };
    });
  };

  const [form, setForm] = useState({
    category_id: product.category_id || '',
    name: product.name || '',
    description: product.description || '',
    purchase_link: product.purchase_link || ''
  });
  const [images, setImages] = useState(getInitialImages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};

    if (!form.category_id) {
      errors.category_id = '请选择分类';
    }

    if (!form.name.trim()) {
      errors.name = '请输入商品名称';
    } else if (form.name.length > 200) {
      errors.name = '商品名称不能超过 200 个字符';
    }

    if (!form.description.trim()) {
      errors.description = '请输入使用感受或推荐理由';
    }

    if (form.purchase_link.trim() && !/^https?:\/\/.+/.test(form.purchase_link)) {
      errors.purchase_link = '请输入有效的链接（以 http:// 或 https:// 开头）';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('category_id', form.category_id);
      formData.append('name', form.name.trim());
      formData.append('description', form.description.trim());
      formData.append('purchase_link', form.purchase_link.trim());

      const newImages = images.filter((img) => img.isNew);
      newImages.forEach((img) => {
        formData.append('images', img.file);
      });

      const { updateAdminProduct } = await import('../api/admin');
      await updateAdminProduct(product.id, formData);

      onSuccess?.();

      if (onAfterSave) {
        const shouldApprove = window.confirm('商品已保存，是否立即通过审核？');
        onAfterSave(shouldApprove);
      }

      onClose();
    } catch (err) {
      setError(err.message || '保存失败，请稍后重试');
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8 text-center text-text2">
          加载分类中...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-text1">编辑商品</h2>
            <p className="text-xs text-text2 mt-0.5">修改商品的所有信息</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-warm-bg text-text2 hover:text-text1 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

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
                商品名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="推荐的是什么好物？"
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
                使用感受 / 推荐理由 <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="裙子尺码很大，适合大体型小南娘 / 香水味道很廉价劣质，不值得买 ..."
                rows={4}
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
                参考购买链接
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
                图片 <span className="text-xs text-text2 font-normal">（第一张为封面，可上传新图片替换）</span>
              </label>
              <ImageUpload images={images} onChange={setImages} maxImages={9} />
              {images.length === 0 && (
                <p className="mt-1 text-xs text-red-500">请至少保留或上传一张图片</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-warm-border flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm border border-warm-border rounded-lg text-text2 hover:bg-warm-bg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductEditModal;
