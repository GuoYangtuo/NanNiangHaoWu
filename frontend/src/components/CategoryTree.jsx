import { useState } from 'react';
import { CATEGORY_TREE } from '../utils/constants';

const CategoryTree = ({ selectedId, onSelect }) => {
  const [expandedFolders, setExpandedFolders] = useState({});

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const handleSelect = (item) => {
    if (item.type === 'folder') {
      toggleFolder(item.id);
    } else {
      onSelect(item.id);
    }
  };

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
        {CATEGORY_TREE.map((folder) => (
          <div key={folder.id}>
            {/* 文件夹节点 */}
            <button
              onClick={() => handleSelect(folder)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedId === folder.id
                  ? 'bg-primary-light text-primary-dark'
                  : 'text-text2 hover:bg-primary-light/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    expandedFolders[folder.id] ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>{folder.name}</span>
              </div>
            </button>

            {/* 子类目列表 */}
            {expandedFolders[folder.id] && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-primary-light/50 pl-3">
                {folder.children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => onSelect(child.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                      selectedId === child.id
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-text2 hover:bg-primary-light/40 hover:text-primary'
                    }`}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
};

export default CategoryTree;
