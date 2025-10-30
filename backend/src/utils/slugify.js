/*
  Create a URL-friendly slug from a string
  - Removes diacritics, non-alphanumerics, trims and collapses dashes
*/
const slugify = (text) => {
  if (!text) {
    return '';
  }

  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

module.exports = slugify;
