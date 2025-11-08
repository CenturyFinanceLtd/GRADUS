/*
  Blog controller
  - CRUD for blog posts and comments (admin + public facades)
*/
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const BlogComment = require('../models/BlogComment');
const slugify = require('../utils/slugify');
const { cloudinary, blogImagesFolder } = require('../config/cloudinary');

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

const uploadFeaturedImage = (file, slug) => {
  if (!file || !file.buffer) {
    return null;
  }

  const originalNameWithoutExt = file.originalname ? file.originalname.replace(/\.[^/.]+$/, '') : '';
  const fallbackName = slug || originalNameWithoutExt || 'blog-image';
  const safeBaseName = slugify(fallbackName) || 'blog-image';
  const uniqueSuffix = Date.now();
  const publicId = safeBaseName + '-' + uniqueSuffix;

  return new Promise((resolve, reject) => {
    let stream;
    try {
      stream = cloudinary.uploader.upload_stream(
        {
          folder: blogImagesFolder,
          public_id: publicId,
          resource_type: 'image',
          overwrite: false,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
    } catch (error) {
      reject(error);
      return;
    }

    stream.end(file.buffer);
  });
};

const destroyFeaturedImage = async (publicId) => {
  if (!publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    // Best-effort cleanup; failures are logged for observability but ignored
    // eslint-disable-next-line no-console
    console.warn('[cloudinary] Failed to delete blog image', publicId, error.message);
  }
};

const buildCommentTreeData = (comments, { includeEmail = false, includeStatus = false } = {}) => {
  const commentMap = new Map();
  const roots = [];

  comments.forEach((comment) => {
    const id = comment._id.toString();
    commentMap.set(id, {
      id,
      name: comment.name,
      email: comment.email,
      content: comment.content,
      status: comment.status,
      createdAt: comment.createdAt,
      parentCommentId: comment.parentComment ? comment.parentComment.toString() : null,
      replies: [],
      latestActivity: new Date(comment.createdAt).getTime(),
    });
  });

  commentMap.forEach((comment) => {
    if (comment.parentCommentId && commentMap.has(comment.parentCommentId)) {
      commentMap.get(comment.parentCommentId).replies.push(comment);
    } else {
      roots.push(comment);
    }
  });

  const computeLatestActivity = (node) => {
    if (!node.replies || node.replies.length === 0) {
      return node.latestActivity;
    }

    node.replies.forEach((reply) => {
      const childLatest = computeLatestActivity(reply);
      if (childLatest > node.latestActivity) {
        node.latestActivity = childLatest;
      }
    });

    node.replies.sort((a, b) => b.latestActivity - a.latestActivity);
    return node.latestActivity;
  };

  roots.forEach((root) => computeLatestActivity(root));
  roots.sort((a, b) => b.latestActivity - a.latestActivity);

  const stripMeta = (items) =>
    items.map((item) => ({
      id: item.id,
      name: item.name,
      email: includeEmail ? item.email : undefined,
      status: includeStatus ? item.status : undefined,
      content: item.content,
      createdAt: item.createdAt,
      replies: item.replies && item.replies.length > 0 ? stripMeta(item.replies) : [],
    }));

  return stripMeta(roots);
};

const findBlogByIdentifier = (identifier, projection) => {
  const query = mongoose.Types.ObjectId.isValid(identifier)
    ? Blog.findById(identifier)
    : Blog.findOne({ slug: identifier });

  if (projection) {
    query.select(projection);
  }

  return query;
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
  let featuredImage = null;
  let featuredImagePublicId = null;

  if (req.file) {
    try {
      const uploadResult = await uploadFeaturedImage(req.file, slug);
      featuredImage = uploadResult?.secure_url || null;
      featuredImagePublicId = uploadResult?.public_id || null;
    } catch (error) {
      res.status(400);
      throw new Error(error?.message ? 'Failed to upload featured image: ' + error.message : 'Failed to upload featured image');
    }
  }

  const normalizedTags = normalizeTags(tags);

  const blog = await Blog.create({
    title: title.trim(),
    slug,
    category: category.trim(),
    excerpt: excerpt ? excerpt.trim() : undefined,
    content,
    featuredImage: featuredImage || undefined,
    featuredImagePublicId: featuredImagePublicId || undefined,
    author: author && author.trim() ? author.trim() : undefined,
    tags: normalizedTags,
    publishedAt: publishedAt ? new Date(publishedAt) : undefined,
  });

  res.status(201).json(blog);
});

const updateBlog = asyncHandler(async (req, res) => {
  const { blogId } = req.params;
  const { title, category, content, excerpt, author, publishedAt, tags, removeFeaturedImage } = req.body;

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

  const blog = await findBlogByIdentifier(blogId);

  if (!blog) {
    res.status(404);
    throw new Error('Blog not found');
  }

  const slug = await buildUniqueSlug(title, blog._id);
  const normalizedTags = normalizeTags(tags);

  let nextFeaturedImage = blog.featuredImage || null;
  let nextFeaturedImagePublicId = blog.featuredImagePublicId || null;

  const shouldRemoveImage =
    typeof removeFeaturedImage !== 'undefined' && String(removeFeaturedImage).toLowerCase() === 'true';

  if (req.file) {
    try {
      const uploadResult = await uploadFeaturedImage(req.file, slug);
      await destroyFeaturedImage(blog.featuredImagePublicId);
      nextFeaturedImage = uploadResult?.secure_url || null;
      nextFeaturedImagePublicId = uploadResult?.public_id || null;
    } catch (error) {
      res.status(400);
      throw new Error(
        error?.message ? 'Failed to upload featured image: ' + error.message : 'Failed to upload featured image'
      );
    }
  } else if (shouldRemoveImage) {
    await destroyFeaturedImage(blog.featuredImagePublicId);
    nextFeaturedImage = null;
    nextFeaturedImagePublicId = null;
  }

  blog.title = title.trim();
  blog.slug = slug;
  blog.category = category.trim();
  blog.excerpt = excerpt && excerpt.trim() ? excerpt.trim() : undefined;
  blog.content = content;
  blog.author = author && author.trim() ? author.trim() : undefined;
  blog.tags = normalizedTags;
  if (publishedAt) {
    blog.publishedAt = new Date(publishedAt);
  }
  blog.featuredImage = nextFeaturedImage || undefined;
  blog.featuredImagePublicId = nextFeaturedImagePublicId || undefined;

  const updatedBlog = await blog.save();

  res.json({
    blog: {
      id: updatedBlog._id.toString(),
      title: updatedBlog.title,
      slug: updatedBlog.slug,
      category: updatedBlog.category,
      author: updatedBlog.author,
      tags: updatedBlog.tags || [],
      excerpt: updatedBlog.excerpt,
      content: updatedBlog.content,
      featuredImage: updatedBlog.featuredImage,
      meta: {
        views: updatedBlog.meta?.views || 0,
        comments: updatedBlog.meta?.comments || 0,
      },
      publishedAt: updatedBlog.publishedAt,
      createdAt: updatedBlog.createdAt,
    },
  });
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

const listBlogComments = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const blog = await Blog.findOne({ slug }).select('_id');

  if (!blog) {
    res.status(404);
    throw new Error('Blog not found');
  }

  const comments = await BlogComment.find({ blog: blog._id, status: 'approved' })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ items: buildCommentTreeData(comments) });
});

const createBlogComment = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { name, email, content, parentCommentId } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error('Name is required');
  }

  if (!email || !email.trim()) {
    res.status(400);
    throw new Error('Email is required');
  }

  if (!content || !content.trim()) {
    res.status(400);
    throw new Error('Comment content is required');
  }

  const blog = await Blog.findOne({ slug }).select('_id');

  if (!blog) {
    res.status(404);
    throw new Error('Blog not found');
  }

  let parentComment = null;

  if (parentCommentId) {
    parentComment = await BlogComment.findOne({ _id: parentCommentId, blog: blog._id });
    if (!parentComment) {
      res.status(400);
      throw new Error('Invalid parent comment');
    }
  }

  const comment = await BlogComment.create({
    blog: blog._id,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    content: content.trim(),
    parentComment: parentComment ? parentComment._id : null,
  });

  try {
    await Blog.updateOne({ _id: blog._id }, { $inc: { 'meta.comments': 1 } });
  } catch (error) {
    // ignore comment count increment failure
  }

  res.status(201).json({
    id: comment._id.toString(),
    name: comment.name,
    content: comment.content,
    createdAt: comment.createdAt,
    parentCommentId: comment.parentComment ? comment.parentComment.toString() : null,
    replies: [],
  });
});

const listAdminBlogs = asyncHandler(async (req, res) => {
  const { search, category } = req.query;
  const filter = {};

  if (search) {
    filter.title = new RegExp(search, 'i');
  }

  if (category) {
    filter.category = new RegExp('^' + category + '$', 'i');
  }

  const blogs = await Blog.find(filter)
    .sort({ createdAt: -1 })
    .lean()
    .select('title slug category author tags excerpt featuredImage meta publishedAt createdAt');

  res.json({
    items: blogs.map((blog) => ({
      id: blog._id.toString(),
      title: blog.title,
      slug: blog.slug,
      category: blog.category,
      author: blog.author,
      tags: blog.tags || [],
      excerpt: blog.excerpt,
      featuredImage: blog.featuredImage,
      meta: {
        views: blog.meta?.views || 0,
        comments: blog.meta?.comments || 0,
      },
      publishedAt: blog.publishedAt,
      createdAt: blog.createdAt,
    })),
  });
});

const getAdminBlogDetails = asyncHandler(async (req, res) => {
  const { blogId } = req.params;
  const blog = await findBlogByIdentifier(blogId);

  if (!blog) {
    res.status(404);
    throw new Error('Blog not found');
  }

  res.json({
    blog: {
      id: blog._id.toString(),
      title: blog.title,
      slug: blog.slug,
      category: blog.category,
      author: blog.author,
      tags: blog.tags || [],
      excerpt: blog.excerpt,
      content: blog.content,
      featuredImage: blog.featuredImage,
      meta: {
        views: blog.meta?.views || 0,
        comments: blog.meta?.comments || 0,
      },
      publishedAt: blog.publishedAt,
      createdAt: blog.createdAt,
    },
  });
});

const listAdminBlogComments = asyncHandler(async (req, res) => {
  const { blogId } = req.params;
  const blog = await findBlogByIdentifier(blogId, '_id');

  if (!blog) {
    res.status(404);
    throw new Error('Blog not found');
  }

  const comments = await BlogComment.find({ blog: blog._id })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ items: buildCommentTreeData(comments, { includeEmail: true, includeStatus: true }) });
});

const createAdminBlogComment = asyncHandler(async (req, res) => {
  const { blogId } = req.params;
  const { content, parentCommentId } = req.body;

  if (!content || !content.trim()) {
    res.status(400);
    throw new Error('Comment content is required');
  }

  const blog = await findBlogByIdentifier(blogId, '_id');

  if (!blog) {
    res.status(404);
    throw new Error('Blog not found');
  }

  let parentComment = null;

  if (parentCommentId) {
    parentComment = await BlogComment.findOne({ _id: parentCommentId, blog: blog._id });
    if (!parentComment) {
      res.status(400);
      throw new Error('Invalid parent comment');
    }
  }

  const admin = req.admin;
  const comment = await BlogComment.create({
    blog: blog._id,
    name: admin?.fullName || admin?.name || admin?.email || 'Admin',
    email: admin?.email || 'admin@gradus.local',
    content: content.trim(),
    parentComment: parentComment ? parentComment._id : null,
  });

  await Blog.updateOne({ _id: blog._id }, { $inc: { 'meta.comments': 1 } }).catch(() => {});

  res.status(201).json({
    id: comment._id.toString(),
    name: comment.name,
    email: comment.email,
    content: comment.content,
    createdAt: comment.createdAt,
    parentCommentId: comment.parentComment ? comment.parentComment.toString() : null,
    replies: [],
  });
});

const collectDescendantIds = (commentRelations, rootId) => {
  const childrenMap = new Map();

  commentRelations.forEach((comment) => {
    const parentId = comment.parentComment ? comment.parentComment.toString() : null;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId).push(comment._id.toString());
  });

  const traverse = (id) => {
    const ids = [id];
    const children = childrenMap.get(id) || [];
    children.forEach((childId) => {
      ids.push(...traverse(childId));
    });
    return ids;
  };

  return traverse(rootId);
};

const deleteAdminBlogComment = asyncHandler(async (req, res) => {
  const { blogId, commentId } = req.params;
  const blog = await findBlogByIdentifier(blogId, '_id');

  if (!blog) {
    res.status(404);
    throw new Error('Blog not found');
  }

  const comment = await BlogComment.findOne({ _id: commentId, blog: blog._id });

  if (!comment) {
    res.status(404);
    throw new Error('Comment not found');
  }

  const relations = await BlogComment.find({ blog: blog._id })
    .select('_id parentComment')
    .lean();

  const idsToDelete = collectDescendantIds(relations, comment._id.toString());

  await BlogComment.deleteMany({ _id: { $in: idsToDelete } });
  const totalComments = await BlogComment.countDocuments({ blog: blog._id });
  await Blog.updateOne({ _id: blog._id }, { 'meta.comments': totalComments }).catch(() => {});

  res.json({ removed: idsToDelete.length });
});

const deleteAdminBlog = asyncHandler(async (req, res) => {
  const { blogId } = req.params;
  const blog = await findBlogByIdentifier(blogId, '_id featuredImagePublicId');

  if (!blog) {
    res.status(404);
    throw new Error('Blog not found');
  }

  await destroyFeaturedImage(blog.featuredImagePublicId);
  await Blog.deleteOne({ _id: blog._id });
  await BlogComment.deleteMany({ blog: blog._id }).catch(() => {});

  res.json({ success: true });
});

module.exports = {
  createBlog,
  updateBlog,
  getBlogs,
  getBlogBySlug,
  listBlogComments,
  createBlogComment,
  listAdminBlogs,
  getAdminBlogDetails,
  listAdminBlogComments,
  createAdminBlogComment,
  deleteAdminBlogComment,
  deleteAdminBlog,
};
