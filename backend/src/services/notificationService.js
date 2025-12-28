const supabase = require("../config/supabase");

const toCamelCase = (notif) => ({
  id: notif.id,
  user: notif.user_id,
  title: notif.title,
  body: notif.body,
  data: notif.data || {},
  read: notif.read,
  createdAt: notif.created_at,
  updatedAt: notif.updated_at,
});

const getMyNotifications = async (userId, limit = 20) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data.map(toCamelCase);
};

const markAsRead = async (id, userId) => {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true, updated_at: new Date() })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toCamelCase(data);
};

const markAllAsRead = async (userId) => {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true, updated_at: new Date() })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw new Error(error.message);
  return true;
};

const getUnreadCount = async (userId) => {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw new Error(error.message);
  return count;
};

const createNotification = async (userId, { title, body, data = {} }) => {
  const { data: created, error } = await supabase
    .from("notifications")
    .insert([
      {
        user_id: userId,
        title,
        body,
        data,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toCamelCase(created);
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  createNotification,
};
