import apiClient from './apiClient';

export const listAdminBanners = async ({ token } = {}) => {
  const data = await apiClient('/admin/banners', { token });
  return data?.items || [];
};

export const createAdminBanner = async ({
  token,
  desktopFile,
  mobileFile,
  title,
  subtitle,
  description,
  ctaLabel,
  ctaUrl,
  order = 0,
  active = true,
}) => {
  if (!desktopFile) throw new Error('Desktop banner image file is required');
  const form = new FormData();
  form.append('desktopImage', desktopFile);
  if (mobileFile) {
    form.append('mobileImage', mobileFile);
  }
  if (title) form.append('title', title);
  if (subtitle) form.append('subtitle', subtitle);
  if (description) form.append('description', description);
  if (ctaLabel) form.append('ctaLabel', ctaLabel);
  if (ctaUrl) form.append('ctaUrl', ctaUrl);
  form.append('order', String(order ?? 0));
  form.append('active', String(Boolean(active)));

  const data = await apiClient('/admin/banners', { method: 'POST', data: form, token });
  return data?.item;
};

export const updateAdminBanner = async ({ token, id, patch = {}, desktopFile, mobileFile }) => {
  if (!id) throw new Error('id is required');

  let payload = patch;
  if (desktopFile || mobileFile) {
    const form = new FormData();
    if (desktopFile) {
      form.append('desktopImage', desktopFile);
    }
    if (mobileFile) {
      form.append('mobileImage', mobileFile);
    }
    Object.entries(patch || {}).forEach(([key, value]) => {
      if (typeof value === 'undefined' || value === null) return;
      form.append(key, typeof value === 'boolean' ? String(value) : String(value));
    });
    payload = form;
  }

  const data = await apiClient(`/admin/banners/${id}`, { method: 'PATCH', data: payload, token });
  return data?.item;
};

export const deleteAdminBanner = async ({ token, id }) => {
  const data = await apiClient(`/admin/banners/${id}`, { method: 'DELETE', token });
  return data?.message === 'Deleted';
};

export default {
  listAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
};
