import apiClient from './apiClient';

export const uploadImage = async ({ file, token }) => {
  if (!file) throw new Error('file is required');
  const form = new FormData();
  form.append('file', file);
  const data = await apiClient('/admin/uploads/image', { method: 'POST', data: form, token });
  const item = data?.item || data;
  return {
    url: item?.url || '',
    publicId: item?.publicId || '',
    width: item?.width,
    height: item?.height,
    format: item?.format,
  };
};

export const uploadToSupabase = async ({ file, token }) => {
  if (!file) throw new Error('file is required');
  const form = new FormData();
  form.append('file', file);
  const data = await apiClient('/admin/uploads/landing-page-image', { method: 'POST', data: form, token });
  const item = data?.item || data;
  return {
    url: item?.url || '',
    path: item?.path || '',
  };
};

export default { uploadImage, uploadToSupabase };

