import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { colors, fonts, radius, shadow, spacing } from "@/constants/Theme";
import GlassBackground from "@/components/GlassBackground";
import GlassHeader from "@/components/GlassHeader";
import { useAuth } from "@/context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  addTicketMessage,
  closeTicket,
  fetchTicketDetail,
  TicketMessage,
} from "@/services/support";

const formatDateTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function SupportDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { session } = useAuth();
  const token = session?.access_token || "";
  const id = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("");
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  const loadTicket = async () => {
    if (!token || !id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await fetchTicketDetail(token, id);
      setSubject(response.item.subject);
      setStatus(response.item.status);
      setMessages(response.messages || []);
    } catch (error: any) {
      Alert.alert("Unable to load ticket", error?.message || "Try again.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [token, id]);

  const handleSend = async () => {
    if (!token || !id) return;
    if (reply.trim().length < 2) {
      Alert.alert("Add a reply", "Write a short message to continue.");
      return;
    }
    try {
      setSending(true);
      await addTicketMessage(token, id, reply.trim());
      setReply("");
      await loadTicket();
    } catch (error: any) {
      Alert.alert("Unable to send", error?.message || "Try again.");
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!token || !id) return;
    try {
      setClosing(true);
      await closeTicket(token, id);
      await loadTicket();
      Alert.alert("Ticket closed", "If you need more help, open a new ticket.");
    } catch (error: any) {
      Alert.alert("Unable to close ticket", error?.message || "Try again.");
    } finally {
      setClosing(false);
    }
  };

  if (!token) {
    return (
      <GlassBackground>
        <View style={styles.loading}>
          <Text style={styles.error}>Sign in to view this ticket.</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              router.push({
                pathname: "/auth/phone",
                params: { returnTo: "/support" },
              })
            }
          >
            <Text style={styles.primaryText}>Sign in</Text>
          </Pressable>
        </View>
      </GlassBackground>
    );
  }

  if (loading) {
    return (
      <GlassBackground>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
      <GlassHeader title="Ticket Details" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 70 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>{subject}</Text>
          <Text style={styles.status}>{status.replace(/_/g, " ")}</Text>
        </View>

        <View style={styles.messages}>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.authorType === "user"
                  ? styles.messageUser
                  : styles.messageAgent,
              ]}
            >
              <Text style={styles.messageText}>{message.body}</Text>
              <Text style={styles.messageMeta}>
                {message.authorType === "user" ? "You" : "Support"} ·{" "}
                {formatDateTime(message.createdAt)}
              </Text>
            </View>
          ))}
        </View>

        {status !== "closed" ? (
          <View style={styles.replyCard}>
            <Text style={styles.replyTitle}>Reply</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Type your response"
              value={reply}
              onChangeText={setReply}
              placeholderTextColor={colors.muted}
              multiline
            />
            <View style={styles.replyActions}>
              <Pressable
                style={[styles.secondaryButton, closing && styles.buttonDisabled]}
                onPress={handleClose}
                disabled={closing}
              >
                <Text style={styles.secondaryText}>
                  {closing ? "Closing..." : "Close ticket"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, (sending || !reply.trim()) && styles.buttonDisabled]}
                onPress={handleSend}
                disabled={sending || !reply.trim()}
              >
                <Text style={styles.primaryText}>
                  {sending ? "Sending..." : "Send reply"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 120,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    fontSize: 15,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  status: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: fonts.bodySemi,
  },
  messages: {
    gap: spacing.sm,
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  messageUser: {
    backgroundColor: colors.glassHighlight,
    alignSelf: "flex-end",
  },
  messageAgent: {
    backgroundColor: colors.glass,
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.body,
  },
  messageMeta: {
    marginTop: 6,
    fontSize: 11,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  replyCard: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.sm,
    ...shadow.card,
  },
  replyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.glassHighlight,
    fontFamily: fonts.body,
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  replyActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    fontFamily: fonts.bodySemi,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassHighlight,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 13,
    fontFamily: fonts.bodySemi,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
