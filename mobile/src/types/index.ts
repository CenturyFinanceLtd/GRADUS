/**
 * User type definition based on backend user model
 */
export interface User {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    profileImage?: string;
    role?: string;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Authentication response from login/register
 */
export interface AuthResponse {
    success: boolean;
    token: string;
    user: User;
    message?: string;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
    email: string;
    password: string;
}

/**
 * Registration data
 */
export interface RegisterData {
    name: string;
    email: string;
    phone: string;
    password: string;
}

/**
 * Course type definition
 */
export interface Course {
    _id: string;
    title: string;
    slug: string;
    description?: string;
    shortDescription?: string;
    thumbnail?: string;
    price?: number;
    discountedPrice?: number;
    duration?: string;
    category?: string;
    instructor?: {
        name: string;
        image?: string;
    };
    rating?: number;
    enrolledCount?: number;
    curriculum?: CourseModule[];
    isPublished?: boolean;
}

export interface CourseModule {
    _id: string;
    title: string;
    lessons: Lesson[];
}

export interface Lesson {
    _id: string;
    title: string;
    type: 'video' | 'article' | 'quiz' | 'assignment';
    duration?: string;
    isPreview?: boolean;
}

/**
 * Blog post type
 */
export interface Blog {
    _id: string;
    title: string;
    slug: string;
    content?: string;
    excerpt?: string;
    featuredImage?: string;
    author?: {
        name: string;
        image?: string;
    };
    category?: string;
    tags?: string[];
    publishedAt?: string;
    readTime?: number;
}

/**
 * Event type
 */
export interface Event {
    _id: string;
    title: string;
    slug: string;
    description?: string;
    image?: string;
    startDate: string;
    endDate?: string;
    location?: string;
    isOnline?: boolean;
    registrationLink?: string;
}

/**
 * Gallery item type
 */
export interface GalleryItem {
    _id: string;
    title?: string;
    image: string;
    category?: string;
}

/**
 * API Error type
 */
export interface ApiError {
    message: string;
    status?: number;
    details?: any;
}
