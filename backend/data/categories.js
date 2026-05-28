'use strict';

const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, 'categories.json');

let meta = {
  locked_category_ids: [],
  random_schedule: { enabled: false, period_hours: 24, lock_count: 3 },
  no_review_mode: false
};
let CATEGORY_TREE = [];

const loadData = () => {
  const rawData = fs.readFileSync(categoriesPath, 'utf-8');
  const data = JSON.parse(rawData);
  meta = {
    locked_category_ids: Array.isArray(data.locked_category_ids) ? data.locked_category_ids : [],
    random_schedule: data.random_schedule || { enabled: false, period_hours: 24, lock_count: 3 },
    no_review_mode: !!data.no_review_mode
  };
  CATEGORY_TREE = data._categories || [];
};

loadData();

const leafCategories = [];
const excludedLeafIds = [];
const collectLeaves = (nodes, parentExcluded = false) => {
  for (const node of nodes) {
    const isExcluded = parentExcluded || !!node.excluded_from_home;
    if (node.children) {
      collectLeaves(node.children, isExcluded);
    } else {
      leafCategories.push(node.id);
      if (isExcluded) {
        excludedLeafIds.push(node.id);
      }
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

const isLocked = (id) => meta.locked_category_ids.includes(id);

const getLockedIds = () => [...meta.locked_category_ids];

const getRandomSchedule = () => ({ ...meta.random_schedule });

const saveLockData = () => {
  const rawData = fs.readFileSync(categoriesPath, 'utf-8');
  const data = JSON.parse(rawData);
  data.locked_category_ids = meta.locked_category_ids;
  data.random_schedule = meta.random_schedule;
  data.no_review_mode = meta.no_review_mode;
  fs.writeFileSync(categoriesPath, JSON.stringify(data, null, 2), 'utf-8');
};

const setLockedIds = (ids) => {
  meta.locked_category_ids = ids;
  saveLockData();
};

const setRandomSchedule = (schedule) => {
  meta.random_schedule = { ...meta.random_schedule, ...schedule };
  saveLockData();
};

const getNoReviewMode = () => meta.no_review_mode;

const setNoReviewMode = (enabled) => {
  meta.no_review_mode = !!enabled;
  saveLockData();
};

const getLeafIds = () => [...leafCategories];

const getExcludedLeafIds = () => [...excludedLeafIds];

const reload = () => {
  leafCategories.length = 0;
  excludedLeafIds.length = 0;
  loadData();
  collectLeaves(CATEGORY_TREE);
};

module.exports = {
  CATEGORY_TREE,
  leafCategories,
  isValidCategory,
  getCategoryById,
  isLocked,
  getLockedIds,
  getRandomSchedule,
  setLockedIds,
  setRandomSchedule,
  getLeafIds,
  getExcludedLeafIds,
  getNoReviewMode,
  setNoReviewMode,
  reload
};
