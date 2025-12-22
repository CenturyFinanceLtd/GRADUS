require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./src/models/Course');

const renames = [
    { oldName: 'Forex Trading Mastery', newName: 'Global Currency Market Mastery', oldSlug: 'gradus-finlit/forex-trading-mastery', newSlug: 'gradus-finlit/global-currency-market-mastery' },
    { oldName: 'Derivatives Mastery', newName: 'Advanced Markets Mastery', oldSlug: 'gradus-finlit/derivatives-mastery', newSlug: 'gradus-finlit/advanced-markets-mastery' },
    { oldName: 'Technical Analysis', newName: 'Technical Analysis', oldSlug: 'gradus-finlit/technical-analysis', newSlug: 'gradus-finlit/technical-analysis' }, // No change needed
];

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    for (const r of renames) {
        const course = await Course.findOne({ slug: r.oldSlug });
        if (course) {
            course.name = r.newName;
            course.slug = r.newSlug;
            await course.save();
            console.log(`✅ Renamed: "${r.oldName}" → "${r.newName}"`);
            console.log(`   Slug: "${r.oldSlug}" → "${r.newSlug}"\n`);
        } else {
            console.log(`⚠️  Not found: ${r.oldSlug}`);
        }
    }

    console.log('Done!');
    process.exit();
};

run().catch(err => { console.error(err); process.exit(1); });
