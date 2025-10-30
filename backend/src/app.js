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
const adminCourseRoutes = require('./routes/adminCourseRoutes');
const adminPermissionRoutes = require('./routes/adminPermissionRoutes');
const courseRoutes = require('./routes/courseRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminAnalyticsRoutes = require('./routes/adminAnalyticsRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const adminTicketRoutes = require('./routes/adminTicketRoutes');
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
app.use(
    session({
        secret: config.sessionSecret || 'gradus_secret',
        resave: false,
        saveUninitialized: true,
        cookie: {
            // Session cookie lifetime (24h). For production, consider SameSite/Lax and Secure behind HTTPS.
            maxAge: 1000 * 60 * 60 * 24,
        },
    })
);

// Publicly serve uploaded blog images
app.use('/blog-images', express.static(blogImagesDirectory));

// Simple health check for uptime monitoring and orchestration
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route mounts (grouped by concern)
// Auth + user
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// Admin area
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/website-users', adminWebsiteUserRoutes);
app.use('/api/admin/courses', adminCourseRoutes);
app.use('/api/admin/permissions', adminPermissionRoutes);
app.use('/api/admin/blogs', adminBlogRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/tickets', adminTicketRoutes);
// Public content + services
app.use('/api/blogs', blogRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/inquiries', contactRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/tickets', ticketRoutes);

// 404 and error handling (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
