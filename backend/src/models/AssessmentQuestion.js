const mongoose = require('mongoose');

const assessmentQuestionSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    courseSlug: { type: String, required: true },
    programmeSlug: { type: String, default: '' },
    moduleIndex: { type: Number, default: null },
    weekIndex: { type: Number, default: null },
    variant: { type: String, default: 'course-default' },
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentSet' },
    questionId: { type: String, required: true },
    prompt: { type: String, required: true },
    options: {
      type: [
        {
          id: String,
          label: String,
        },
      ],
      default: [],
    },
    correctOptionId: { type: String, required: true },
    explanation: { type: String, default: '' },
    source: { type: String, default: 'ai' },
  },
  { timestamps: true }
);

assessmentQuestionSchema.index({ courseSlug: 1, variant: 1, questionId: 1 });

const AssessmentQuestion = mongoose.model('AssessmentQuestion', assessmentQuestionSchema);

// Best-effort: drop legacy unique index if it exists to prevent E11000 errors
const dropLegacyUniqueIndex = async () => {
  try {
    const indexes = await AssessmentQuestion.collection.indexes();
    const legacy = indexes.find(
      (idx) => idx.name === 'courseSlug_1_variant_1_questionId_1' && idx.unique === true
    );
    if (legacy) {
      await AssessmentQuestion.collection.dropIndex('courseSlug_1_variant_1_questionId_1');
      await AssessmentQuestion.collection.createIndex({ courseSlug: 1, variant: 1, questionId: 1 });
    }
  } catch (err) {
    // ignore if collection not created yet or index absent
  }
};

dropLegacyUniqueIndex();

module.exports = AssessmentQuestion;
