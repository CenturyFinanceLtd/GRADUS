import apiClient from './apiClient';

export const createBlog = ({ token, data }) =>
  apiClient('/admin/blogs', {
    method: 'POST',
    data,
    token,
  });

export default {
  createBlog,
};
