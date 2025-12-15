import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Colors } from "../../../constants";

export default function UserDetailScreen() {
  const params = useLocalSearchParams<{ id: string; userData?: string }>();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.userData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(params.userData));
        setUser(decoded);
      } catch (e) {
        console.log("Failed to parse user data:", e);
      }
    }
    setLoading(false);
  }, [params.userData]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>User not found</Text>
        <Text style={styles.hint}>User ID: {params.id}</Text>
      </View>
    );
  }

  const name =
    user.personalDetails?.studentName ||
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.name ||
    "Unknown";

  return (
    <>
      <Stack.Screen options={{ title: name }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user.roleLabel || user.role || "user"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <InfoRow label="Email" value={user.email} />
          <InfoRow
            label="Phone"
            value={
              user.mobile ||
              user.phoneNumber ||
              user.personalDetails?.phone ||
              "-"
            }
          />
          <InfoRow label="City" value={user.personalDetails?.city || "-"} />
          <InfoRow label="State" value={user.personalDetails?.state || "-"} />
        </View>

        {user.educationDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            <InfoRow
              label="Institution"
              value={user.educationDetails.institutionName || "-"}
            />
            <InfoRow
              label="Degree"
              value={user.educationDetails.degree || "-"}
            />
            <InfoRow
              label="Year"
              value={user.educationDetails.graduationYear || "-"}
            />
          </View>
        )}

        {user.enrollments && user.enrollments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Enrollments ({user.enrollments.length})
            </Text>
            {user.enrollments.map((enrollment: any, i: number) => (
              <View key={i} style={styles.enrollmentCard}>
                <Text style={styles.enrollmentCourse}>
                  {enrollment.courseName || enrollment.courseSlug}
                </Text>
                <View style={styles.enrollmentMeta}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          enrollment.paymentStatus === "PAID"
                            ? Colors.success + "20"
                            : Colors.warning + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            enrollment.paymentStatus === "PAID"
                              ? Colors.success
                              : Colors.warning,
                        },
                      ]}
                    >
                      {enrollment.paymentStatus}
                    </Text>
                  </View>
                  <Text style={styles.enrollmentDate}>
                    {new Date(enrollment.enrolledAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {user.loginStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Login Stats</Text>
            <InfoRow
              label="Total Logins"
              value={user.loginStats.totalLogins || 0}
            />
            <InfoRow
              label="Total Logouts"
              value={user.loginStats.totalLogouts || 0}
            />
            {user.loginStats.lastLoginAt && (
              <InfoRow
                label="Last Login"
                value={new Date(user.loginStats.lastLoginAt).toLocaleString()}
              />
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <InfoRow
            label="Email Verified"
            value={user.emailVerified ? "Yes" : "No"}
          />
          {user.createdAt && (
            <InfoRow
              label="Created"
              value={new Date(user.createdAt).toLocaleDateString()}
            />
          )}
          {user.updatedAt && (
            <InfoRow
              label="Last Updated"
              value={new Date(user.updatedAt).toLocaleDateString()}
            />
          )}
        </View>
      </ScrollView>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  hint: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  header: {
    backgroundColor: "#fff",
    padding: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  roleText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  infoValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
    maxWidth: "60%",
    textAlign: "right",
  },
  enrollmentCard: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  enrollmentCourse: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  enrollmentMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  enrollmentDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
