/*
  AdminPermission model
  - Declarative permissions for roles/features in admin portal
*/
const mongoose = require('mongoose');

const adminPermissionSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    allowedPages: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'admin_permissions',
  }
);

const AdminPermission = mongoose.model('AdminPermission', adminPermissionSchema);

module.exports = AdminPermission;
