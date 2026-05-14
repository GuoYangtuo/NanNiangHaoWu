import { useRef, useState } from 'react';

const ImageUpload = ({ images = [], onChange, maxImages = 9 }) => {
  const fileInputRef = useRef(null);
  const [previews, setPreviews] = useState(images);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    await processFiles(files);
  };

  const processFiles = async (files) => {
    const remaining = maxImages - previews.length;
    if (remaining <= 0) return;

    const filesToProcess = files.slice(0, remaining);
    const newPreviews = [];

    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} 超过 5MB 限制`);
        continue;
      }

      // 创建本地预览
      const reader = new FileReader();
      const preview = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });

      newPreviews.push({
        file,
        preview,
        isNew: true
      });
    }

    const updated = [...previews, ...newPreviews];
    setPreviews(updated);
    onChange(updated);
  };

  const removeImage = (index) => {
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);
    onChange(updated);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  return (
    <div className="space-y-3">
      {/* 上传区域 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-primary bg-primary-light/20'
            : 'border-warm-border hover:border-primary hover:bg-primary-light/10'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-primary-light/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-text1">
              点击或拖拽上传图片
            </p>
            <p className="text-xs text-text2 mt-1">
              支持 JPG、PNG、WebP、GIF，单张最大 5MB，最多 {maxImages} 张
            </p>
          </div>
        </div>
      </div>

      {/* 预览区域 */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {previews.map((img, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden bg-warm-border group"
            >
              <img
                src={img.preview || img}
                alt={`预览 ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {index === 0 && (
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-primary text-white text-xs rounded">
                  封面
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-text2/60">
        {previews.length} / {maxImages} 张图片
        {previews.length > 0 && '（第一张将作为封面）'}
      </p>
    </div>
  );
};

export default ImageUpload;
