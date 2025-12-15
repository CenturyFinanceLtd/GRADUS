import { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { adminApi } from "../../../services/adminApi";
import { Colors } from "../../../constants";

interface Enrollment {
  slug: string;
  name: string;
  programme: string;
  totalEnrollments: number;
  paidEnrollments: number;
  learners: {
    enrollmentId: string;
    name: string;
    email: string;
    paymentStatus: string;
    createdAt: string;
  }[];
}

export default function EnrollmentsScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEnrollments = async () => {
    try {
      const { items } = await adminApi.getCourseEnrollments(slug);
      setEnrollments(items);
    } catch (error) {
      console.error("Failed to load enrollments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnrollments();
  }, [slug]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEnrollments();
    setRefreshing(false);
  };

  const renderCourseEnrollments = ({ item }: { item: Enrollment }) => (
    <View style={styles.courseCard}>
      <View style={styles.courseHeader}>
        <Text style={styles.courseName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.totalEnrollments}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: Colors.success }]}>
              {item.paidEnrollments}
            </Text>
            <Text style={styles.statLabel}>Paid</Text>
          </View>
        </View>
      </View>

      {item.learners.length > 0 && (
        <View style={styles.learnersContainer}>
          {item.learners.slice(0, 5).map((learner) => (
            <View key={learner.enrollmentId} style={styles.learnerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {learner.name?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>
              <View style={styles.learnerInfo}>
                <Text style={styles.learnerName}>{learner.name}</Text>
                <Text style={styles.learnerEmail}>{learner.email}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      learner.paymentStatus === "PAID"
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
                        learner.paymentStatus === "PAID"
                          ? Colors.success
                          : Colors.warning,
                    },
                  ]}
                >
                  {learner.paymentStatus}
                </Text>
              </View>
            </View>
          ))}
          {item.learners.length > 5 && (
            <Text style={styles.moreText}>
              +{item.learners.length - 5} more
            </Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{ title: slug ? `Enrollments: ${slug}` : "All Enrollments" }}
      />
      <View style={styles.container}>
        {loading ? (
          <View style={styles.center}>
            <Text>Loading enrollments...</Text>
          </View>
        ) : (
          <FlatList
            data={enrollments}
            keyExtractor={(item) => item.slug}
            renderItem={renderCourseEnrollments}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>No enrollments found</Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    color: Colors.textSecondary,
  },
  courseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  courseHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  courseName: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 24,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  learnersContainer: {
    padding: 12,
  },
  learnerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.primary,
  },
  learnerInfo: {
    flex: 1,
  },
  learnerName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  learnerEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  moreText: {
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
});
