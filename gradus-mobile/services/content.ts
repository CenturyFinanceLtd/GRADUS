import { edgeRequest } from "@/lib/edgeClient";

export type BannerItem = {
  id: string;
  title?: string;
  subtitle?: string;
  description?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
};

export type TestimonialItem = {
  id: string;
  name?: string;
  role?: string;
  company?: string;
  quote?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
};

export type ExpertVideoItem = {
  id: string;
  title?: string;
  subtitle?: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
};

export type WhyGradusVideo = {
  id: string;
  title?: string;
  subtitle?: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
};

export type GalleryItem = {
  id: string;
  title?: string;
  category?: string;
  imageUrl?: string;
};

type ItemsResponse<T> = {
  items: T[];
};

export const fetchBanners = async () => {
  const response = await edgeRequest<ItemsResponse<BannerItem>>("/content-api/banners");
  return response.items || [];
};

export const fetchTestimonials = async () => {
  const response = await edgeRequest<ItemsResponse<TestimonialItem>>("/content-api/testimonials");
  return response.items || [];
};

export const fetchExpertVideos = async () => {
  const response = await edgeRequest<ItemsResponse<ExpertVideoItem>>("/content-api/expert-videos");
  return response.items || [];
};

export const fetchWhyGradusVideo = async () => {
  const response = await edgeRequest<{ item: WhyGradusVideo | null }>("/content-api/why-gradus-video");
  return response.item;
};

export const fetchGallery = async (category?: string, limit?: number) => {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (limit) params.set("limit", String(limit));
  const query = params.toString();
  const response = await edgeRequest<{ items: GalleryItem[] }>(
    `/content-api/gallery${query ? `?${query}` : ""}`
  );
  return response.items || [];
};

export const requestCallback = async (payload: {
  name?: string;
  email?: string;
  phone?: string;
}) => {
  return edgeRequest("/site-services-api/callback-requests", {
    method: "POST",
    body: payload,
  });
};
