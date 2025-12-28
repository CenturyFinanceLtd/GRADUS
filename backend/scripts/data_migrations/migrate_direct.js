require("dotenv").config();
const mongoose = require("mongoose");
const { createClient } = require("@supabase/supabase-js");

// Models
const User = require("../src/models/User");
const Course = require("../src/models/Course");
const Enrollment = require("../src/models/Enrollment");
const Event = require("../src/models/Event");
const AdminUser = require("../src/models/AdminUser");
const Blog = require("../src/models/Blog");
const Job = require("../src/models/Job");
const AssessmentSet = require("../src/models/AssessmentSet");
const { Ticket } = require("../src/models/Ticket");
const EventRegistration = require("../src/models/EventRegistration");
const ExpertVideo = require("../src/models/ExpertVideo");
const GalleryItem = require("../src/models/GalleryItem");
const JobApplication = require("../src/models/JobApplication");
const LandingPage = require("../src/models/LandingPage");
const Notification = require("../src/models/Notification");
const PageMeta = require("../src/models/PageMeta");
const PartnerLogo = require("../src/models/PartnerLogo");
const SiteVisit = require("../src/models/SiteVisit");
const TestimonialVideo = require("../src/models/TestimonialVideo");
const TicketMessage = require("../src/models/TicketMessage");
const UserAuthLog = require("../src/models/UserAuthLog");
const VerificationSession = require("../src/models/VerificationSession");
const WhyGradusVideo = require("../src/models/WhyGradusVideo");

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || process.env.MONGODB_URI
    );
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ Error connecting to MongoDB: ${err.message}`);
    process.exit(1);
  }
};

// --- Mappers ---
// Helper to get ID map
const getIdMap = async (table) => {
  const { data } = await supabase.from(table).select("id, mongo_id");
  const map = {};
  if (data) data.forEach((Row) => (map[Row.mongo_id] = Row.id));
  return map;
};

// --- Migration Functions ---

const migrateGeneric = async (Model, tableName, mapper) => {
  console.log(`🚀 Starting ${tableName} Migration...`);
  const docs = await Model.find({}).lean();
  console.log(`Found ${docs.length} docs to migrate for ${tableName}.`);

  for (const doc of docs) {
    try {
      const payload = await mapper(doc);
      if (payload) {
        const { error } = await supabase
          .from(tableName)
          .upsert(payload, { onConflict: "mongo_id" });
        if (error)
          console.error(
            `Failed to insert into ${tableName} (ID: ${doc._id}):`,
            error.message
          );
      }
    } catch (e) {
      console.error(
        `Error processing ${tableName} doc ${doc._id}: ${e.message}`
      );
    }
  }
  console.log(`✅ ${tableName} Migration Complete.`);
};

// 1. Users
const mapUser = (doc) => ({
  mongo_id: doc._id.toString(),
  first_name: doc.firstName,
  last_name: doc.lastName,
  email: doc.email,
  mobile: doc.mobile,
  whatsapp_number: doc.whatsappNumber,
  password_hash: doc.password,
  email_verified: doc.emailVerified,
  auth_provider: doc.authProvider,
  push_token: doc.pushToken,
  role: doc.role,
  personal_details: doc.personalDetails,
  parent_details: doc.parentDetails,
  education_details: doc.educationDetails,
  job_details: doc.jobDetails,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

// 2. Courses
const mapCourse = (doc) => ({
  mongo_id: doc._id.toString(),
  name: doc.name,
  slug: doc.slug,
  programme: doc.programme,
  programme_slug: doc.programmeSlug,
  course_slug: doc.courseSlug,
  subtitle: doc.subtitle,
  focus: doc.focus,
  placement_range: doc.placementRange,
  price: doc.price,
  level: doc.level,
  duration: doc.duration,
  mode: doc.mode,
  outcome_summary: doc.outcomeSummary,
  final_award: doc.finalAward,
  assessment_max_attempts: doc.assessmentMaxAttempts,
  is_visible: doc.isVisible,
  order: doc.order,
  weeks: doc.weeks,
  partner_schema: doc.partners,
  certifications: doc.certifications,
  hero: doc.hero,
  stats: doc.stats,
  about_program: doc.aboutProgram,
  learn: doc.learn,
  target_audience: doc.targetAudience,
  prereqs_list: doc.prereqsList,
  modules: doc.modules,
  instructors: doc.instructors,
  offered_by: doc.offeredBy,
  capstone: doc.capstone,
  image: doc.image,
  media: doc.media,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

// 3. Events
const mapEvent = (doc) => ({
  mongo_id: doc._id.toString(),
  title: doc.title,
  slug: doc.slug,
  subtitle: doc.subtitle,
  summary: doc.summary,
  description: doc.description,
  category: doc.category,
  badge: doc.badge,
  event_type: doc.eventType,
  tags: doc.tags,
  level: doc.level,
  track_label: doc.trackLabel,
  location: doc.location,
  seat_limit: doc.seatLimit,
  duration_minutes: doc.durationMinutes,
  recording_available: doc.recordingAvailable,
  is_featured: doc.isFeatured,
  status: doc.status,
  sort_order: doc.sortOrder,
  is_masterclass: doc.isMasterclass,
  hero_image: doc.heroImage,
  host: doc.host,
  price: doc.price,
  cta: doc.cta,
  schedule: doc.schedule,
  meta: doc.meta,
  masterclass_details: doc.masterclassDetails,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

// 4. AdminUser
const mapAdminUser = (doc) => ({
  mongo_id: doc._id.toString(),
  full_name: doc.fullName,
  email: doc.email,
  phone_number: doc.phoneNumber,
  department: doc.department,
  designation: doc.designation,
  languages: doc.languages,
  bio: doc.bio,
  status: doc.status,
  role: doc.role,
  password_hash: doc.password,
  email_verified: doc.emailVerified,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

// 5. Blog
const mapBlog = (doc) => ({
  mongo_id: doc._id.toString(),
  title: doc.title,
  slug: doc.slug,
  category: doc.category,
  excerpt: doc.excerpt,
  content: doc.content,
  featured_image: doc.featuredImage,
  featured_image_public_id: doc.featuredImagePublicId,
  author: doc.author,
  tags: doc.tags,
  published_at: doc.publishedAt,
  meta: doc.meta,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

// 6. Job
const mapJob = (doc) => ({
  mongo_id: doc._id.toString(),
  title: doc.title,
  company: doc.company,
  location: doc.location,
  salary: doc.salary,
  type: doc.type,
  description: doc.description,
  is_featured: doc.isFeatured,
  posted_at: doc.postedAt,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

// 7. ExpertVideos
const mapExpertVideo = (doc) => ({
  mongo_id: doc._id.toString(),
  title: doc.title,
  expert_name: doc.expertName, // Assuming field name
  expert_role: doc.expertRole,
  video_url: doc.videoUrl,
  thumbnail_url: doc.thumbnailUrl,
  duration: doc.duration,
  category: doc.category,
  is_featured: doc.isFeatured,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

// 8. GalleryItem
const mapGalleryItem = (doc) => ({
  mongo_id: doc._id.toString(),
  title: doc.title,
  description: doc.description,
  image_url: doc.imageUrl,
  category: doc.category,
  is_visible: doc.isVisible,
  sort_order: doc.sortOrder,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

// 9. LandingPage
const mapLandingPage = (doc) => ({
  mongo_id: doc._id.toString(),
  slug: doc.slug,
  title: doc.title,
  hero_section: doc.heroSection,
  content_sections: doc.contentSections,
  meta_title: doc.metaTitle,
  meta_description: doc.metaDescription,
  is_published: doc.isPublished,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

// 10. PartnerLogo
const mapPartnerLogo = (doc) => ({
  mongo_id: doc._id.toString(),
  name: doc.name,
  logo_url: doc.logoUrl,
  website_url: doc.websiteUrl,
  category: doc.category,
  sort_order: doc.sortOrder,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

// 11. PageMeta
const mapPageMeta = (doc) => ({
  mongo_id: doc._id.toString(),
  page_path: doc.pagePath,
  title: doc.title,
  description: doc.description,
  keywords: doc.keywords,
  og_image_url: doc.ogImageUrl,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

// 12. TestimonialVideo
const mapTestimonialVideo = (doc) => ({
  mongo_id: doc._id.toString(),
  person_name: doc.personName,
  person_role: doc.personRole,
  video_url: doc.videoUrl,
  thumbnail_url: doc.thumbnailUrl,
  quote: doc.quote,
  is_featured: doc.isFeatured,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

// 13. WhyGradusVideo
const mapWhyGradusVideo = (doc) => ({
  mongo_id: doc._id.toString(),
  title: doc.title,
  video_url: doc.videoUrl,
  thumbnail_url: doc.thumbnailUrl,
  description: doc.description,
  sort_order: doc.sortOrder,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

// --- Dependent Migrations (Need ID Maps) ---

const run = async () => {
  await connectDB();

  // Independent collections first
  await migrateGeneric(User, "users", mapUser);
  await migrateGeneric(AdminUser, "admin_users", mapAdminUser);
  await migrateGeneric(Course, "courses", mapCourse);
  await migrateGeneric(Event, "events", mapEvent);
  await migrateGeneric(Blog, "blogs", mapBlog);
  await migrateGeneric(Job, "jobs", mapJob);
  await migrateGeneric(ExpertVideo, "expert_videos", mapExpertVideo);
  await migrateGeneric(GalleryItem, "gallery_items", mapGalleryItem);
  await migrateGeneric(LandingPage, "landing_pages", mapLandingPage);
  await migrateGeneric(PartnerLogo, "partner_logos", mapPartnerLogo);
  await migrateGeneric(PageMeta, "page_metas", mapPageMeta);
  await migrateGeneric(
    TestimonialVideo,
    "testimonial_videos",
    mapTestimonialVideo
  );
  await migrateGeneric(WhyGradusVideo, "why_gradus_videos", mapWhyGradusVideo);

  // Fetch Maps
  const userMap = await getIdMap("users");
  const courseMap = await getIdMap("courses");
  const eventMap = await getIdMap("events");
  const jobMap = await getIdMap("jobs");
  const adminMap = await getIdMap("admin_users");
  const ticketMap = await getIdMap("tickets"); // Will generate after tickets

  // 14. Enrollments (User + Course)
  await migrateGeneric(Enrollment, "enrollments", (doc) => {
    const userId = userMap[doc.user?.toString()];
    const courseId = courseMap[doc.course?.toString()];
    if (!userId || !courseId) return null;
    return {
      mongo_id: doc._id.toString(),
      user_id: userId,
      course_id: courseId,
      status: doc.status,
      payment_status: doc.paymentStatus,
      payment_reference: doc.paymentReference,
      paid_at: doc.paidAt,
      currency: doc.currency,
      price_base: doc.priceBase,
      price_tax: doc.priceTax,
      price_total: doc.priceTotal,
      payment_gateway: doc.paymentGateway,
      razorpay_order_id: doc.razorpayOrderId,
      razorpay_payment_id: doc.razorpayPaymentId,
      razorpay_signature: doc.razorpaySignature,
      receipt: doc.receipt,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
    };
  });

  // 15. Event Registrations (Event + User)
  await migrateGeneric(EventRegistration, "event_registrations", (doc) => {
    const eventId = eventMap[doc.event?.toString()];
    const userId = doc.user ? userMap[doc.user.toString()] : null;
    if (!eventId) return null;
    return {
      mongo_id: doc._id.toString(),
      event_id: eventId,
      user_id: userId,
      name: doc.name,
      email: doc.email,
      phone: doc.phone,
      registered_at: doc.registeredAt,
      status: doc.status,
      meta: doc.meta,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
    };
  });

  // 16. Job Applications (Job + User)
  await migrateGeneric(JobApplication, "job_applications", (doc) => {
    const jobId = jobMap[doc.job?.toString()];
    const userId = doc.user ? userMap[doc.user.toString()] : null;
    if (!jobId) return null;
    return {
      mongo_id: doc._id.toString(),
      job_id: jobId,
      user_id: userId,
      applicant_name: doc.applicantName,
      applicant_email: doc.applicantEmail,
      applicant_phone: doc.applicantPhone,
      resume_url: doc.resumeUrl,
      status: doc.status,
      cover_letter: doc.coverLetter,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
    };
  });

  // 17. Notifications (User)
  await migrateGeneric(Notification, "notifications", (doc) => {
    const userId = userMap[doc.user?.toString()];
    if (!userId) return null;
    return {
      mongo_id: doc._id.toString(),
      user_id: userId,
      title: doc.title,
      message: doc.message,
      type: doc.type,
      is_read: doc.isRead,
      action_link: doc.actionLink,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
    };
  });

  // 18. SiteVisits
  await migrateGeneric(SiteVisit, "site_visits", (doc) => ({
    mongo_id: doc._id.toString(),
    visitor_id: doc.visitorId,
    page_path: doc.pagePath,
    referrer: doc.referrer,
    user_agent: doc.userAgent,
    ip_address: doc.ipAddress,
    created_at: doc.createdAt,
  }));

  // 19. UserAuthLogs (User)
  await migrateGeneric(UserAuthLog, "user_auth_logs", (doc) => {
    const userId = userMap[doc.user?.toString()];
    if (!userId) return null;
    return {
      mongo_id: doc._id.toString(),
      user_id: userId,
      event_type: doc.eventType,
      ip_address: doc.ipAddress,
      user_agent: doc.userAgent,
      status: doc.status,
      created_at: doc.createdAt,
    };
  });

  // 20. Verification Sessions (User)
  await migrateGeneric(VerificationSession, "verification_sessions", (doc) => {
    const userId = userMap[doc.user?.toString()];
    if (!userId) return null;
    return {
      mongo_id: doc._id.toString(),
      user_id: userId,
      session_id: doc.sessionId,
      status: doc.status,
      outcome: doc.outcome,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
    };
  });

  // 21. AssessmentSets (Course)
  await migrateGeneric(AssessmentSet, "assessment_sets", (doc) => {
    const courseId = courseMap[doc.courseId?.toString()];
    return {
      mongo_id: doc._id.toString(),
      course_id: courseId,
      course_slug: doc.courseSlug,
      programme_slug: doc.programmeSlug,
      course_name: doc.courseName,
      module_index: doc.moduleIndex,
      week_index: doc.weekIndex,
      module_title: doc.moduleTitle,
      week_title: doc.weekTitle,
      title: doc.title,
      level: doc.level,
      summary: doc.summary,
      tags: doc.tags,
      questions: doc.questions,
      initial_question_count: doc.initialQuestionCount,
      question_pool_size: doc.questionPoolSize,
      per_attempt_count: doc.perAttemptCount,
      source: doc.source,
      variant: doc.variant,
      model: doc.model,
      usage: doc.usage,
      generated_at: doc.generatedAt,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
    };
  });

  // 22. Tickets (User, AdminUser) - This needs to run before messages
  await migrateGeneric(Ticket, "tickets", (doc) => {
    const userId = userMap[doc.user?.toString()];
    const assignedTo = doc.assignedTo
      ? adminMap[doc.assignedTo.toString()]
      : null;
    const lastOpenedBy = doc.lastOpenedBy
      ? adminMap[doc.lastOpenedBy.toString()]
      : null;

    // Transform closure
    const newClosure = doc.closure
      ? {
          ...doc.closure,
          requestedBy: doc.closure.requestedBy
            ? adminMap[doc.closure.requestedBy.toString()]
            : null,
          closedBy: doc.closure.closedBy
            ? adminMap[doc.closure.closedBy.toString()]
            : null,
        }
      : null;

    return {
      mongo_id: doc._id.toString(),
      user_id: userId,
      subject: doc.subject,
      category: doc.category,
      priority: doc.priority,
      status: doc.status,
      assigned_to: assignedTo,
      last_message_at: doc.lastMessageAt,
      message_count: doc.messageCount,
      first_opened_at: doc.firstOpenedAt,
      last_opened_by: lastOpenedBy,
      resolution_outcome: doc.resolutionOutcome,
      closure: newClosure,
      assignment: doc.assignment,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
    };
  });

  // 23. TicketMessages (Ticket)
  const newTicketMap = await getIdMap("tickets");
  await migrateGeneric(TicketMessage, "ticket_messages", (doc) => {
    const ticketId = newTicketMap[doc.ticket?.toString()];
    if (!ticketId) return null;
    return {
      mongo_id: doc._id.toString(),
      ticket_id: ticketId,
      sender_config: doc.senderConfig,
      message: doc.message,
      attachments: doc.attachments,
      read_at: doc.readAt,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
    };
  });

  console.log("✨ All Migrations Finished!");
  process.exit(0);
};

run();
