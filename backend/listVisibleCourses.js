require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./src/models/Course');

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const courses = await Course.find({ isVisible: true }).select('name slug programme').lean();
    console.log(`\n=== ${courses.length} VISIBLE COURSES ===\n`);
    courses.forEach(c => {
        console.log(`- ${c.name} (slug: ${c.slug}, programme: ${c.programme || 'N/A'})`);
    });

    const hidden = await Course.find({ isVisible: false }).select('name slug').lean();
    console.log(`\n=== ${hidden.length} HIDDEN COURSES ===\n`);
    hidden.forEach(c => {
        console.log(`- ${c.name} (slug: ${c.slug})`);
    });

    process.exit();
};

run().catch(err => { console.error(err); process.exit(1); });
