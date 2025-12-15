import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getAuthSession } from "@/utils/auth-storage";
import { API_BASE_URL } from "@/constants/config";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export default function EnrollmentCheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { courseSlug } = params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [course, setCourse] = useState<any>(null);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [state, setState] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showStatePicker, setShowStatePicker] = useState(false);

  useEffect(() => {
    loadData();
  }, [courseSlug]);

  const loadData = async () => {
    try {
      const { token } = await getAuthSession();
      if (!token) {
        router.replace("/auth/signin");
        return;
      }

      const courseRes = await fetch(
        `${API_BASE_URL}/api/courses/${courseSlug}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (courseRes.ok) {
        const courseData = await courseRes.json();
        setCourse(courseData.course || courseData);
      }

      const userRes = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (userRes.ok) {
        const userData = await userRes.json();
        const user = userData.user || userData;

        setWhatsappNumber(user.whatsappNumber || user.mobile || "");
        setState(user.personalDetails?.state || "");
        setDateOfBirth(user.personalDetails?.dateOfBirth || "");
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      Alert.alert("Error", "Failed to load course details");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!whatsappNumber || !state || !dateOfBirth) {
      Alert.alert("Missing Information", "Please fill all required fields.");
      return;
    }

    if (!/^\d{10}$/.test(whatsappNumber)) {
      Alert.alert(
        "Invalid Number",
        "Please enter a valid 10-digit WhatsApp number."
      );
      return;
    }

    setSaving(true);
    try {
      const { token } = await getAuthSession();
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          whatsappNumber,
          personalDetails: { dateOfBirth, state },
        }),
      });

      if (!res.ok) throw new Error("Failed to save details");
      Alert.alert("Success", "Details saved successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to save details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePaySecurely = async () => {
    if (!whatsappNumber || !state || !dateOfBirth) {
      Alert.alert("Missing Information", "Please save your details first.");
      return;
    }

    setProcessing(true);
    try {
      const { token } = await getAuthSession();

      const orderRes = await fetch(
        `${API_BASE_URL}/api/payments/course-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ courseSlug }),
        }
      );

      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.message || "Failed to create order");
      }

      const orderData = await orderRes.json();

      let RazorpayCheckout;
      try {
        RazorpayCheckout = require("react-native-razorpay").default;
      } catch (e) {
        throw new Error("Razorpay SDK is not available in this build.");
      }

      try {
        const rzpResult = await RazorpayCheckout.open({
          key: orderData.keyId, // Ensure this comes from backend
          order_id: orderData.orderId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: course?.name || "Gradus",
          description: "Course enrollment",
          prefill: {
            email: "",
            contact: whatsappNumber,
          },
          theme: { color: "#2968ff" },
        });

        await verifyPayment(rzpResult);
      } catch (error: any) {
        if (error.code === 0) {
          // Payment cancelled by user
          console.log("Payment Cancelled");
          // You might want to show a toast or just do nothing
        } else {
          console.error("Razorpay Error:", error);
          throw error; // Re-throw to be caught by outer catch and shown in Alert
        }
      }
    } catch (error: any) {
      Alert.alert("Payment Failed", error.message || "Something went wrong");
    } finally {
      setProcessing(false);
    }
  };

  const verifyPayment = async (paymentData: any) => {
    const { token } = await getAuthSession();
    const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(paymentData),
    });

    if (verifyRes.ok) {
      const encodedSlug = encodeURIComponent(courseSlug as string);
      router.replace(`/classroom/${encodedSlug}`);
    } else {
      throw new Error("Payment verification failed");
    }
  };

  const basePrice = course?.hero?.priceINR || course?.priceINR || 0;
  const gstAmount = basePrice * 0.18;
  const totalPrice = basePrice + gstAmount;

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2968ff" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enrollment Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Confirm your learner details</Text>
          <Text style={styles.cardSubtitle}>
            We use these details for enrollment records and to share WhatsApp
            cohort updates. Make sure they match your official documents.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>WhatsApp registered number</Text>
            <TextInput
              style={styles.input}
              placeholder="8710055551"
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
              keyboardType="phone-pad"
              maxLength={10}
            />
            <Text style={styles.hint}>
              Use the 10-digit number linked to your WhatsApp account.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Residential state</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowStatePicker(!showStatePicker)}
            >
              <Text
                style={state ? styles.pickerText : styles.pickerPlaceholder}
              >
                {state || "Select state"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            {showStatePicker && (
              <View style={styles.stateList}>
                <ScrollView style={{ maxHeight: 200 }}>
                  {INDIAN_STATES.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={styles.stateItem}
                      onPress={() => {
                        setState(s);
                        setShowStatePicker(false);
                      }}
                    >
                      <Text style={styles.stateItemText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <Text style={styles.hint}>
              Match the state listed on your government ID.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of birth</Text>
            <TextInput
              style={styles.input}
              placeholder="DD-MM-YYYY"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
            />
            <Text style={styles.hint}>
              Used for identity verification and certificates.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveDetails}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Details</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.secureNote}>
            Details are stored securely in your Gradus profile.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Secure Enrollment Checkout</Text>
          <Text style={styles.cardSubtitle}>
            Review your program details and confirm the enrollment payment to
            unlock the complete curriculum.
          </Text>

          <View style={styles.checkoutRow}>
            <Text style={styles.checkoutLabel}>Course</Text>
            <Text style={styles.checkoutValue}>{course?.name || "Course"}</Text>
          </View>

          <View style={styles.checkoutRow}>
            <Text style={styles.checkoutLabel}>Program Fee</Text>
            <Text style={styles.checkoutValue}>
              ₹{basePrice.toFixed(2)} + 18% GST = ₹{totalPrice.toFixed(2)}
            </Text>
          </View>

          <View style={styles.paymentSummary}>
            <Text style={styles.summaryTitle}>Payment Summary</Text>
            <Text style={styles.summaryText}>
              You will be securely redirected to Razorpay to complete your
              payment. Final amount includes 18% GST.
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.payBtn, processing && styles.payBtnDisabled]}
              onPress={handlePaySecurely}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={18} color="#fff" />
                  <Text style={styles.payBtnText}>Pay Securely</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelBtnText}>Cancel And Return</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginLeft: 12,
  },
  content: { padding: 16, gap: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#111", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111",
  },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerText: { fontSize: 16, color: "#111" },
  pickerPlaceholder: { fontSize: 16, color: "#9ca3af" },
  stateList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  stateItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  stateItemText: { fontSize: 15, color: "#111" },
  hint: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  saveBtn: {
    backgroundColor: "#2968ff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secureNote: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 12,
  },
  checkoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  checkoutLabel: { fontSize: 14, color: "#6b7280" },
  checkoutValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  paymentSummary: {
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: 8,
  },
  summaryText: { fontSize: 13, color: "#3b82f6", lineHeight: 18 },
  buttonRow: { gap: 12 },
  payBtn: {
    backgroundColor: "#2968ff",
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  cancelBtnText: { color: "#374151", fontSize: 16, fontWeight: "600" },
});
