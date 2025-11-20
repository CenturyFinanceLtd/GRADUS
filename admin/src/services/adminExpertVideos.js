import apiClient from './apiClient';

export const listAdminExpertVideos = async ({ token } = {}) => {
  const data = await apiClient('/admin/expert-videos', { token });
  return data?.items || [];
};

const requestUploadSignature = async ({ token }) => {
  const data = await apiClient('/admin/expert-videos/upload/signature', { method: 'POST', token });
  return data;
};

const uploadVideoDirectly = async ({ file, signature }) => {
  if (!signature?.uploadUrl) {
    throw new Error('Missing direct upload endpoint');
  }
  const form = new FormData();
  form.append('file', file);
  if (signature.folder) {
    form.append('folder', signature.folder);
  }
  form.append('timestamp', String(signature.timestamp));
  form.append('api_key', signature.apiKey);
  form.append('signature', signature.signature);

  const response = await fetch(signature.uploadUrl, {
    method: 'POST',
    body: form,
    credentials: 'omit',
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = body?.error?.message || body?.message || 'Cloudinary upload failed';
    const error = new Error(message);
    error.status = response.status;
    error.data = body;
    throw error;
  }

  return body;
};

const finalizeExpertVideo = async ({ token, payload, uploadResult }) => {
  const data = await apiClient('/admin/expert-videos/upload/direct', {
    method: 'POST',
    data: {
      ...payload,
      upload: {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url || uploadResult.url,
        folder: uploadResult.folder,
        resource_type: uploadResult.resource_type,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
        duration: uploadResult.duration,
        bytes: uploadResult.bytes,
      },
    },
    token,
  });
  return data?.item;
};

export const createAdminExpertVideo = async ({
  token,
  file,
  title,
  subtitle,
  description,
  active = true,
  order = 0,
  onStageChange,
}) => {
  if (!file) {
    throw new Error('Video file is required');
  }
  if (!title || !String(title).trim()) {
    throw new Error('Title is required');
  }

  const emitStage = (stage) => {
    if (typeof onStageChange === 'function') {
      onStageChange(stage);
    }
  };

  emitStage('signature');
  const signature = await requestUploadSignature({ token });

  emitStage('upload');
  const uploadResult = await uploadVideoDirectly({ file, signature });

  emitStage('finalize');
  const item = await finalizeExpertVideo({
    token,
    payload: { title, subtitle, description, active, order },
    uploadResult,
  });
  emitStage(null);
  return item;
};

export const updateAdminExpertVideo = async ({ token, id, patch }) => {
  const data = await apiClient(`/admin/expert-videos/${id}`, { method: 'PATCH', data: patch, token });
  return data?.item;
};

export const deleteAdminExpertVideo = async ({ token, id }) => {
  const data = await apiClient(`/admin/expert-videos/${id}`, { method: 'DELETE', token });
  return data?.message === 'Deleted';
};

export default {
  listAdminExpertVideos,
  createAdminExpertVideo,
  updateAdminExpertVideo,
  deleteAdminExpertVideo,
};
