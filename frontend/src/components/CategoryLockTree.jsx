import { useState, useEffect } from 'react';
import { getCategories } from '../api/category';

const LockNode = ({ node, depth, expandedFolders, onToggle, lockedIds, onToggleLock }) => {
  const isFolder = node.type === 'folder';
  const isExpanded = !!expandedFolders[node.id];
  const isLocked = lockedIds.includes(node.id);
  const canLock = !isFolder;

  const handleToggle = (e) => {
    e.stopPropagation();
    if (isFolder) {
      onToggle(node.id);
    } else {
      onToggleLock(node.id);
    }
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
          isLocked
            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            : 'text-text2 hover:bg-warm-bg'
        }`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {isFolder ? (
          <svg
            className={`w-4 h-4 flex-shrink-0 transition-transform duration-150 ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <span
          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
            isLocked
              ? 'bg-amber-500 border-amber-500'
              : 'border-gray-300'
          }`}
        >
          {isLocked && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>

        <span className="line-clamp-1 text-left flex-1">{node.name}</span>

        {isLocked && (
          <span className="text-xs text-amber-500 font-medium flex-shrink-0">已锁定</span>
        )}
      </button>

      {isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <LockNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              lockedIds={lockedIds}
              onToggleLock={onToggleLock}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CategoryLockTree = ({ lockedIds, onLockedIdsChange }) => {
  const [categories, setCategories] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getCategories();
        setCategories(res.data.categories || []);
      } catch (err) {
        console.error('获取分类失败:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleFolder = (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const handleToggleLock = (nodeId) => {
    const newLockedIds = lockedIds.includes(nodeId)
      ? lockedIds.filter((id) => id !== nodeId)
      : [...lockedIds, nodeId];
    onLockedIdsChange(newLockedIds);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {categories.map((node) => (
        <LockNode
          key={node.id}
          node={node}
          depth={0}
          expandedFolders={expandedFolders}
          onToggle={toggleFolder}
          lockedIds={lockedIds}
          onToggleLock={handleToggleLock}
        />
      ))}
    </div>
  );
};

export default CategoryLockTree;
