require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./src/models/Course');

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    const courses = await Course.find({}).select('name slug isVisible programme').lean();
    console.log('=== ALL COURSES IN DATABASE ===\n');
    courses.forEach(c => {
        const vis = c.isVisible === false ? '[HIDDEN]' : '[VISIBLE]';
        console.log(`${vis} "${c.name}" => slug: "${c.slug}" | programme: "${c.programme || 'N/A'}"`);
    });
    console.log(`\nTotal: ${courses.length} courses`);

    process.exit();
};

run().catch(err => { console.error(err); process.exit(1); });
