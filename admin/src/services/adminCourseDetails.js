import apiClient from './apiClient';

const buildSlugQuery = (slug) => {
  const s = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
  if (!s) throw new Error('Course slug is required');
  const params = new URLSearchParams();
  params.set('slug', s);
  return `?${params.toString()}`;
};

export const fetchCourseDetail = async ({ slug, token }) => {
  const data = await apiClient(`/admin/course-details/${buildSlugQuery(slug)}`, { token });
  return data;
};

export const saveCourseDetail = async ({ slug, data: payload, token }) => {
  const response = await apiClient(`/admin/course-details/${buildSlugQuery(slug)}`, {
    method: 'PUT',
    data: payload,
    token,
  });
  return response;
};

export const uploadLectureVideo = async ({ slug, file, programme, token }) => {
  if (!file) throw new Error('file is required');
  const params = new URLSearchParams();
  if (programme) params.set('programme', programme);
  if (slug) params.set('slug', slug.trim().toLowerCase());
  const query = params.toString() ? `?${params.toString()}` : '';
  const form = new FormData();
  form.append('file', file);
  const data = await apiClient(`/admin/course-details/lectures/upload${query}`, {
    method: 'POST',
    data: form,
    token,
  });
  return data?.asset || null;
};

export default {
  fetchCourseDetail,
  saveCourseDetail,
  uploadLectureVideo,
};
