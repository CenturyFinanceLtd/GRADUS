
const mongoose = require('mongoose');
const Course = require('./src/models/Course');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/gradus', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const listCourses = async () => {
    await connectDB();
    try {
        const courses = await Course.find({}, 'name isVisible');
        console.log('Courses in DB:', courses);
    } catch (error) {
        console.error('Error listing courses:', error);
    } finally {
        mongoose.disconnect();
    }
};

listCourses();
