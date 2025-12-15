import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { adminApi } from "../../../services/adminApi";
import { Colors } from "../../../constants";

interface Ticket {
  _id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  user: {
    name: string;
    email: string;
  };
  replies?: Array<{
    message: string;
    fromAdmin: boolean;
    createdAt: string;
  }>;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: Colors.warning,
  "in-progress": Colors.primary,
  resolved: Colors.success,
  closed: Colors.textSecondary,
};

export default function TicketsScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const loadTickets = async () => {
    try {
      const { items } = await adminApi.getTickets(filter);
      setTickets(items);
    } catch (error) {
      console.error("Failed to load tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadTickets();
  }, [filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  }, [filter]);

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;

    setSending(true);
    try {
      await adminApi.replyToTicket(selectedTicket._id, replyText.trim());
      Alert.alert("Success", "Reply sent");
      setReplyText("");
      // Reload ticket
      const { ticket } = await adminApi.getTicketById(selectedTicket._id);
      setSelectedTicket(ticket);
      loadTickets();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) =>
    STATUS_COLORS[status.toLowerCase()] || Colors.textSecondary;

  const renderTicket = ({ item }: { item: Ticket }) => (
    <TouchableOpacity
      style={styles.ticketCard}
      onPress={() => setSelectedTicket(item)}
    >
      <View style={styles.ticketHeader}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status}
          </Text>
        </View>
        <Text style={styles.ticketDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.ticketSubject}>{item.subject}</Text>
      <Text style={styles.ticketMessage} numberOfLines={2}>
        {item.message}
      </Text>
      <View style={styles.ticketFooter}>
        <Text style={styles.ticketUser}>
          👤 {item.user?.name || "Unknown user"}
        </Text>
        {item.replies && item.replies.length > 0 && (
          <Text style={styles.ticketReplies}>
            💬 {item.replies.length} replies
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const filters = [
    { label: "All", value: undefined },
    { label: "Open", value: "open" },
    { label: "In Progress", value: "in-progress" },
    { label: "Resolved", value: "resolved" },
  ];

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[
              styles.filterTab,
              filter === f.value && styles.filterTabActive,
            ]}
            onPress={() => setFilter(f.value)}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === f.value && styles.filterTabTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item._id}
          renderItem={renderTicket}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🎫</Text>
              <Text style={styles.emptyText}>No tickets found</Text>
            </View>
          }
        />
      )}

      {/* Ticket Detail Modal */}
      <Modal visible={!!selectedTicket} animationType="slide">
        <View style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setSelectedTicket(null)}>
              <Text style={styles.detailBack}>← Back</Text>
            </TouchableOpacity>
            {selectedTicket && (
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      getStatusColor(selectedTicket.status) + "20",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(selectedTicket.status) },
                  ]}
                >
                  {selectedTicket.status}
                </Text>
              </View>
            )}
          </View>

          {selectedTicket && (
            <>
              <ScrollView style={styles.detailContent}>
                <Text style={styles.detailSubject}>
                  {selectedTicket.subject}
                </Text>
                <View style={styles.detailMeta}>
                  <Text style={styles.detailUser}>
                    👤 {selectedTicket.user?.name || "Unknown"}
                  </Text>
                  <Text style={styles.detailEmail}>
                    {selectedTicket.user?.email}
                  </Text>
                  <Text style={styles.detailDate}>
                    {new Date(selectedTicket.createdAt).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.messageCard}>
                  <Text style={styles.messageLabel}>Original Message</Text>
                  <Text style={styles.messageText}>
                    {selectedTicket.message}
                  </Text>
                </View>

                {selectedTicket.replies &&
                  selectedTicket.replies.length > 0 && (
                    <View style={styles.repliesContainer}>
                      <Text style={styles.repliesLabel}>Replies</Text>
                      {selectedTicket.replies.map((reply, index) => (
                        <View
                          key={index}
                          style={[
                            styles.replyCard,
                            reply.fromAdmin && styles.replyCardAdmin,
                          ]}
                        >
                          <Text style={styles.replySender}>
                            {reply.fromAdmin ? "🔐 Admin" : "👤 User"}
                          </Text>
                          <Text style={styles.replyText}>{reply.message}</Text>
                          <Text style={styles.replyDate}>
                            {new Date(reply.createdAt).toLocaleString()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
              </ScrollView>

              <View style={styles.replyInputContainer}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Type your reply..."
                  placeholderTextColor={Colors.textSecondary}
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                />
                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={handleReply}
                  disabled={sending || !replyText.trim()}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.sendBtnText}>Send</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterContent: {
    padding: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: "#fff",
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  ticketCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  ticketDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  ticketSubject: {
    fontSize: 15,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 6,
  },
  ticketMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  ticketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketUser: {
    fontSize: 12,
    color: Colors.text,
  },
  ticketReplies: {
    fontSize: 12,
    color: Colors.primary,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailBack: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  detailSubject: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
  },
  detailMeta: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  detailUser: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "600",
  },
  detailEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  messageCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  messageLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: "600",
  },
  messageText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  repliesContainer: {
    marginTop: 8,
  },
  repliesLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
  },
  replyCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.textSecondary,
  },
  replyCardAdmin: {
    borderLeftColor: Colors.primary,
  },
  replySender: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 6,
  },
  replyText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  replyDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  replyInputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: "flex-end",
  },
  replyInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sendBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
