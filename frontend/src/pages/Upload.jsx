import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageUpload from '../components/ImageUpload';
import { createProduct } from '../api/product';
import { CATEGORY_TREE } from '../utils/constants';

const Upload = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    category_id: '',
    name: '',
    description: '',
    purchase_link: ''
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // 扁平化分类列表用于选择
  const flatCategories = [];
  CATEGORY_TREE.forEach((folder) => {
    if (folder.children) {
      folder.children.forEach((child) => {
        flatCategories.push({
          id: child.id,
          name: child.name,
          groupName: folder.name
        });
      });
    }
  });

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

    if (form.purchase_link && !/^https?:\/\/.+/.test(form.purchase_link)) {
      errors.purchase_link = '请输入有效的链接（以 http:// 或 https:// 开头）';
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
      // 构建 FormData
      const formData = new FormData();
      formData.append('category_id', form.category_id);
      formData.append('name', form.name.trim());
      formData.append('description', form.description.trim());
      if (form.purchase_link.trim()) {
        formData.append('purchase_link', form.purchase_link.trim());
      }

      // 只上传新图片
      const newImages = images.filter((img) => img.isNew);
      newImages.forEach((img) => {
        formData.append('images', img.file);
      });

      await createProduct(formData);

      // 显示成功提示并跳转
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text1">上传好物</h1>
        <p className="text-text2 mt-1">分享你使用过的好物，让更多姐妹抄作业~</p>
      </div>

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-6 md:p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* 分类选择 */}
          <div>
            <label className="block text-sm font-medium text-text1 mb-1.5">
              分类 <span className="text-red-500">*</span>
            </label>
            <select
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary/20 transition-colors ${
                fieldErrors.category_id ? 'border-red-400' : 'border-warm-border'
              }`}
            >
              <option value="">请选择分类</option>
              {CATEGORY_TREE.map((folder) => (
                <optgroup key={folder.id} label={folder.name}>
                  {folder.children?.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {fieldErrors.category_id && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.category_id}</p>
            )}
          </div>

          {/* 商品名称 */}
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

          {/* 简介/推荐理由 */}
          <div>
            <label className="block text-sm font-medium text-text1 mb-1.5">
              使用感受 / 推荐理由 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="说说你的使用感受、推荐理由、使用方法等，让姐妹们更好地了解这个好物~"
              rows={5}
              className={`w-full px-4 py-3 border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-colors resize-none ${
                fieldErrors.description ? 'border-red-400' : 'border-warm-border'
              }`}
            />
            {fieldErrors.description && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.description}</p>
            )}
          </div>

          {/* 参考购买链接 */}
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
            <p className="mt-1 text-xs text-text2/60">选填，可帮助姐妹们找到同款</p>
          </div>

          {/* 图片上传 */}
          <div>
            <label className="block text-sm font-medium text-text1 mb-1.5">
              图片 <span className="text-red-500">*</span>
            </label>
            <ImageUpload images={images} onChange={setImages} maxImages={9} />
            {images.length === 0 && (
              <p className="mt-1 text-xs text-red-500">请至少上传一张图片</p>
            )}
          </div>

          {/* 提交按钮 */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? '提交中...' : '提交审核'}
            </button>
            <p className="mt-3 text-xs text-text2/60 text-center">
              提交后需要管理员审核，通过后才会展示在首页
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Upload;
