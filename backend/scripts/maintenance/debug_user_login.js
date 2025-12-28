const supabase = require("./src/config/supabase");
const bcrypt = require("bcryptjs");

const checkUser = async () => {
  const email = "devnishantsingh25@gmail.com"; // from screenshot
  console.log(`Inspecting user: ${email}`);

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    return;
  }

  console.log("User found:", data.id);
  console.log("Email:", data.email);
  console.log("Has password_hash?", !!data.password_hash);
  console.log(
    "Password hash length:",
    data.password_hash ? data.password_hash.length : 0
  );
  console.log("Has password column data?", !!data.password); // Check if data is in wrong column

  // Optional: Check if hash looks like bcrypt
  if (data.password_hash && data.password_hash.startsWith("$2")) {
    console.log("Hash format looks correct (bcrypt)");
  } else {
    console.log("Hash format might be incorrect:", data.password_hash);
  }
};

checkUser();
