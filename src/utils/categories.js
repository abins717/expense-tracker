export const DEFAULT_CATEGORIES = ['Food', 'Rent', 'Miscellaneous', 'Utilities', 'Entertainment'];
export const REMOVED_CATEGORY_NAMES = ['salary', 'income'];

export const normalizeCategoryName = (category) => {
  const cleanName = (category || '').trim();
  if (!cleanName) return 'Miscellaneous';
  if (cleanName.toLowerCase() === 'misc') return 'Miscellaneous';
  // Auto-capitalize first letter of each word
  return cleanName.replace(/\b\w/g, (c) => c.toUpperCase());
};

export const isRemovedCategory = (category) =>
  REMOVED_CATEGORY_NAMES.includes(normalizeCategoryName(category).toLowerCase());

export const isDefaultCategory = (category) =>
  DEFAULT_CATEGORIES.includes(normalizeCategoryName(category));

export const uniqueCategories = (categoryList = []) => {
  const merged = [...DEFAULT_CATEGORIES];
  categoryList.forEach((category) => {
    const cleanName = normalizeCategoryName(category);
    if (isRemovedCategory(cleanName)) return;
    if (!merged.some((item) => item.toLowerCase() === cleanName.toLowerCase())) {
      merged.push(cleanName);
    }
  });
  return merged;
};

// Deterministic colour from category name — always same colour for same name
const PALETTE = [
  { from: '#f97316', to: '#fb923c', solid: '#f97316' }, // orange
  { from: '#a855f7', to: '#c084fc', solid: '#a855f7' }, // purple
  { from: '#06b6d4', to: '#67e8f9', solid: '#06b6d4' }, // cyan
  { from: '#f43f5e', to: '#fb7185', solid: '#f43f5e' }, // rose
  { from: '#84cc16', to: '#bef264', solid: '#84cc16' }, // lime
  { from: '#eab308', to: '#fde047', solid: '#eab308' }, // yellow
  { from: '#14b8a6', to: '#5eead4', solid: '#14b8a6' }, // teal
  { from: '#e879f9', to: '#f0abfc', solid: '#e879f9' }, // fuchsia
  { from: '#f59e0b', to: '#fcd34d', solid: '#f59e0b' }, // amber
  { from: '#0ea5e9', to: '#7dd3fc', solid: '#0ea5e9' }, // sky
];

const FIXED_COLORS = {
  food:          { from: '#10b981', to: '#14b8a6', solid: '#10b981' }, // emerald
  rent:          { from: '#8b5cf6', to: '#6366f1', solid: '#8b5cf6' }, // violet
  utilities:     { from: '#f59e0b', to: '#f97316', solid: '#f59e0b' }, // amber
  entertainment: { from: '#ec4899', to: '#f43f5e', solid: '#ec4899' }, // pink
  miscellaneous: { from: '#3b82f6', to: '#06b6d4', solid: '#3b82f6' }, // blue
};

export const getCategoryColor = (name) => {
  const key = normalizeCategoryName(name).toLowerCase();
  if (FIXED_COLORS[key]) return FIXED_COLORS[key];
  // Hash name to a palette index so same name always gets same colour
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
};
