import { Link } from 'react-router-dom';
import RatingIcon from './RatingIcon';

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

const ProductCard = ({ product, onEdit }) => {
  const { id, name, images, category, average_rating, review_count } = product;

  // images 数组中每个元素已经是完整的 /uploads/xxx 格式，或者原始文件名
  const displayImage = images && images.length > 0
    ? (images[0].startsWith('/uploads') ? images[0] : `/uploads/${images[0]}`)
    : 'https://via.placeholder.com/300x200/F0E8E4/E879A9?text=No+Image';

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
      <div className="p-2 sm:p-3">
        <h3 className="text-xs sm:text-sm font-medium text-text1 line-clamp-2 mb-1 sm:mb-1.5 group-hover:text-primary transition-colors">
          {name}
        </h3>

        <div className="flex items-center justify-between gap-1">
          {category && (
            <span className="text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 bg-primary-light/60 text-primary-dark rounded-md truncate">
              {category.name}
            </span>
          )}
          {average_rating > 0 && (() => {
            const label = getRatingLabel(average_rating);
            return (
              <div className="flex items-center gap-0.5 sm:gap-1">
                <span className="text-xs text-text2/60 hidden sm:inline">{review_count}人评价</span>
                <RatingIcon rating={average_rating} size={14} />
                {label && <span className={`text-xs font-semibold ${label.color}`}>{label.label}</span>}
              </div>
            );
          })()}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
