'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('categories', [
      // 小裙子
      { name: 'Lolita 小裙子', slug: 'lolita', parent_id: 1, sort_order: 1 },
      { name: 'JK 制服', slug: 'jk', parent_id: 1, sort_order: 2 },
      { name: '软妹服 / 日常可爱风', slug: 'soft-girl', parent_id: 1, sort_order: 3 },
      { name: '漢服 / 漢元素', slug: 'hanfu', parent_id: 1, sort_order: 4 },
      // 化妆品
      { name: '底妆', slug: 'foundation', parent_id: 2, sort_order: 1 },
      { name: '眼妆', slug: 'eye-makeup', parent_id: 2, sort_order: 2 },
      { name: '唇妆', slug: 'lip-makeup', parent_id: 2, sort_order: 3 },
      { name: '指甲油 / 美甲', slug: 'nail', parent_id: 2, sort_order: 4 },
      // 洗护用品
      { name: '沐浴露 / 身体乳', slug: 'body-care', parent_id: 3, sort_order: 1 },
      { name: '洗发护发', slug: 'hair-care', parent_id: 3, sort_order: 2 },
      { name: '口腔护理', slug: 'oral-care', parent_id: 3, sort_order: 3 },
      // 大码女装
      { name: '连衣裙', slug: 'plus-size-dress', parent_id: 4, sort_order: 1 },
      { name: '上装', slug: 'plus-size-top', parent_id: 4, sort_order: 2 },
      { name: '下装', slug: 'plus-size-bottom', parent_id: 4, sort_order: 3 },
      // 饰品
      { name: '发饰', slug: 'hair-accessories', parent_id: 5, sort_order: 1 },
      { name: '耳饰', slug: 'earrings', parent_id: 5, sort_order: 2 },
      { name: '项链 / 手链', slug: 'necklace-bracelet', parent_id: 5, sort_order: 3 },
      // 情趣玩具
      { name: '按摩棒 / 跳蛋', slug: 'vibrators', parent_id: 6, sort_order: 1 },
      { name: '情趣内衣', slug: 'lingerie', parent_id: 6, sort_order: 2 },
      { name: '润滑液 / 辅助用品', slug: 'lubes', parent_id: 6, sort_order: 3 }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('categories', null, {});
  }
};
