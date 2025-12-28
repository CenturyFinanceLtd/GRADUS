const supabase = require("./src/config/supabase");

const inspectAdmin = async () => {
  const email = "dvisro13@gmail.com"; // from screenshot
  console.log(`Inspecting admin user: ${email}`);

  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("email", email)
    .single();

  if (error) {
    console.error("Error fetching admin:", error);
    return;
  }

  console.log("Admin User Data:", JSON.stringify(data, null, 2));

  if (data) {
    console.log("Has password field?", data.password !== undefined);
    console.log("Has password_hash field?", data.password_hash !== undefined);
  }
};

inspectAdmin();
