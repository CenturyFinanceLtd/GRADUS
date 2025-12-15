import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { adminApi } from "../../../services/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { Colors } from "../../../constants";

interface Course {
  _id: string;
  name: string;
  slug: string;
  programme: string;
  hero?: { priceINR?: number };
  stats?: { modules?: number };
  updatedAt: string;
}

export default function CoursesListScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAdminAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filtered, setFiltered] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const loadCourses = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const response = await adminApi.getCourses();
      const items = response?.items || [];
      setCourses(items);
      setFiltered(items);
    } catch (error) {
      console.log("Failed to load courses:", error);
      setCourses([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadCourses();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(courses);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        courses.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.slug.toLowerCase().includes(q) ||
            c.programme?.toLowerCase().includes(q)
        )
      );
    }
  }, [search, courses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCourses();
    setRefreshing(false);
  }, []);

  const renderCourse = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={styles.courseCard}
      onPress={() =>
        router.push(`/(tabs)/courses/${encodeURIComponent(item.slug)}`)
      }
    >
      <View style={styles.courseHeader}>
        <Text style={styles.courseName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.programmeBadge}>
          <Text style={styles.programmeText}>{item.programme || "Gradus"}</Text>
        </View>
      </View>
      <Text style={styles.courseSlug}>{item.slug}</Text>
      <View style={styles.courseFooter}>
        <Text style={styles.coursePrice}>
          ₹{item.hero?.priceINR?.toLocaleString() || "0"}
        </Text>
        <Text style={styles.courseModules}>
          {item.stats?.modules || 0} modules
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search courses..."
          placeholderTextColor={Colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <TouchableOpacity
        style={styles.enrollmentsBtn}
        onPress={() => router.push("/(tabs)/courses/enrollments")}
      >
        <Text style={styles.enrollmentsBtnText}>📊 View All Enrollments</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.center}>
          <Text>Loading courses...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id || item.slug}
          renderItem={renderCourse}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No courses found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  enrollmentsBtn: {
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  enrollmentsBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  courseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  courseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  courseName: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  programmeBadge: {
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  programmeText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600",
  },
  courseSlug: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  courseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  coursePrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.success,
  },
  courseModules: {
    fontSize: 12,
    color: Colors.textSecondary,
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
});
