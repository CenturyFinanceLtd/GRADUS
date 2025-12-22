require('dotenv').config();
const mongoose = require('mongoose');
const WhyGradusVideo = require('./src/models/WhyGradusVideo');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const fixBranding = async () => {
    await connectDB();

    try {
        const videos = await WhyGradusVideo.find({});
        console.log(`Found ${videos.length} videos.`);

        for (const video of videos) {
            let modified = false;
            if (video.description && video.description.includes('Century Finance Limited')) {
                video.description = video.description.replace(/Century Finance Limited/gi, 'MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED');
                modified = true;
            }
            if (video.title && video.title.includes('Century Finance')) {
                video.title = video.title.replace(/Century Finance/gi, 'MDM MADHUBANI');
                modified = true;
            }

            if (modified) {
                await video.save();
                console.log(`Updated video: ${video._id}`);
            } else {
                console.log(`Video ${video._id} already clean.`);
            }
        }
        console.log('Done!');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

fixBranding();
