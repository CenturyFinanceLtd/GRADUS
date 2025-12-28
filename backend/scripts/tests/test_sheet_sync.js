const dotenv = require("dotenv");
const path = require("path");

// Load env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const {
  syncEnrollment,
} = require("../src/services/registrationSpreadsheetSync");

const testSync = async () => {
  console.log("Testing Spreadsheet Sync...");

  const mockEnrollment = {
    id: "test-enrollment-id-" + Date.now(),
    created_at: new Date(),
    // user_details would be populated by join
  };

  const mockUser = {
    email: "test-sync@gradus.local",
    name: "Tezt User",
    mobile: "9999999999",
    personalDetails: {
      studentName: "Test Student",
      state: "Test State",
      mobile: "9999999999",
    },
    educationDetails: {
      degree: "B.Tech Test",
    },
  };

  const mockCourse = {
    title: "Test Course Integration",
    name: "Test Course Integration",
  };

  try {
    console.log("Syncing...");
    await syncEnrollment(mockEnrollment, mockUser, mockCourse);
    console.log(
      'Done! Check Google Drive for "Test Course Integration" or "Event Registrations".'
    );
  } catch (error) {
    console.error("Failed:", error);
  }
};

testSync();
