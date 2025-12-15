import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { adminApi } from "../../services/adminApi";
import { Colors } from "../../constants";
import { useAdminAuth } from "../../context/AdminAuthContext";

interface Stats {
  totalUsers?: number;
  totalCourses?: number;
  totalEnrollments?: number;
  pendingTickets?: number;
  recentEnrollments?: number;
  monthlyRevenue?: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { admin, isAuthenticated } = useAdminAuth();
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      // Try to get courses count
      const coursesRes = await adminApi
        .getCourses()
        .catch(() => ({ items: [] }));

      // Try to get visitor stats
      const visitorStats = await adminApi
        .getAnalyticsSummary()
        .catch(() => ({}));

      setStats({
        totalCourses: coursesRes.items?.length || 0,
        totalUsers: visitorStats.totalVisitors || 0,
        totalEnrollments: visitorStats.totalPageViews || 0,
        pendingTickets: 0,
      });
    } catch (error) {
      console.log("Stats load error (non-critical):", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
    }
  }, [isAuthenticated]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, []);

  const StatCard = ({
    title,
    value,
    icon,
    color,
    onPress,
  }: {
    title: string;
    value: string | number;
    icon: string;
    color: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value ?? "-"}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const QuickAction = ({
    title,
    icon,
    onPress,
  }: {
    title: string;
    icon: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.adminName}>{admin?.name || "Admin"}</Text>
      </View>

      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Users"
          value={stats.totalUsers || 0}
          icon="👥"
          color={Colors.primary}
          onPress={() => router.push("/(tabs)/users")}
        />
        <StatCard
          title="Courses"
          value={stats.totalCourses || 0}
          icon="📚"
          color={Colors.success}
          onPress={() => router.push("/(tabs)/courses")}
        />
        <StatCard
          title="Enrollments"
          value={stats.totalEnrollments || 0}
          icon="🎓"
          color={Colors.accent}
        />
        <StatCard
          title="Pending Tickets"
          value={stats.pendingTickets || 0}
          icon="🎫"
          color={Colors.warning}
          onPress={() => router.push("/(tabs)/more/tickets")}
        />
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <QuickAction
          title="Manage Courses"
          icon="📚"
          onPress={() => router.push("/(tabs)/courses")}
        />
        <QuickAction
          title="View Users"
          icon="👥"
          onPress={() => router.push("/(tabs)/users")}
        />
        <QuickAction
          title="Emails"
          icon="📧"
          onPress={() => router.push("/(tabs)/more/emails")}
        />
        <QuickAction
          title="Events"
          icon="📅"
          onPress={() => router.push("/(tabs)/more/events")}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  welcomeCard: {
    backgroundColor: Colors.primary,
    padding: 24,
    margin: 16,
    borderRadius: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  welcomeText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  adminName: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a2e",
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    width: "46%",
    margin: "2%",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1a1a2e",
  },
  statTitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
    fontWeight: "500",
  },
  quickActions: {
    paddingHorizontal: 12,
    marginBottom: 32,
  },
  quickAction: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: "2%",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 26,
    width: 44,
    height: 44,
    textAlign: "center",
    lineHeight: 44,
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a2e",
    flex: 1,
  },
});
