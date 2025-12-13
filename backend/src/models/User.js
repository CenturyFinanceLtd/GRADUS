/*
  User model (public site user)
  - Stores identity, contact details, profile sections, and hashed password
*/
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    whatsappNumber: {
      type: String,
      trim: true,
    },
    personalDetails: {
      studentName: {
        type: String,
        required: true,
        trim: true,
      },
      gender: {
        type: String,
        required: true,
        trim: true,
      },
      dateOfBirth: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      country: {
        type: String,
        required: true,
        trim: true,
      },
      zipCode: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
    },
    parentDetails: {
      title: {
        type: String,
        trim: true,
      },
      fullName: {
        type: String,
        trim: true,
      },
      relation: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
      },
      jobTitle: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
    },
    educationDetails: {
      institutionName: {
        type: String,
        required: true,
        trim: true,
      },
      passingYear: {
        type: String,
        required: true,
        trim: true,
      },
      fieldOfStudy: {
        type: String,
        trim: true,
      },
      classGrade: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
    },
    jobDetails: {
      company: {
        type: String,
        trim: true,
      },
      designation: {
        type: String,
        trim: true,
      },
      experienceYears: {
        type: String,
        trim: true,
      },
      linkedin: {
        type: String,
        trim: true,
      },
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    authProvider: {
      type: String,
      enum: ['LOCAL', 'GOOGLE'],
      default: 'LOCAL',
    },
    pushToken: {
      type: String,
      trim: true,
      default: null,
    },
    role: {
      type: String,
      enum: ['student', 'instructor', 'guest'],
      default: 'student',
    },
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
