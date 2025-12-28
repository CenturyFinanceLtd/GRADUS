const supabase = require("../config/supabase");
const bcrypt = require("bcryptjs");

/**
 * Service to handle AdminUser operations using Supabase
 */

// Helper to map snake_case DB fields to camelCase for the app
const toCamelCase = (admin) => {
  if (!admin) return null;
  return {
    _id: admin.id, // Keep _id for compatibility with existing code that expects it
    id: admin.id,
    fullName: admin.full_name,
    email: admin.email,
    phoneNumber: admin.phone_number,
    department: admin.department,
    designation: admin.designation,
    languages: admin.languages || [],
    bio: admin.bio,
    status: admin.status,
    role: admin.role,
    password: admin.password_hash || admin.password, // Handle password_hash from DB
    emailVerified: admin.email_verified,
    createdAt: admin.created_at,
    updatedAt: admin.updated_at,
  };
};

// Helper to map camelCase app fields to snake_case for DB
const toSnakeCase = (data) => {
  const mapped = {};
  if (data.fullName !== undefined) mapped.full_name = data.fullName;
  if (data.email !== undefined) mapped.email = data.email;
  if (data.phoneNumber !== undefined) mapped.phone_number = data.phoneNumber;
  if (data.department !== undefined) mapped.department = data.department;
  if (data.designation !== undefined) mapped.designation = data.designation;
  if (data.languages !== undefined) mapped.languages = data.languages;
  if (data.bio !== undefined) mapped.bio = data.bio;
  if (data.status !== undefined) mapped.status = data.status;
  if (data.role !== undefined) mapped.role = data.role;
  if (data.password !== undefined) mapped.password_hash = data.password; // Map to password_hash
  if (data.emailVerified !== undefined)
    mapped.email_verified = data.emailVerified;
  return mapped;
};

const getAdminByEmail = async (email, includePassword = false) => {
  let query = supabase
    .from("admin_users")
    .select("*")
    .eq("email", email)
    .single();

  const { data, error } = await query;

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`[AdminUserService] Get by email failed: ${error.message}`);
  }

  // Supabase returns all selected columns. We might want to remove password if not requested,
  // but since we usually request it explicitly for login, it's fine.
  // Ideally, RLS or specific select should handle this, but for service role:
  const mapped = toCamelCase(data);
  if (!includePassword) {
    delete mapped.password;
  }
  return mapped;
};

const getAdminById = async (id) => {
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`[AdminUserService] Get by ID failed: ${error.message}`);
  }

  const mapped = toCamelCase(data);
  delete mapped.password; // Never return password by ID default
  return mapped;
};

const getAdminBySupabaseId = async (supabaseId) => {
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("supabase_id", supabaseId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(
      `[AdminUserService] Get by Supabase ID failed: ${error.message}`
    );
  }

  const mapped = toCamelCase(data);
  delete mapped.password;
  return mapped;
};

const getAdminByIdWithPassword = async (id) => {
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`[AdminUserService] Get by ID failed: ${error.message}`);
  }

  return toCamelCase(data);
};

const createAdmin = async (data) => {
  const payload = toSnakeCase(data);
  const { data: admin, error } = await supabase
    .from("admin_users")
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw new Error(`[AdminUserService] Create failed: ${error.message}`);
  }
  return toCamelCase(admin);
};

const updateAdmin = async (id, data) => {
  const payload = toSnakeCase(data);
  const { data: admin, error } = await supabase
    .from("admin_users")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`[AdminUserService] Update failed: ${error.message}`);
  }
  return toCamelCase(admin);
};

const listAdmins = async (filters = {}) => {
  let query = supabase
    .from("admin_users")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.role) query = query.eq("role", filters.role);

  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    // Construct OR query for multiple fields
    // Note: Supabase .or() syntax expects 'column.operator.value,column.operator.value'
    query = query.or(
      `full_name.ilike.${searchTerm},email.ilike.${searchTerm},department.ilike.${searchTerm},designation.ilike.${searchTerm},phone_number.ilike.${searchTerm}`
    );
  }

  const { data, error } = await query;
  if (error)
    throw new Error(`[AdminUserService] List failed: ${error.message}`);

  return data.map(toCamelCase).map((a) => {
    delete a.password;
    return a;
  });
};

const deleteAdmin = async (id) => {
  const { error } = await supabase.from("admin_users").delete().eq("id", id);

  if (error)
    throw new Error(`[AdminUserService] Delete failed: ${error.message}`);
  return true;
};

// Passthrough helper for password match since we don't have the model method anymore
const matchPassword = async (enteredPassword, storedHash) => {
  return bcrypt.compare(enteredPassword, storedHash);
};

module.exports = {
  getAdminByEmail,
  getAdminById,
  getAdminBySupabaseId,
  getAdminByIdWithPassword,
  createAdmin,
  updateAdmin,
  listAdmins,
  deleteAdmin,
  matchPassword,
};
