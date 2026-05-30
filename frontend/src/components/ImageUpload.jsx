import { useRef, useState, useEffect } from 'react';

const ImageUpload = ({ images = [], onChange, maxImages = 9 }) => {
  const fileInputRef = useRef(null);
  const [previews, setPreviews] = useState(images);
  const [dragOver, setDragOver] = useState(false);

  // Desktop drag state
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Mobile touch drag state
  const touchDragRef = useRef({ draggingIndex: null, startX: 0, startY: 0, moved: false });
  const itemRefs = useRef([]);

  // Caption editing state
  const [editingIndex, setEditingIndex] = useState(null);
  const [captionInput, setCaptionInput] = useState('');

  useEffect(() => {
    setPreviews(images);
  }, [images]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await processFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

      const reader = new FileReader();
      const preview = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });

      newPreviews.push({ file, preview, isNew: true, caption: '' });
    }

    const updated = [...previews, ...newPreviews];
    setPreviews(updated);
    onChange(updated);
  };

  const removeImage = (index) => {
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);
    onChange(updated);
    if (editingIndex === index) {
      setEditingIndex(null);
    } else if (editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  // Desktop drag to reorder
  const handleDragStart = (e, index) => {
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggingIndex !== null && index !== draggingIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (draggingIndex !== null && index !== draggingIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const fromIndex = draggingIndex;
    setDraggingIndex(null);
    setDragOverIndex(null);

    if (fromIndex === null || fromIndex === dropIndex) return;

    const updated = [...previews];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(dropIndex, 0, moved);
    setPreviews(updated);
    onChange(updated);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  // Mobile touch drag to reorder
  const handleTouchStart = (e, index) => {
    const touch = e.touches[0];
    touchDragRef.current = { draggingIndex: index, startX: touch.clientX, startY: touch.clientY, moved: false };
  };

  const handleTouchMove = (e, index) => {
    const touch = e.touches[0];
    const { startX, startY } = touchDragRef.current;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    // If moved more than 10px, it's a drag
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      touchDragRef.current.moved = true;
    }

    if (touchDragRef.current.moved) {
      e.preventDefault();
      // Find which card we're over
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
      const targetEl = elements.find(
        (el) => el.dataset.dragIndex !== undefined && el.dataset.dragIndex !== null
      );
      if (targetEl) {
        const targetIndex = parseInt(targetEl.dataset.dragIndex);
        if (targetIndex !== index && targetIndex !== dragOverIndex) {
          setDragOverIndex(targetIndex);
        }
      }
    }
  };

  const handleTouchEnd = (e, index) => {
    const { draggingIndex, moved } = touchDragRef.current;
    setDraggingIndex(null);
    setDragOverIndex(null);
    touchDragRef.current.moved = false;

    if (!moved || draggingIndex === null) return;

    const touch = e.changedTouches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const targetEl = elements.find((el) => el.dataset.dragIndex !== undefined);
    if (!targetEl) return;

    const targetIndex = parseInt(targetEl.dataset.dragIndex);
    if (targetIndex === draggingIndex || targetIndex === null || isNaN(targetIndex)) return;

    const updated = [...previews];
    const [movedItem] = updated.splice(draggingIndex, 1);
    updated.splice(targetIndex, 0, movedItem);
    setPreviews(updated);
    onChange(updated);
  };

  // Caption editing
  const startEditCaption = (index, e) => {
    e.stopPropagation();
    setEditingIndex(index);
    setCaptionInput(previews[index].caption || '');
  };

  const saveCaption = (index) => {
    const updated = previews.map((img, i) =>
      i === index ? { ...img, caption: captionInput } : img
    );
    setPreviews(updated);
    onChange(updated);
    setEditingIndex(null);
  };

  const cancelCaption = () => {
    setEditingIndex(null);
    setCaptionInput('');
  };

  const handleCaptionKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveCaption(index);
    } else if (e.key === 'Escape') {
      cancelCaption();
    }
  };

  const cardClass = (index) => {
    const base = 'relative aspect-square rounded-lg overflow-hidden bg-warm-border transition-all select-none';
    if (draggingIndex === index) return `${base} opacity-40 scale-95`;
    if (dragOverIndex === index) return `${base} ring-2 ring-primary ring-offset-2 scale-105`;
    return `${base} cursor-grab active:cursor-grabbing`;
  };

  return (
    <div className="space-y-3">
      {/* 上传区域 */}
      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'none'; }}
        onDragEnter={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'none'; }}
        className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);
            const files = Array.from(e.dataTransfer.files);
            processFiles(files);
          }}
        >
          <div className="w-12 h-12 rounded-full bg-primary-light/30 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-text1">点击或拖拽上传图片</p>
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
              ref={(el) => { itemRefs.current[index] = el; }}
              data-drag-index={index}
              draggable={editingIndex === null}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, index)}
              onTouchMove={(e) => handleTouchMove(e, index)}
              onTouchEnd={(e) => handleTouchEnd(e, index)}
              className={cardClass(index)}
            >
              <img
                src={img.preview || img}
                alt={`预览 ${index + 1}`}
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />

              {/* 封面标签 */}
              {index === 0 && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary text-white text-xs rounded">
                  封面
                </span>
              )}

              {/* 删除按钮 — 右上角，始终显示 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* 注解按钮 — 左下角，始终显示 */}
              <button
                type="button"
                onClick={(e) => startEditCaption(index, e)}
                className="absolute bottom-1 left-1 w-6 h-6 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-opacity"
                title="添加注解"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              {/* 有注解时左下角显示小蓝点 */}
              {img.caption && (
                <span className="absolute bottom-1 left-8 w-2 h-2 bg-primary rounded-full" title={img.caption} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 注解编辑弹窗 */}
      {editingIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-warm-border">
              <h3 className="text-sm font-bold text-text1">
                {previews[editingIndex]?.caption ? '编辑图片注解' : '添加图片注解'}
              </h3>
              <button
                onClick={cancelCaption}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-warm-bg text-text2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="aspect-video rounded-lg overflow-hidden bg-warm-border">
                <img
                  src={previews[editingIndex]?.preview || previews[editingIndex]}
                  alt="预览"
                  className="w-full h-full object-contain"
                />
              </div>
              <textarea
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                onKeyDown={(e) => handleCaptionKeyDown(e, editingIndex)}
                placeholder="给这张图片写点注解吧~"
                rows={3}
                maxLength={200}
                autoFocus
                className="w-full px-4 py-3 border border-warm-border rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              <p className="text-xs text-text2/60 text-right">{captionInput.length}/200</p>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-warm-border">
              <button
                onClick={cancelCaption}
                className="px-4 py-2 text-sm border border-warm-border rounded-lg text-text2 hover:bg-warm-bg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => saveCaption(editingIndex)}
                className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-text2/60">
        {previews.length} / {maxImages} 张图片
        {previews.length > 0 && '（第一张将作为封面，拖动排序，笔形按钮写注解）'}
      </p>
    </div>
  );
};

export default ImageUpload;
