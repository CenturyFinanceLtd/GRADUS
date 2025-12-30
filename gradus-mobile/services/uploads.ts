import { edgeRequest } from "@/lib/edgeClient";

export type UploadResult = {
  url: string;
  publicId?: string;
  assetId?: string;
  width?: number;
  height?: number;
  format?: string;
};

export type UploadFile = {
  uri: string;
  name: string;
  type: string;
};

export const uploadImage = async (file: UploadFile, folder = "uploads") => {
  const formData = new FormData();
  formData.append("file", file as any);

  return edgeRequest<UploadResult>(
    `/cloudinary-api/upload?folder=${encodeURIComponent(folder)}`,
    {
      method: "POST",
      body: formData,
    }
  );
};
