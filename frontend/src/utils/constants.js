// 分类树结构（前端常量，不存储在数据库中）
export const CATEGORY_TREE = [
  {
    id: 'folder-dress',
    name: '小裙子',
    type: 'folder',
    children: [
      { id: 'lolita', name: 'Lolita 小裙子', type: 'leaf', parentName: '小裙子' },
      { id: 'jk', name: 'JK 制服', type: 'leaf', parentName: '小裙子' },
      { id: 'soft-girl', name: '软妹服 / 日常可爱风', type: 'leaf', parentName: '小裙子' },
      { id: 'hanfu', name: '漢服 / 漢元素', type: 'leaf', parentName: '小裙子' },
    ]
  },
  {
    id: 'folder-cosmetics',
    name: '化妆品',
    type: 'folder',
    children: [
      { id: 'foundation', name: '底妆', type: 'leaf', parentName: '化妆品' },
      { id: 'eye-makeup', name: '眼妆', type: 'leaf', parentName: '化妆品' },
      { id: 'lip-makeup', name: '唇妆', type: 'leaf', parentName: '化妆品' },
      { id: 'nail', name: '指甲油 / 美甲', type: 'leaf', parentName: '化妆品' },
    ]
  },
  {
    id: 'folder-bodycare',
    name: '洗护用品',
    type: 'folder',
    children: [
      { id: 'body-care', name: '沐浴露 / 身体乳', type: 'leaf', parentName: '洗护用品' },
      { id: 'hair-care', name: '洗发护发', type: 'leaf', parentName: '洗护用品' },
      { id: 'oral-care', name: '口腔护理', type: 'leaf', parentName: '洗护用品' },
    ]
  },
  {
    id: 'folder-plussize',
    name: '大码女装',
    type: 'folder',
    children: [
      { id: 'plus-dress', name: '连衣裙', type: 'leaf', parentName: '大码女装' },
      { id: 'plus-top', name: '上装', type: 'leaf', parentName: '大码女装' },
      { id: 'plus-bottom', name: '下装', type: 'leaf', parentName: '大码女装' },
    ]
  },
  {
    id: 'folder-accessories',
    name: '饰品',
    type: 'folder',
    children: [
      { id: 'hair-accessories', name: '发饰', type: 'leaf', parentName: '饰品' },
      { id: 'earrings', name: '耳饰', type: 'leaf', parentName: '饰品' },
      { id: 'necklace-bracelet', name: '项链 / 手链', type: 'leaf', parentName: '饰品' },
    ]
  },
  {
    id: 'folder-adult',
    name: '情趣玩具',
    type: 'folder',
    children: [
      { id: 'vibrators', name: '按摩棒 / 跳蛋', type: 'leaf', parentName: '情趣玩具' },
      { id: 'lingerie', name: '情趣内衣', type: 'leaf', parentName: '情趣玩具' },
      { id: 'lubes', name: '润滑液 / 辅助用品', type: 'leaf', parentName: '情趣玩具' },
    ]
  }
];

export const API_BASE_URL = '/api';
export const UPLOADS_URL = '/uploads';

export const SITE_NAME = '小南娘好物';

export const STATUS_COLORS = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: '待审核' },
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已通过' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '已拒绝' }
};
