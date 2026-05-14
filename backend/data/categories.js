'use strict';

const fs = require('fs');
const path = require('path');

const data = require('./categories.json');

const CATEGORY_TREE = data;

const leafCategories = [];
CATEGORY_TREE.forEach((folder) => {
  if (folder.children) {
    folder.children.forEach((child) => {
      leafCategories.push(child.id);
    });
  }
});

const isValidCategory = (id) => leafCategories.includes(id);

const getCategoryById = (id) => {
  for (const folder of CATEGORY_TREE) {
    if (folder.children) {
      const child = folder.children.find((c) => c.id === id);
      if (child) {
        return {
          ...child,
          parentName: folder.name
        };
      }
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
