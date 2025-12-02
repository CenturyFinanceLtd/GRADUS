/*
  Express application bootstrap
  - Configures dev-only CORS (production CORS is handled by reverse proxy)
  - Parses JSON/urlencoded bodies, cookies, and attaches an HTTP session
  - Serves static assets needed by the app (e.g., blog images)
  - Mounts all feature routes under the /api namespace
  - Registers 404 and centralized error handlers
*/
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const config = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const adminWebsiteUserRoutes = require('./routes/adminWebsiteUserRoutes');
const userRoutes = require('./routes/userRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const adminBlogRoutes = require('./routes/adminBlogRoutes');
const blogRoutes = require('./routes/blogRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminPermissionRoutes = require('./routes/adminPermissionRoutes');
const courseRoutes = require('./routes/courseRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminAnalyticsRoutes = require('./routes/adminAnalyticsRoutes');
const adminCourseRoutes = require('./routes/adminCourseRoutes');
const adminCourseDetailRoutes = require('./routes/adminCourseDetailRoutes');
const adminTestimonialRoutes = require('./routes/adminTestimonialRoutes');
const adminExpertVideoRoutes = require('./routes/adminExpertVideoRoutes');
const adminAssessmentRoutes = require('./routes/adminAssessmentRoutes');
const adminWhyGradusVideoRoutes = require('./routes/adminWhyGradusVideoRoutes');
const adminUploadRoutes = require('./routes/adminUploadRoutes');
const adminBannerRoutes = require('./routes/adminBannerRoutes');
const adminEventRoutes = require('./routes/adminEventRoutes');
const adminEmailTemplateRoutes = require('./routes/adminEmailTemplateRoutes');
const adminEmailRoutes = require('./routes/adminEmailRoutes');
const adminPartnerRoutes = require('./routes/adminPartnerRoutes');
const adminPageMetaRoutes = require('./routes/adminPageMetaRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const adminTicketRoutes = require('./routes/adminTicketRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const testimonialRoutes = require('./routes/testimonialRoutes');
const expertVideoRoutes = require('./routes/expertVideoRoutes');
const whyGradusVideoRoutes = require('./routes/whyGradusVideoRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const eventRoutes = require('./routes/eventRoutes');
const eventRegistrationRoutes = require('./routes/eventRegistrationRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const pageMetaRoutes = require('./routes/pageMetaRoutes');
const liveRoutes = require('./live/routes');
const { blogImagesDirectory } = require('./middleware/uploadMiddleware');

const app = express();

// Allowed CORS methods/headers and a strict origin allow‑list
const corsOptions = {
    origin(origin, callback) {
        if (!origin || config.clientOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: ${origin} is not an allowed origin`));
        }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

// In production, rely on the reverse proxy (Nginx/Cloudflare) to set CORS.
// Enabling Express CORS in production can emit duplicate CORS headers.
if (config.nodeEnv !== 'production') {
    app.use(
        cors({
            origin: true, // reflect request origin for local dev
            credentials: true,
            methods: corsOptions.methods,
            allowedHeaders: corsOptions.allowedHeaders,
        })
    );
}


// Core middleware: body parsers, cookies, lightweight session
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const sessionOptions = {
    secret: config.sessionSecret || 'gradus_secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        // Session cookie lifetime (24h). For production, consider SameSite/Lax and Secure behind HTTPS.
        maxAge: 1000 * 60 * 60 * 24,
    },
};

if (config.nodeEnv === 'production') {
    if (config.mongoUri) {
        sessionOptions.store = MongoStore.create({
            mongoUrl: config.mongoUri,
            collectionName: 'sessions',
            ttl: 60 * 60 * 24, // match cookie maxAge (24h)
        });
    } else {
        console.warn('[session] MongoDB URI missing; falling back to in-memory store for sessions.');
    }
}

app.use(session(sessionOptions));

// Publicly serve uploaded blog images
app.use('/blog-images', express.static(blogImagesDirectory));

// Simple health check for uptime monitoring and orchestration
app.get('/api/health', (req, res) => {
    const config = require('./config/env');
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        paymentsConfigured: Boolean((config.payments || {}).razorpayKeyId) && Boolean((config.payments || {}).razorpayKeySecret),
    });
});

// Route mounts (grouped by concern)
// Auth + user
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// Admin area
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/website-users', adminWebsiteUserRoutes);
app.use('/api/admin/permissions', adminPermissionRoutes);
app.use('/api/admin/blogs', adminBlogRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/tickets', adminTicketRoutes);
app.use('/api/admin/courses', adminCourseRoutes);
app.use('/api/admin/course-details', adminCourseDetailRoutes);
app.use('/api/admin/assessments', adminAssessmentRoutes);
app.use('/api/admin/testimonials', adminTestimonialRoutes);
app.use('/api/admin/expert-videos', adminExpertVideoRoutes);
app.use('/api/admin/why-gradus-video', adminWhyGradusVideoRoutes);
app.use('/api/admin/uploads', adminUploadRoutes);
app.use('/api/admin/banners', adminBannerRoutes);
app.use('/api/admin/events', adminEventRoutes);
app.use('/api/admin/email-templates', adminEmailTemplateRoutes);
app.use('/api/admin/email', adminEmailRoutes);
app.use('/api/admin/partners', adminPartnerRoutes);
app.use('/api/admin/page-meta', adminPageMetaRoutes);
// Public content + services
app.use('/api/blogs', blogRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/expert-videos', expertVideoRoutes);
app.use('/api/why-gradus-video', whyGradusVideoRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/event-registrations', eventRegistrationRoutes);
app.use('/api/inquiries', contactRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/page-meta', pageMetaRoutes);

// 404 and error handling (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
