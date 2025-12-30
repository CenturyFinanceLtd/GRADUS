import { edgeRequest } from "@/lib/edgeClient";

export type CourseItem = {
  _id: string;
  slug: string;
  name: string;
  programme?: string;
  programmeSlug?: string;
  courseSlug?: string;
  subtitle?: string;
  priceINR?: number;
  image?: { url?: string };
  imageUrl?: string;
  duration?: string;
  level?: string;
  mode?: string;
  stats?: { mode?: string; level?: string; duration?: string };
  hero?: { priceINR?: number; enrolledText?: string };
  learn?: string[];
  aboutProgram?: string[];
  instructors?: Array<{ name?: string; subtitle?: string }>;
};

type CoursesResponse = {
  items: CourseItem[];
};

type CourseResponse = {
  course: CourseItem & {
    isEnrolled?: boolean;
    enrollment?: Record<string, unknown> | null;
  };
};

export type CourseModule = {
  title?: string;
  weeksLabel?: string;
  topics?: string[];
  outcome?: string;
  sections?: Array<{
    title?: string;
    lectures?: Array<{
      lectureId?: string;
      title?: string;
      notes?: {
        fileUrl?: string;
        url?: string;
        secureUrl?: string;
      };
      video?: {
        secure_url?: string;
        url?: string;
      };
    }>;
  }>;
};

export type LiveSession = {
  id: string;
  title?: string;
  start_time?: string;
  end_time?: string;
  scheduled_for?: string;
  started_at?: string;
  ended_at?: string;
  meeting_link?: string;
  meetingLink?: string;
  livekit_room_name?: string;
  status?: string;
};

export const fetchCourses = async () => {
  const response = await edgeRequest<CoursesResponse>("/courses-api");
  return response.items || [];
};

export const fetchCourse = async (slug: string, token?: string) => {
  const response = await edgeRequest<CourseResponse>(
    `/courses-api/${encodeURIComponent(slug)}`,
    token ? { token } : undefined
  );
  return response.course;
};

export const fetchCourseModules = async (slug: string, token: string) => {
  const response = await edgeRequest<{ modules: CourseModule[] }>(
    `/courses-api/modules/${encodeURIComponent(slug)}`,
    { token }
  );
  return response.modules || [];
};

export const fetchCourseProgress = async (slug: string, token: string) => {
  const response = await edgeRequest<{ progress: Record<string, unknown> }>(
    `/courses-api/progress/${encodeURIComponent(slug)}`,
    { token }
  );
  return response.progress || {};
};

export const enrollInCourse = async (slug: string, token: string) => {
  return edgeRequest<{ message: string }>(
    `/courses-api/enroll/${encodeURIComponent(slug)}`,
    { method: "POST", token }
  );
};

export const fetchActiveLiveSession = async (slug: string) => {
  return edgeRequest<LiveSession | null>(
    `/courses-api/live/sessions/course/${encodeURIComponent(slug)}/active`
  );
};
