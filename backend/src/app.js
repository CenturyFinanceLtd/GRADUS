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
const { blogImagesDirectory } = require('./middleware/uploadMiddleware');

const app = express();

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

// app.use(cors(corsOptions));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
    session({
        secret: config.sessionSecret || 'gradus_secret',
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24,
        },
    })
);

app.use('/blog-images', express.static(blogImagesDirectory));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/website-users', adminWebsiteUserRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin/blogs', adminBlogRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/inquiries', contactRoutes);
app.use('/api/admin/courses', adminCourseRoutes);
app.use('/api/admin/permissions', adminPermissionRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;