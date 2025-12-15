import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { adminApi } from "../../../services/adminApi";
import { Colors } from "../../../constants";

export default function CourseDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (slug) loadCourse();
  }, [slug]);

  const loadCourse = async () => {
    try {
      const { course: data } = await adminApi.getCourseBySlug(slug!);
      setCourse(data);
      setJsonText(JSON.stringify(data, null, 2));
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(jsonText);
      setSaving(true);
      await adminApi.updateCourse(slug!, parsed);
      Alert.alert("Success", "Course updated successfully");
      setEditing(false);
      loadCourse();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Invalid JSON");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.center}>
        <Text>Course not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: course.name }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.courseName}>{course.name}</Text>
          <Text style={styles.courseSlug}>{course.slug}</Text>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{course.programme}</Text>
            </View>
            <View
              style={[styles.badge, { backgroundColor: Colors.success + "20" }]}
            >
              <Text style={[styles.badgeText, { color: Colors.success }]}>
                ₹{course.hero?.priceINR?.toLocaleString() || "0"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              router.push(
                `/(tabs)/courses/enrollments?slug=${encodeURIComponent(slug!)}`
              )
            }
          >
            <Text style={styles.actionBtnText}>📊 Enrollments</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, editing && styles.actionBtnActive]}
            onPress={() => setEditing(!editing)}
          >
            <Text
              style={[
                styles.actionBtnText,
                editing && styles.actionBtnTextActive,
              ]}
            >
              {editing ? "Cancel" : "✏️ Edit JSON"}
            </Text>
          </TouchableOpacity>
        </View>

        {editing ? (
          <View style={styles.editorContainer}>
            <TextInput
              style={styles.jsonEditor}
              value={jsonText}
              onChangeText={setJsonText}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.infoSection}>
            <InfoRow
              label="Modules"
              value={course.stats?.modules || course.modules?.length || 0}
            />
            <InfoRow label="Level" value={course.stats?.level || "-"} />
            <InfoRow label="Duration" value={course.stats?.duration || "-"} />
            <InfoRow label="Mode" value={course.stats?.mode || "-"} />

            {course.aboutProgram?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                {course.aboutProgram.map((p: string, i: number) => (
                  <Text key={i} style={styles.paragraph}>
                    {p}
                  </Text>
                ))}
              </View>
            )}

            {course.learn?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What You'll Learn</Text>
                {course.learn.map((item: string, i: number) => (
                  <Text key={i} style={styles.listItem}>
                    • {item}
                  </Text>
                ))}
              </View>
            )}

            {course.careerOutcomes?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Career Outcomes</Text>
                {course.careerOutcomes.map((item: string, i: number) => (
                  <Text key={i} style={styles.listItem}>
                    • {item}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
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
  header: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  courseName: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  courseSlug: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  actionBtnTextActive: {
    color: "#fff",
  },
  editorContainer: {
    padding: 16,
  },
  jsonEditor: {
    backgroundColor: "#1e1e1e",
    color: "#d4d4d4",
    fontFamily: "monospace",
    fontSize: 12,
    padding: 16,
    borderRadius: 12,
    minHeight: 400,
    textAlignVertical: "top",
  },
  saveBtn: {
    backgroundColor: Colors.success,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  infoSection: {
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  infoValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
  },
  paragraph: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  listItem: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 24,
  },
});
