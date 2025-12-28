require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./src/models/Course');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error("No Mongo URI");
        console.log("Connecting to", uri.substring(0, 20) + "...");
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const hideCourses = async () => {
    await connectDB();
    const names = ['Derivatives Mastery', 'Forex Trading Mastery', 'Technical Analysis'];
    try {
        const res = await Course.updateMany(
            { name: { $in: names } },
            { $set: { isVisible: false } }
        );
        console.log('Update Result:', res);
    } catch (error) {
        console.error('Error updating courses:', error);
    } finally {
        mongoose.disconnect();
    }
};

hideCourses();
