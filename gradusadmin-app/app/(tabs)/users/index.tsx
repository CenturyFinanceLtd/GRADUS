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

interface User {
  _id: string;
  id?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  mobile?: string;
  phoneNumber?: string;
  role?: string;
  roleLabel?: string;
  status?: string;
  enrollmentCount?: number;
  createdAt?: string;
}

type TabType = "website" | "admin";

export default function UsersListScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<TabType>("website");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  const loadUsers = async (searchQuery = "") => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (activeTab === "website") {
        const response = await adminApi.getWebsiteUsers(1, 50, searchQuery);
        const items = response?.users || [];
        setUsers(items);
        setTotal(response?.total || items.length);
      } else {
        const response = await adminApi.getAdminUsers(undefined, searchQuery);
        const items = response?.users || [];
        setUsers(items);
        setTotal(items.length);
      }
    } catch (error) {
      console.log("Failed to load users:", error);
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers(search);
    }
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timeout = setTimeout(() => {
      loadUsers(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, isAuthenticated]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers(search);
    setRefreshing(false);
  }, [search, activeTab]);

  const getUserName = (user: User) => {
    if (user.fullName) return user.fullName;
    if (user.name) return user.name;
    if (user.firstName || user.lastName) {
      return [user.firstName, user.lastName].filter(Boolean).join(" ");
    }
    return user.email.split("@")[0];
  };

  const renderUser = ({ item }: { item: User }) => {
    const name = getUserName(item);
    const userId = item._id || item.id;

    const handlePress = () => {
      if (userId) {
        // Pass user data via params so we don't need another API call
        const userData = encodeURIComponent(JSON.stringify(item));
        router.push({
          pathname: "/(tabs)/users/[id]",
          params: { id: userId, userData },
        });
      }
    };

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          {item.mobile && <Text style={styles.userMobile}>{item.mobile}</Text>}
        </View>
        <View style={styles.userMeta}>
          {activeTab === "admin" && (
            <>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      item.status === "active"
                        ? Colors.success + "20"
                        : Colors.error + "20",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        item.status === "active"
                          ? Colors.success
                          : Colors.error,
                    },
                  ]}
                >
                  {item.status || "active"}
                </Text>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{item.role || "admin"}</Text>
              </View>
            </>
          )}
          {activeTab === "website" && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>user</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "website" && styles.tabActive]}
          onPress={() => setActiveTab("website")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "website" && styles.tabTextActive,
            ]}
          >
            Website Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "admin" && styles.tabActive]}
          onPress={() => setActiveTab("admin")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "admin" && styles.tabTextActive,
            ]}
          >
            Admin Users
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab} users...`}
          placeholderTextColor={Colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {total} {activeTab} users {search ? `matching "${search}"` : ""}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id || item.id || item.email}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No users found</Text>
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: "#fff",
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
  countRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  countText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "bold",
    color: Colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  userMobile: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  userMeta: {
    alignItems: "flex-end",
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  roleBadge: {
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600",
    textTransform: "capitalize",
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
