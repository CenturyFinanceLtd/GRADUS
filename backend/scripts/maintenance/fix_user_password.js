const supabase = require("./src/config/supabase");
const bcrypt = require("bcryptjs");

const resetPassword = async () => {
  const email = "devnishantsingh25@gmail.com";
  const newPassword = "password123"; // Simple password for testing
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(newPassword, salt);

  console.log(`Resetting password for ${email} to '${newPassword}'...`);

  const { data, error } = await supabase
    .from("users")
    .update({ password_hash: hash })
    .eq("email", email)
    .select();

  if (error) {
    console.error("Update failed:", error);
  } else {
    console.log("Password updated successfully:", data);
  }
};

resetPassword();
