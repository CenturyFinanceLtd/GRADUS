import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { getAuthSession, setAuthSession } from "@/utils/auth-storage";
import { screenContainer } from "@/styles/layout";
import { API_BASE_URL } from "@/constants/config";

type UserInfo = {
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  imageUrl?: string;
  personalDetails?: {
    address?: string;
    city?: string;
    zipCode?: string;
  };
  educationDetails?: {
    passingYear?: string;
    institutionName?: string;
    fieldOfStudy?: string;
    address?: string;
  };
  jobDetails?: {
    company?: string;
    designation?: string;
    experienceYears?: string | number;
    linkedin?: string;
  };
};

export default function AccountDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tab, setTab] = useState<"personal" | "academic" | "job">("personal");
  const scrollRef = useRef<any>(null);
  const [sectionY, setSectionY] = useState<{
    personal?: number;
    academic?: number;
    job?: number;
  }>({});
  const [editMode, setEditMode] = useState<
    "personal" | "academic" | "job" | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    zipCode: "",
    passingYear: "",
    institutionName: "",
    fieldOfStudy: "",
    company: "",
    designation: "",
    experienceYears: "",
    linkedin: "",
  });
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showBanner = (type: "success" | "error", message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3000);
  };

  const hydrateForm = (u: UserInfo | null) => {
    setForm({
      firstName: u?.firstName || "",
      lastName: u?.lastName || "",
      address: u?.personalDetails?.address || "",
      city: u?.personalDetails?.city || "",
      zipCode: u?.personalDetails?.zipCode || "",
      passingYear: u?.educationDetails?.passingYear || "",
      institutionName: u?.educationDetails?.institutionName || "",
      fieldOfStudy: u?.educationDetails?.fieldOfStudy || "",
      company: u?.jobDetails?.company || "",
      designation: u?.jobDetails?.designation || "",
      experienceYears: u?.jobDetails?.experienceYears
        ? String(u.jobDetails.experienceYears)
        : "",
      linkedin: u?.jobDetails?.linkedin || "",
    });
  };

  useEffect(() => {
    (async () => {
      await loadUser();
    })();
  }, []);

  const loadUser = async () => {
    setLoadingUser(true);
    try {
      const { token, user: stored } = await getAuthSession();
      if (!token) {
        setUser(stored || null);
        hydrateForm(stored || null);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setUser(stored || null);
        hydrateForm(stored || null);
        return;
      }
      const body = await res.json();
      const fresh = body?.user || body?.data || body;
      setUser(fresh);
      hydrateForm(fresh);
      if (token) {
        await setAuthSession(token, fresh);
      }
    } catch {
      // fallback to whatever we had
    } finally {
      setLoadingUser(false);
    }
  };

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "User";

  const Field = ({ label, value }: { label: string; value?: string }) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || "----"}</Text>
    </View>
  );

  const scrollToSection = (key: "personal" | "academic" | "job") => {
    const y = sectionY[key];
    if (y != null && scrollRef.current) {
      scrollRef.current.scrollToPosition(0, y, true);
    }
    setTab(key);
  };

  const updateSectionY = (key: "personal" | "academic" | "job", evt: any) => {
    const layout = evt?.nativeEvent?.layout;
    if (!layout) return;
    setSectionY((prev) => ({ ...prev, [key]: layout.y }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { token } = await getAuthSession();
      if (!token) {
        showBanner("error", "Please sign in again.");
        router.replace("/auth/signin");
        return;
      }

      const payload: any = {};

      if (editMode === "personal") {
        const first = form.firstName.trim();
        const last = form.lastName.trim();
        if (first) payload.firstName = first;
        if (last) payload.lastName = last;

        const pd: any = {};
        const fullStudentName = [
          first || user?.firstName,
          last || user?.lastName,
        ]
          .filter(Boolean)
          .join(" ");
        if (fullStudentName) pd.studentName = fullStudentName;
        if (form.address.trim()) pd.address = form.address.trim();
        if (form.city.trim()) pd.city = form.city.trim();
        if (form.zipCode.trim()) pd.zipCode = form.zipCode.trim();
        if (Object.keys(pd).length) payload.personalDetails = pd;
      }

      if (editMode === "academic") {
        const ed: any = {};
        if (form.institutionName.trim())
          ed.institutionName = form.institutionName.trim();
        if (form.passingYear.trim()) ed.passingYear = form.passingYear.trim();
        if (form.fieldOfStudy.trim())
          ed.fieldOfStudy = form.fieldOfStudy.trim();
        if (Object.keys(ed).length) payload.educationDetails = ed;
      }

      if (editMode === "job") {
        const jd: any = {};
        if (form.company.trim()) jd.company = form.company.trim();
        if (form.designation.trim()) jd.designation = form.designation.trim();
        if (form.experienceYears.trim())
          jd.experienceYears = form.experienceYears.trim();
        if (form.linkedin.trim()) jd.linkedin = form.linkedin.trim();
        if (Object.keys(jd).length) payload.jobDetails = jd;
      }

      if (!Object.keys(payload).length) {
        showBanner("error", "No changes to save.");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.message || "Could not save changes.";
        showBanner("error", msg);
        return;
      }

      const body = await res.json();
      const updated = body?.data || body?.user || body;
      setUser(updated);
      hydrateForm(updated);
      setEditMode(null);
      showBanner("success", "Changes saved.");
    } catch (e) {
      showBanner("error", "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderEditActions = (section: "personal" | "academic" | "job") => (
    <TouchableOpacity
      onPress={() => {
        setTab(section);
        setEditMode(section);
      }}
      hitSlop={8}
      style={styles.pencilBtn}
    >
      <Ionicons name="create-outline" size={18} color="#2968ff" />
    </TouchableOpacity>
  );

  const renderInput = (
    label: string,
    value: string,
    onChange: (t: string) => void,
    props: any = {}
  ) => (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={label}
        placeholderTextColor="#9ca3af"
        style={styles.input}
        {...props}
      />
    </View>
  );

  const renderSection = () => {
    if (tab === "personal") {
      return (
        <View
          style={styles.sectionCard}
          onLayout={(e) => updateSectionY("personal", e)}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Personal Info</Text>
            {renderEditActions("personal")}
          </View>
          <Field label="Email Id*" value={user?.email} />
          <Field label="Mobile Number*" value={user?.mobile} />
          {editMode === "personal" ? (
            <>
              {renderInput("First Name*", form.firstName, (t) =>
                setForm((p) => ({ ...p, firstName: t }))
              )}
              {renderInput("Last Name*", form.lastName, (t) =>
                setForm((p) => ({ ...p, lastName: t }))
              )}
              {renderInput("Address", form.address, (t) =>
                setForm((p) => ({ ...p, address: t }))
              )}
              {renderInput("City", form.city, (t) =>
                setForm((p) => ({ ...p, city: t }))
              )}
              {renderInput("Pincode", form.zipCode, (t) =>
                setForm((p) => ({ ...p, zipCode: t }))
              )}
            </>
          ) : (
            <>
              <Field label="First Name" value={user?.firstName} />
              <Field label="Last Name" value={user?.lastName} />
              <Field label="Address" value={user?.personalDetails?.address} />
              <Field label="City" value={user?.personalDetails?.city} />
              <Field label="Pincode" value={user?.personalDetails?.zipCode} />
            </>
          )}
        </View>
      );
    }
    if (tab === "academic") {
      return (
        <View
          style={styles.sectionCard}
          onLayout={(e) => updateSectionY("academic", e)}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Academic Info</Text>
            {renderEditActions("academic")}
          </View>
          {editMode === "academic" ? (
            <>
              {renderInput("Graduation Year*", form.passingYear, (t) =>
                setForm((p) => ({ ...p, passingYear: t }))
              )}
              {renderInput("Degree", form.fieldOfStudy, (t) =>
                setForm((p) => ({ ...p, fieldOfStudy: t }))
              )}
              {renderInput(
                "College/University Name",
                form.institutionName,
                (t) => setForm((p) => ({ ...p, institutionName: t }))
              )}
            </>
          ) : (
            <>
              <Field
                label="Graduation Year*"
                value={user?.educationDetails?.passingYear}
              />
              <Field
                label="Degree"
                value={user?.educationDetails?.fieldOfStudy}
              />
              <Field
                label="College/University Name"
                value={user?.educationDetails?.institutionName}
              />
            </>
          )}
        </View>
      );
    }
    return (
      <View
        style={styles.sectionCard}
        onLayout={(e) => updateSectionY("job", e)}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Job Info</Text>
          {renderEditActions("job")}
        </View>
        {editMode === "job" ? (
          <>
            {renderInput("Company Name", form.company, (t) =>
              setForm((p) => ({ ...p, company: t }))
            )}
            {renderInput("Designation", form.designation, (t) =>
              setForm((p) => ({ ...p, designation: t }))
            )}
            {renderInput(
              "Years of Experience",
              form.experienceYears,
              (t) => setForm((p) => ({ ...p, experienceYears: t })),
              { keyboardType: "numeric" }
            )}
            {renderInput("LinkedIn Link", form.linkedin, (t) =>
              setForm((p) => ({ ...p, linkedin: t }))
            )}
          </>
        ) : (
          <>
            <Field label="Company Name" value={user?.jobDetails?.company} />
            <Field label="Designation" value={user?.jobDetails?.designation} />
            <Field
              label="Years of Experience"
              value={
                user?.jobDetails?.experienceYears
                  ? String(user.jobDetails.experienceYears)
                  : ""
              }
            />
            <Field label="LinkedIn Link" value={user?.jobDetails?.linkedin} />
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        enableOnAndroid
        extraScrollHeight={120}
      >
        <View style={[styles.stickyHeader, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity
              hitSlop={12}
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color="#111" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Account Details</Text>
            <View style={{ width: 22 }} />
          </View>
          <View style={styles.tabRow}>
            {[
              { key: "personal", label: "Personal Info" },
              { key: "academic", label: "Academic Info" },
              { key: "job", label: "Job Info" },
            ].map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => scrollToSection(t.key as any)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.tabText, tab === t.key && styles.tabActive]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {user?.imageUrl ? (
              <Image
                source={user.imageUrl}
                style={styles.avatarImg}
                contentFit="cover"
              />
            ) : (
              <Text style={styles.avatarLetter}>
                {fullName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            hitSlop={8}
            onPress={() => router.push("/profile/change-password")}
          >
            <Text style={styles.link}>Change Password</Text>
          </TouchableOpacity>
        </View>

        {renderSection()}
        {editMode && (
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.85}
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            disabled={saving}
          >
            <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...screenContainer,
    paddingTop: 0,
    backgroundColor: "#f6f8fb",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  stickyHeader: {
    backgroundColor: "#f6f8fb",
    // paddingHorizontal: 16,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 0,
    paddingTop: 0,
    position: "relative",
  },
  backBtn: {
    // padding: 10,
    position: "absolute",
    left: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    padding: 0,
    margin: 0,
    marginLeft: 30,
  },
  tabRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    paddingVertical: 6,
  },
  tabText: {
    fontSize: 14,
    color: "#777",
    fontWeight: "700",
  },
  tabActive: {
    color: "#2968ff",
    borderBottomWidth: 2,
    borderBottomColor: "#2968ff",
    paddingBottom: 6,
  },
  profileCard: {
    backgroundColor: "#0f5ad8",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e5edff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarLetter: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f5ad8",
  },
  name: {
    fontSize: 19,
    fontWeight: "800",
    color: "#fff",
  },
  email: {
    color: "#e6edff",
    fontSize: 13,
  },
  link: {
    color: "#cfe0ff",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4a5568",
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  field: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e4e7eb",
  },
  fieldLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
  },
  pencilBtn: {
    padding: 6,
  },
  inputWrap: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: "#e53935",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 4,
  },
  saveText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});
