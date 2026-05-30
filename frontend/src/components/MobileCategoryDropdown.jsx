import { useState, useEffect, useCallback, useRef } from 'react';
import { useCategories } from '../hooks/useCategories';

const STORAGE_KEY = 'nnhw_cat_expanded';

const loadExpanded = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveExpanded = (expanded) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expanded));
  } catch {}
};

// Flatten into a navigable list: folders-with-content + leaf nodes (depth-first order)
const flattenPaginatable = (nodes) => {
  const result = [];
  for (const node of nodes) {
    const isFolder = node.type === 'folder';
    const hasContent = isFolder && !!node.content;
    if (hasContent || !isFolder) {
      result.push(node);
    }
    if (node.children) {
      result.push(...flattenPaginatable(node.children));
    }
  }
  return result;
};

// Find the path from root to a given node id
const findPath = (nodes, targetId, ancestors = []) => {
  for (const n of nodes) {
    if (n.id === targetId) return ancestors;
    if (n.children) {
      const res = findPath(n.children, targetId, [...ancestors, n.name]);
      if (res !== null) return res;
    }
  }
  return null;
};

// Find a node by id in the tree
const findNode = (nodes, id) => {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return null;
};

const CategoryNode = ({ node, depth, selectedId, onSelect, expandedFolders, onToggle, lockedIds }) => {
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
      {depth > 0 && (
        <div
          className="absolute top-0 bottom-0 w-px bg-primary/20 pointer-events-none"
          style={{ left: `${-8 + depth * 20}px` }}
        />
      )}

      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-all duration-200 ${
          isSelected
            ? 'bg-primary text-white shadow-sm font-medium'
            : isFolder
            ? 'text-text2 hover:bg-primary-light/40 font-medium'
            : 'text-text2 hover:bg-primary-light/40'
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {isFolder && (
          <svg
            className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
        {!isFolder && <span className="w-3.5 flex-shrink-0" />}
        <span className="truncate">{node.name}</span>
        {isNodeLocked && (
          <svg
            className="w-3 h-3 flex-shrink-0 text-amber-500 ml-auto"
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
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              lockedIds={lockedIds}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MobileCategoryDropdown = ({ selectedId, onSelect }) => {
  const { categories, lockedIds, loading, error } = useCategories();
  const [open, setOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(loadExpanded);
  const dropdownRef = useRef(null);

  // Persist expand/collapse state to localStorage
  useEffect(() => {
    saveExpanded(expandedFolders);
  }, [expandedFolders]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleFolder = useCallback((folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  }, []);

  // Build the navigable flat list and find current index
  const paginatableNodes = flattenPaginatable(categories);
  const totalPages = paginatableNodes.length;
  const currentIndex = selectedId ? paginatableNodes.findIndex((n) => n.id === selectedId) : -1;

  const goPrev = () => {
    if (currentIndex > 0) {
      onSelect(paginatableNodes[currentIndex - 1].id);
    }
  };

  const goNext = () => {
    if (currentIndex < totalPages - 1) {
      onSelect(paginatableNodes[currentIndex + 1].id);
    }
  };

  // Derive display values from selectedId (no closure staleness issues)
  const selectedNode = selectedId ? findNode(categories, selectedId) : null;
  const breadcrumbPath = selectedId ? (findPath(categories, selectedId) || []) : [];

  const handleSelectFromList = (id) => {
    onSelect(id);
    setOpen(false);
  };

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalPages - 1;

  const btnBase =
    'flex items-center justify-center rounded-lg text-sm font-medium transition-colors flex-shrink-0';

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Outer row: prev button | trigger | next button */}
      <div className="flex items-center gap-2 w-full">
        {/* Prev button */}
        <button
          onClick={goPrev}
          disabled={!canGoPrev}
          className={`${btnBase} w-10 h-10 bg-warm-bg text-text2 hover:bg-primary-light/40 hover:text-primary disabled:opacity-25 disabled:cursor-not-allowed`}
          title="上一个分类"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 min-w-0 px-3 py-2 bg-white border border-warm-border rounded-lg text-sm text-left flex items-center justify-between hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center min-w-0 flex-1 mr-2">
            {breadcrumbPath.length > 0 && (
              <span className="text-xs text-text2/60 truncate flex-shrink-0">
                {breadcrumbPath.join(' / ')}
                <span className="mx-1 text-text2/40">/</span>
              </span>
            )}
            <span className={`${selectedId ? 'text-text1 font-medium text-sm' : 'text-text2/60 text-sm'} truncate`}>
              {selectedNode ? selectedNode.name : '全部好物'}
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-text2 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Next button */}
        <button
          onClick={goNext}
          disabled={!canGoNext}
          className={`${btnBase} w-10 h-10 bg-warm-bg text-text2 hover:bg-primary-light/40 hover:text-primary disabled:opacity-25 disabled:cursor-not-allowed`}
          title="下一个分类"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Dropdown panel — tree only, no pagination inside */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-warm-border rounded-xl shadow-lg flex flex-col max-h-[65vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-warm-border/60 flex-shrink-0">
            <span className="text-xs font-semibold text-text2 uppercase tracking-wider">分类浏览</span>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-warm-bg text-text2 hover:text-text1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* "全部好物" button */}
          <div className="px-2 pt-2 flex-shrink-0">
            <button
              onClick={() => handleSelectFromList(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedId === null
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text2 hover:bg-primary-light/40'
              }`}
            >
              全部好物
            </button>
          </div>

          {/* Scrollable tree */}
          <div className="flex-1 overflow-y-auto py-1 px-1">
            {loading ? (
              <div className="px-3 py-4 text-center text-sm text-text2">加载中...</div>
            ) : error ? (
              <div className="px-3 py-4 text-center text-sm text-red-500">加载失败</div>
            ) : (
              <div className="space-y-0.5">
                {categories.map((node) => (
                  <CategoryNode
                    key={node.id}
                    node={node}
                    depth={0}
                    selectedId={selectedId}
                    onSelect={handleSelectFromList}
                    expandedFolders={expandedFolders}
                    onToggle={toggleFolder}
                    lockedIds={lockedIds}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileCategoryDropdown;
