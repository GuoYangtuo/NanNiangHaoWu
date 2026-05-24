import { Link } from 'react-router-dom';
import RatingIcon from './RatingIcon';

const ProductCard = ({ product, onEdit }) => {
  const { id, name, images, category, user, created_at, average_rating, review_count } = product;

  // images 数组中每个元素已经是完整的 /uploads/xxx 格式，或者原始文件名
  const displayImage = images && images.length > 0
    ? (images[0].startsWith('/uploads') ? images[0] : `/uploads/${images[0]}`)
    : 'https://via.placeholder.com/300x200/F0E8E4/E879A9?text=No+Image';

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <Link
      to={`/product/${id}`}
      className="group block bg-white rounded-xl shadow-card overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
    >
      {/* 图片区域 */}
      <div className="relative aspect-[4/3] overflow-hidden bg-warm-border">
        <img
          src={displayImage}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/300x200/F0E8E4/E879A9?text=No+Image';
          }}
        />
        {images && images.length > 1 && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded-full">
            +{images.length - 1}
          </div>
        )}
        {onEdit && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(product);
            }}
            className="absolute top-2 left-2 px-2.5 py-1.5 bg-primary/80 hover:bg-primary text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow-sm"
            title="编辑商品"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            编辑
          </button>
        )}
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-text1 line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {name}
        </h3>

        <div className="flex items-center justify-between">
          {category && (
            <span className="text-xs px-2 py-1 bg-primary-light/60 text-primary-dark rounded-md">
              {category.name}
            </span>
          )}
          <div className="flex items-center gap-1 text-xs text-text2">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{user?.username || '匿名'}</span>
          </div>
        </div>

        <p className="text-xs text-text2/60 mt-1">
          {formatDate(created_at)}
        </p>
        {average_rating > 0 && (
          <div className="flex items-center gap-1.5 mt-1">
            <RatingIcon rating={average_rating} size={14} />
            <span className="text-xs text-text2/60">({review_count})</span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;
