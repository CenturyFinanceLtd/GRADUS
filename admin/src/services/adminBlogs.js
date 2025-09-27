import apiClient from './apiClient';

export const createBlog = ({ token, data }) =>
  apiClient('/admin/blogs', {
    method: 'POST',
    data,
    token,
  });

export const fetchBlogs = ({ token, search, category } = {}) => {
  const params = new URLSearchParams();

  if (search) {
    params.append('search', search);
  }

  if (category) {
    params.append('category', category);
  }

  const query = params.toString();
  const endpoint = '/admin/blogs' + (query ? '?' + query : '');

  return apiClient(endpoint, {
    method: 'GET',
    token,
  });
};

export const fetchBlogDetails = ({ blogId, token }) =>
  apiClient('/admin/blogs/' + blogId, {
    method: 'GET',
    token,
  });

export const fetchBlogComments = ({ blogId, token }) =>
  apiClient('/admin/blogs/' + blogId + '/comments', {
    method: 'GET',
    token,
  });

export const replyToBlogComment = ({ blogId, data, token }) =>
  apiClient('/admin/blogs/' + blogId + '/comments', {
    method: 'POST',
    data,
    token,
  });

export const deleteBlogComment = ({ blogId, commentId, token }) =>
  apiClient('/admin/blogs/' + blogId + '/comments/' + commentId, {
    method: 'DELETE',
    token,
  });

export default {
  createBlog,
  fetchBlogs,
  fetchBlogDetails,
  fetchBlogComments,
  replyToBlogComment,
  deleteBlogComment,
};
