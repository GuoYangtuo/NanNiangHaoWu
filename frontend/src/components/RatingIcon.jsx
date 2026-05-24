const RatingIcon = ({ rating = 0, size = 16, showValue = false, className = '' }) => {
  const totalStars = 5;
  const clampedRating = Math.min(Math.max(rating, 0), totalStars);

  const icons = [];
  for (let i = 1; i <= totalStars; i++) {
    const isFull = clampedRating >= i;
    const isPartial = !isFull && clampedRating > i - 1;
    const partialWidth = isPartial ? (clampedRating - (i - 1)) * 100 : 0;

    icons.push(
      <div
        key={i}
        className="relative inline-block flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <img
          src="/evaluationIcon.png"
          alt=""
          className="absolute inset-0 w-full h-full opacity-20"
          style={{ filter: 'grayscale(100%)' }}
        />
        {isFull && (
          <img
            src="/evaluationIcon.png"
            alt=""
            className="absolute inset-0 w-full h-full"
          />
        )}
        {isPartial && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${partialWidth}%` }}
          >
            <img
              src="/evaluationIcon.png"
              alt=""
              className="h-full object-left"
              style={{ width: size, maxWidth: 'none' }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {icons}
      {showValue && clampedRating > 0 && (
        <span className="ml-1 text-xs text-text2 font-medium">
          {clampedRating.toFixed(1)}
        </span>
      )}
    </span>
  );
};

export default RatingIcon;
