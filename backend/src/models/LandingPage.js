const mongoose = require('mongoose');

const landingPageSchema = new mongoose.Schema(
    {
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        hero: {
            titlePrefix: { type: String, trim: true, default: '' },
            highlight: { type: String, trim: true, default: '' }, // e.g. "Modern Technology"
            mentorName: { type: String, trim: true, default: '' },
            subtitle: { type: String, trim: true, default: '' },
            date: { type: String, trim: true, default: '' },
            time: { type: String, trim: true, default: '' },
            language: { type: String, trim: true, default: '' },
            duration: { type: String, trim: true, default: '' },
            socialProofCount: { type: String, trim: true, default: '' }, // e.g. "12K+"
            ratingText: { type: String, trim: true, default: '' }, // e.g. "5k+ reviews (4.9 of 5)"
            image: { type: String, trim: true, default: '' }, // URL
            bottomInfo: { type: String, trim: true, default: '' },
        },
        middleSection: {
            programName: { type: String, trim: true, default: '' }, // e.g. "Gradus TECH"
            targetAudience: [{
                icon: { type: String, trim: true, default: '' },
                text: { type: String, trim: true, default: '' }
            }],
            learningCards: [{
                number: { type: String, trim: true, default: '' },
                text: { type: String, trim: true, default: '' }
            }],
            centeredCard: { type: String, trim: true, default: '' }
        },
        mentor: {
            name: { type: String, trim: true, default: '' },
            image: { type: String, trim: true, default: '' },
            title: { type: String, trim: true, default: 'Meet Your Mentor' },
            points: [{ type: String, trim: true }]
        },
        certificate: {
            headline: { type: String, trim: true, default: '' },
            image: { type: String, trim: true, default: '' }
        },
        faq: [{
            question: { type: String, trim: true },
            answer: { type: String, trim: true }
        }],
        stickyFooter: {
            priceOriginal: { type: String, trim: true, default: '' },
            priceCurrent: { type: String, trim: true, default: 'FREE' }
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('LandingPage', landingPageSchema);
