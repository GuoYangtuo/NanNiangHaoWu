'use strict';

const fs = require('fs');
const path = require('path');

let data = require('./categories.json');

let CATEGORY_TREE = data;

const leafCategories = [];
const collectLeaves = (nodes) => {
  for (const node of nodes) {
    if (node.children) {
      collectLeaves(node.children);
    } else {
      leafCategories.push(node.id);
    }
  }
};
collectLeaves(CATEGORY_TREE);

const isValidCategory = (id) => leafCategories.includes(id);

const getCategoryById = (id, nodes = CATEGORY_TREE, ancestors = []) => {
  for (const node of nodes) {
    if (node.id === id) {
      return {
        ...node,
        breadcrumbs: ancestors.map((a) => a.name)
      };
    }
    if (node.children) {
      const found = getCategoryById(id, node.children, [...ancestors, node]);
      if (found) return found;
    }
  }
  return null;
};

const reload = () => {
  // 清除 require 缓存，强制重新加载
  delete require.cache[require.resolve('./categories.json')];
  data = require('./categories.json');
  CATEGORY_TREE = data;
  leafCategories.length = 0;
  collectLeaves(CATEGORY_TREE);
};

module.exports = {
  CATEGORY_TREE,
  leafCategories,
  isValidCategory,
  getCategoryById,
  reload
};
