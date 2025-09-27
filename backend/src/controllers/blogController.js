const asyncHandler = require('express-async-handler');
const Blog = require('../models/Blog');
const slugify = require('../utils/slugify');

const buildUniqueSlug = async (title, currentId) => {
  const baseSlug = slugify(title);
  if (!baseSlug) {
    throw new Error('Unable to generate slug from title');
  }

  let uniqueSlug = baseSlug;
  let suffix = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const slugFilter = { slug: uniqueSlug };
    if (currentId) {
      slugFilter._id = {};
      slugFilter._id.$ne = currentId;
    }

    const existing = await Blog.findOne(slugFilter).select('_id').lean();

    if (!existing) {
      return uniqueSlug;
    }

    uniqueSlug = baseSlug + '-' + suffix;
    suffix += 1;

    if (suffix > 1000) {
      throw new Error('Unable to generate a unique slug, please adjust the title');
    }
  }
};

const normalizeTags = (input) => {
  if (!input) {
    return [];
  }

  let rawTags = input;

  if (typeof rawTags === 'string') {
    const trimmed = rawTags.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        rawTags = JSON.parse(trimmed);
      } catch (error) {
        rawTags = trimmed.split(',');
      }
    } else {
      rawTags = trimmed.split(',');
    }
  }

  if (!Array.isArray(rawTags)) {
    return [];
  }

  return rawTags
    .map((tag) => (tag ? String(tag) : ''))
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
    .filter((tag, index, array) => array.findIndex((value) => value.toLowerCase() === tag.toLowerCase()) === index);
};

const createBlog = asyncHandler(async (req, res) => {
  const { title, category, content, excerpt, author, publishedAt, tags } = req.body;

  if (!title || !title.trim()) {
    res.status(400);
    throw new Error('Title is required');
  }

  if (!category || !category.trim()) {
    res.status(400);
    throw new Error('Category is required');
  }

  if (!content || !content.trim()) {
    res.status(400);
    throw new Error('Content is required');
  }

  const slug = await buildUniqueSlug(title);
  const featuredImage = req.file ? '/blog-images/' + req.file.filename : null;

  const normalizedTags = normalizeTags(tags);

  const blog = await Blog.create({
    title: title.trim(),
    slug,
    category: category.trim(),
    excerpt: excerpt ? excerpt.trim() : undefined,
    content,
    featuredImage,
    author: author && author.trim() ? author.trim() : undefined,
    tags: normalizedTags,
    publishedAt: publishedAt ? new Date(publishedAt) : undefined,
  });

  res.status(201).json(blog);
});

const getBlogs = asyncHandler(async (req, res) => {
  const { limit, category } = req.query;
  const numericLimit = limit ? Math.min(parseInt(limit, 10) || 20, 100) : 20;
  const filter = {};

  if (category) {
    filter.category = new RegExp('^' + category + '$', 'i');
  }

  const blogs = await Blog.find(filter)
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(numericLimit)
    .select('-__v');

  res.json({ items: blogs });
});

const hasIncrementedView = (req, blogId) => {
  if (!req.session) {
    return false;
  }

  if (!Array.isArray(req.session.viewedBlogs)) {
    req.session.viewedBlogs = [];
  }

  const key = String(blogId);

  if (req.session.viewedBlogs.includes(key)) {
    return true;
  }

  req.session.viewedBlogs.push(key);

  if (req.session.viewedBlogs.length > 200) {
    req.session.viewedBlogs = req.session.viewedBlogs.slice(-200);
  }

  return false;
};

const incrementViewCount = async (blog) => {
  try {
    await Blog.updateOne({ _id: blog._id }, { $inc: { 'meta.views': 1 } });
  } catch (error) {
    // silently ignore view increment failures
  }
};

const getBlogBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const blog = await Blog.findOne({ slug }).select('-__v');

  if (!blog) {
    res.status(404);
    throw new Error('Blog not found');
  }

  if (!hasIncrementedView(req, blog._id)) {
    incrementViewCount(blog);
    blog.meta = blog.meta || {};
    blog.meta.views = (blog.meta.views || 0) + 1;
  }

  res.json(blog);
});

module.exports = {
  createBlog,
  getBlogs,
  getBlogBySlug,
};
