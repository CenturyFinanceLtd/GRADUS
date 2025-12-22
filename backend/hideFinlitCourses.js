require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./src/models/Course');

const slugsToHide = [
    'gradus-finlit/advanced-markets-mastery',
    'gradus-finlit/global-currency-market-mastery',
    'gradus-finlit/technical-analysis',
];

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    for (const slug of slugsToHide) {
        const result = await Course.updateOne({ slug }, { isVisible: false });
        if (result.modifiedCount > 0) {
            console.log(`✅ Hidden: ${slug}`);
        } else {
            console.log(`⚠️  Not found or already hidden: ${slug}`);
        }
    }

    console.log('\nDone!');
    process.exit();
};

run().catch(err => { console.error(err); process.exit(1); });
