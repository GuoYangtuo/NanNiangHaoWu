'use strict';

const fs = require('fs');
const path = require('path');

const data = require('./categories.json');

const CATEGORY_TREE = data;

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

module.exports = {
  CATEGORY_TREE,
  leafCategories,
  isValidCategory,
  getCategoryById
};
