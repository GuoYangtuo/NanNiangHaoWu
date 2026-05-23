import { useState } from 'react';
import { useCategories } from '../hooks/useCategories';

const CategoryNode = ({ node, depth, selectedId, onSelect, expandedFolders, onToggle, categories, lockedIds }) => {
  const isFolder = node.type === 'folder';
  const isExpanded = !!expandedFolders[node.id];
  const isSelected = selectedId === node.id;
  const hasContent = isFolder && !!node.content;
  const isNodeLocked = lockedIds.includes(node.id);

  const handleClick = () => {
    if (isFolder) {
      onToggle(node.id);
      if (hasContent) {
        onSelect(node.id);
      }
    } else {
      onSelect(node.id);
    }
  };

  return (
    <div className="relative">
      {/* 层级纵向装饰线 */}
      {depth > 0 && (
        <>
          {/* 整条垂直线 — 每个子节点同一 depth 共用同一水平位置 */}
          <div
            className="absolute top-0 bottom-0 w-px bg-primary/20 pointer-events-none"
            style={{ left: `${-8 + depth * 24}px` }}
          />
        </>
      )}

      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
          isSelected
            ? 'bg-primary text-white shadow-sm font-medium'
            : isFolder
            ? 'text-text2 hover:bg-primary-light/40 font-medium'
            : 'text-text2 hover:bg-primary-light/40'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {isFolder && (
          <svg
            className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
        {!isFolder && <span className="w-4 flex-shrink-0" />}
        <span>{node.name}</span>
        {isNodeLocked && (
          <svg
            className="w-3.5 h-3.5 flex-shrink-0 text-amber-500 ml-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}
      </button>

      {isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child, idx) => (
            <CategoryNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              categories={categories}
              lockedIds={lockedIds}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CategoryTree = ({ selectedId, onSelect }) => {
  const { categories, lockedIds, loading, error } = useCategories();
  const [expandedFolders, setExpandedFolders] = useState({});

  const toggleFolder = (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  if (loading) {
    return (
      <div className="px-3 py-4 text-center text-sm text-text2">加载中...</div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-4 text-center text-sm text-red-500">加载失败</div>
    );
  }

  return (
    <nav className="w-full">
      <div className="px-3 py-2">
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            selectedId === null
              ? 'bg-primary text-white shadow-sm'
              : 'text-text2 hover:bg-primary-light/60 hover:text-primary'
          }`}
        >
          全部好物
        </button>
      </div>

      <div className="space-y-1 px-3 py-2">
        {categories.map((node) => (
          <CategoryNode
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            onSelect={onSelect}
            expandedFolders={expandedFolders}
            onToggle={toggleFolder}
            categories={categories}
            lockedIds={lockedIds}
          />
        ))}
      </div>
    </nav>
  );
};

export default CategoryTree;
