import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { Colors } from "../../../constants";

export default function MoreScreen() {
  const router = useRouter();
  const { admin, logout } = useAdminAuth();

  const menuItems = [
    { icon: "📅", label: "Events", route: "/(tabs)/more/events" },
    { icon: "📧", label: "Emails", route: "/(tabs)/more/emails" },
    { icon: "🎫", label: "Support Tickets", route: "/(tabs)/more/tickets" },
    { icon: "⚙️", label: "Settings", route: "/(tabs)/more/settings" },
  ];

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/signin");
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {admin?.name?.charAt(0)?.toUpperCase() || "A"}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{admin?.name || "Admin"}</Text>
          <Text style={styles.profileEmail}>{admin?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{admin?.role || "admin"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Gradus Admin v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  profileCard: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  roleText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  menuSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: "500",
  },
  menuArrow: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  logoutBtn: {
    backgroundColor: Colors.error + "15",
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: "600",
  },
  version: {
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 24,
    marginBottom: 32,
  },
});
