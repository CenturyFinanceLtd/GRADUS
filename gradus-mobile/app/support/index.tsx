import { useEffect, useMemo, useState } from "react";
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
import { useRouter } from "expo-router";

import { colors, fonts, radius, shadow, spacing } from "@/constants/Theme";
import GlassBackground from "@/components/GlassBackground";
import GlassHeader from "@/components/GlassHeader";
import FilterChip from "@/components/FilterChip";
import { useAuth } from "@/context/AuthContext";
import { createTicket, fetchTickets, TicketItem } from "@/services/support";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const statusFilters = [
  { label: "All", value: undefined },
  { label: "Open", value: "not_opened" },
  { label: "In progress", value: "in_progress" },
  { label: "Closed", value: "closed" },
];

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getStatusLabel = (value?: string) => {
  switch (value) {
    case "not_opened":
      return "Open";
    case "in_progress":
      return "In progress";
    case "pending_confirmation":
      return "Awaiting reply";
    case "closed":
      return "Closed";
    default:
      return "Open";
  }
};

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const token = session?.access_token || "";
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = subject.trim().length >= 3 && description.trim().length >= 10;

  const statusLabel = useMemo(
    () => (status ? getStatusLabel(status) : "tickets"),
    [status]
  );

  const loadTickets = async () => {
    if (!token) {
      setTickets([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await fetchTickets(token, status);
      setTickets(response.items || []);
    } catch (error: any) {
      Alert.alert("Unable to load support", error?.message || "Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [token, status]);

  const handleCreate = async () => {
    if (!token) {
      router.push({ pathname: "/auth/phone", params: { returnTo: "/support" } });
      return;
    }
    if (!canSubmit) {
      Alert.alert(
        "Add details",
        "Include a short subject and a longer description."
      );
      return;
    }
    try {
      setSubmitting(true);
      await createTicket(token, subject.trim(), description.trim());
      setSubject("");
      setDescription("");
      await loadTickets();
      Alert.alert("Support ticket created", "We will get back to you soon.");
    } catch (error: any) {
      Alert.alert("Unable to create ticket", error?.message || "Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassBackground>
      <GlassHeader title="Help & Support" />
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
          <Text style={styles.subheading}>
            Create a ticket or follow up on existing conversations.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Start a new ticket</Text>
          <Text style={styles.cardHint}>
            Share your issue so we can route it to the right team.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Subject"
            value={subject}
            onChangeText={setSubject}
            placeholderTextColor={colors.muted}
          />
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Describe your issue"
            value={description}
            onChangeText={setDescription}
            placeholderTextColor={colors.muted}
            multiline
          />
          <Pressable
            style={[styles.primaryButton, (!canSubmit || submitting) && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={!canSubmit || submitting}
          >
            <Text style={styles.primaryText}>
              {submitting ? "Submitting..." : "Create ticket"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.filters}>
          <Text style={styles.sectionTitle}>Your tickets</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {statusFilters.map((item) => (
              <FilterChip
                key={item.label}
                label={item.label}
                active={status === item.value}
                onPress={() => setStatus(item.value)}
              />
            ))}
          </ScrollView>
        </View>

        {!token ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Sign in to get support</Text>
            <Text style={styles.emptyText}>
              Create and track support tickets after logging in.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push({ pathname: "/auth/phone", params: { returnTo: "/support" } })
              }
            >
              <Text style={styles.primaryText}>Sign in</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : tickets.length === 0 ? (
          <Text style={styles.empty}>No {statusLabel.toLowerCase()} tickets yet.</Text>
        ) : (
          <View style={styles.ticketList}>
            {tickets.map((ticket) => (
              <Pressable
                key={ticket.id}
                style={styles.ticketCard}
                onPress={() => router.push(`/support/${ticket.id}`)}
              >
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                  <Text style={styles.ticketStatus}>
                    {getStatusLabel(ticket.status)}
                  </Text>
                </View>
                <Text style={styles.ticketMeta}>
                  {ticket.messageCount || 0} messages ·{" "}
                  {formatDate(ticket.lastMessageAt || ticket.createdAt)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
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
  header: {
    gap: spacing.xs,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  subheading: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  card: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.sm,
    ...shadow.card,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  cardHint: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
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
  primaryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    fontFamily: fonts.bodySemi,
  },
  filters: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  filterRow: {
    paddingRight: spacing.lg,
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    fontFamily: fonts.body,
  },
  emptyCard: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.sm,
    alignItems: "center",
    ...shadow.card,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  ticketList: {
    gap: spacing.md,
  },
  ticketCard: {
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  ticketSubject: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.heading,
    fontFamily: fonts.bodySemi,
  },
  ticketStatus: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: fonts.bodySemi,
  },
  ticketMeta: {
    marginTop: 6,
    fontSize: 12,
    color: colors.muted,
    fontFamily: fonts.body,
  },
});
