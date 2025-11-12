import apiClient from './apiClient';

export const listAdminCourses = async ({ token } = {}) => {
  const data = await apiClient('/admin/courses', { token });
  return data?.items || [];
};

export const createAdminCourse = async ({ data: payload, token }) => {
  const data = await apiClient('/admin/courses', { method: 'POST', data: payload, token });
  return data?.course || null;
};

export const updateAdminCourse = async ({ id, data: payload, token }) => {
  const data = await apiClient(`/admin/courses/${id}`, { method: 'PATCH', data: payload, token });
  return data?.course || null;
};

export const deleteAdminCourse = async ({ id, token }) => {
  const data = await apiClient(`/admin/courses/${id}`, { method: 'DELETE', token });
  return data?.message === 'Course deleted';
};

export const bulkCreateCourses = async ({ items = [], token }) => {
  const results = [];
  for (const item of Array.isArray(items) ? items : []) {
    try {
      const created = await createAdminCourse({ data: item, token });
      results.push({ ok: true, item, created });
    } catch (err) {
      results.push({ ok: false, item, error: err?.message || 'Failed' });
    }
  }
  return results;
};

// RAW JSON shape APIs (full document CRUD via slug)
export const listRawCourses = async ({ token } = {}) => {
  const data = await apiClient('/admin/courses/raw', { token });
  return data?.items || [];
};

export const getRawCourseBySlug = async ({ slug, token }) => {
  const data = await apiClient(`/admin/courses/raw/${encodeURIComponent(slug)}`, { token });
  return data?.course || null;
};

export const upsertRawCourse = async ({ data: payload, token }) => {
  const data = await apiClient('/admin/courses/raw', { method: 'POST', data: payload, token });
  return data?.course || null;
};

export const deleteCourseBySlug = async ({ slug, token }) => {
  const data = await apiClient(`/admin/courses/slug/${encodeURIComponent(slug)}`, { method: 'DELETE', token });
  return data?.message === 'Course deleted';
};

export const fetchCourseProgressAdmin = async ({ slug, token, userId } = {}) => {
  if (!slug) {
    return { progress: [], lectureSummary: [] };
  }
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const data = await apiClient(`/admin/courses/progress/${encodeURIComponent(slug)}${query}`, { token });
  return {
    progress: data?.progress || [],
    lectureSummary: data?.lectureSummary || [],
  };
};

export const fetchCourseEnrollmentsAdmin = async ({
  token,
  slug,
  status,
  paymentStatus,
  userId,
} = {}) => {
  const params = new URLSearchParams();
  if (slug) {
    params.append('slug', slug);
  }
  if (status) {
    params.append('status', status);
  }
  if (paymentStatus) {
    params.append('paymentStatus', paymentStatus);
  }
  if (userId) {
    params.append('userId', userId);
  }
  const query = params.toString();
  const endpoint = `/admin/courses/enrollments${query ? `?${query}` : ''}`;
  const data = await apiClient(endpoint, { token });
  return data?.items || [];
};

export default {
  listAdminCourses,
  createAdminCourse,
  updateAdminCourse,
  deleteAdminCourse,
  bulkCreateCourses,
  listRawCourses,
  getRawCourseBySlug,
  upsertRawCourse,
  deleteCourseBySlug,
  fetchCourseProgressAdmin,
  fetchCourseEnrollmentsAdmin,
};
