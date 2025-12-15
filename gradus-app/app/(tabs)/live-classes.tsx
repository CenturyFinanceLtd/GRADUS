import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useEffect, useMemo, useState, useCallback } from "react";
import { router } from "expo-router";
import TopBar from "@/components/top-bar";
import { API_BASE_URL, WEB_BASE_URL } from "@/constants/config";
import { screenContainer } from "@/styles/layout";
import { getAuthSession } from "@/utils/auth-storage";
import { usePushNotifications } from "@/hooks/usePushNotifications";

type EventSchedule = { start?: string | null; end?: string | null };

type LiveEvent = {
  id?: string;
  slug?: string;
  title?: string;
  subtitle?: string;
  eventType?: string;
  category?: string;
  trackLabel?: string;
  programme?: string;
  heroImage?: { url?: string | null };
  host?: { name?: string | null; title?: string | null };
  schedule?: EventSchedule;
  cta?: { label?: string | null; url?: string | null };
  mode?: string | null;
};

type SessionCard = {
  id: string;
  title: string;
  mentor: string;
  mentorTitle?: string;
  tag: string;
  date: string;
  time: string;
  badge: string;
  isLive: boolean;
  timeLeft: string;
  image: string | number;
  ctaLabel: string;
  ctaUrl: string | null;
  ctaRoute?: string | null;
  detailsUrl: string | null;
  detailsRoute?: string | null;
  modeLabel: string;
  source: "event" | "live";
  courseKey?: string | null;
  courseId?: string | null;
  programmeHint?: string | null;
  participantCount?: number | null;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80";

const isValidDate = (value: Date | null) =>
  value instanceof Date && !Number.isNaN(value.getTime());

const normalizeKey = (value?: string | null) => {
  if (!value && value !== "0") return "";
  return String(value).trim().toLowerCase();
};

const normalizeProgrammeTag = (value?: string | null) => {
  const text = (value || "").trim().toLowerCase();
  if (!text) return null;
  const normalized = text.replace(/[-_]/g, " ");
  if (normalized.includes("finlit")) return "Gradus Finlit";
  if (normalized.includes("lead")) return "Gradus Lead";
  if (normalized.includes("gradus x") || normalized === "x") return "Gradus X";
  return null;
};

const formatCount = (value?: number | null) => {
  if (typeof value === "number" && value >= 0) return `${value} joined`;
  return "0 joined";
};

const isLiveNow = (start: Date | null, end: Date | null) => {
  if (!isValidDate(start)) {
    return false;
  }
  const now = Date.now();
  const startMs = start!.getTime();
  const endMs = isValidDate(end) ? end!.getTime() : startMs + 90 * 60 * 1000; // assume 90 min window when no end
  return now >= startMs && now <= endMs;
};

const formatDateLabel = (value: Date | null) => {
  if (!isValidDate(value)) return "Date TBA";
  const date = value as Date;
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
  const dayDiff = Math.round(
    (startOfDate - startOfToday) / (1000 * 60 * 60 * 24)
  );

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Tomorrow";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

const formatTimeLabel = (value: Date | null, live: boolean) => {
  if (live) return "Now";
  if (!isValidDate(value)) return "-";
  return (value as Date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCountdown = (value: Date | null) => {
  if (!isValidDate(value)) return "Schedule TBA";
  const diffMs = (value as Date).getTime() - Date.now();
  if (diffMs <= 0) return "Starting soon";
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `Starts in ${minutes}m`;
  const hours = Math.round(diffMs / (60 * 60000));
  if (hours < 24) return `Starts in ${hours}h`;
  const days = Math.round(diffMs / (24 * 60 * 60000));
  return `${days}d to go`;
};

const getProgrammeFromMap = (
  map: Record<string, string>,
  keys: (string | null | undefined)[],
  fallback?: string | null
) => {
  for (const key of keys) {
    const normalized = normalizeKey(key || undefined);
    if (normalized && map[normalized]) {
      return map[normalized];
    }
  }
  const normalizedFallback = normalizeProgrammeTag(fallback);
  return normalizedFallback || null;
};

const normalizeEvent = (
  event: LiveEvent,
  index: number,
  programmeMap: Record<string, string>
): SessionCard => {
  const start = event?.schedule?.start ? new Date(event.schedule.start) : null;
  const end = event?.schedule?.end ? new Date(event.schedule.end) : null;
  const live = isLiveNow(start, end);
  const programmeTag =
    getProgrammeFromMap(
      programmeMap,
      [
        event?.programme as any,
        event?.category as any,
        event?.trackLabel as any,
      ],
      event?.programme as any
    ) ||
    normalizeProgrammeTag(event?.category) ||
    normalizeProgrammeTag(event?.programme) ||
    normalizeProgrammeTag(event?.trackLabel as any);
  const tag =
    programmeTag ||
    event?.eventType?.trim() ||
    event?.category?.trim() ||
    event?.subtitle?.trim() ||
    "Live class";
  const slug = event?.slug?.trim();
  const baseUrl = slug ? `${WEB_BASE_URL}/events/${slug}` : null;

  return {
    id: String(event?.id || slug || `event-${index}`),
    title: event?.title?.trim() || "Live class",
    mentor: event?.host?.name?.trim() || "Gradus Mentor",
    mentorTitle: event?.host?.title?.trim() || "",
    tag,
    date: formatDateLabel(start),
    time: formatTimeLabel(start, live),
    badge: live ? "LIVE NOW" : "Scheduled",
    isLive: live,
    timeLeft: live ? "Running" : formatCountdown(start),
    image: event?.heroImage?.url?.trim() || fallbackImage,
    ctaLabel: event?.cta?.label?.trim() || (live ? "Join Now" : "Register"),
    ctaUrl: event?.cta?.url?.trim() || baseUrl,
    detailsUrl: baseUrl || event?.cta?.url?.trim() || null,
    ctaRoute: null,
    detailsRoute: null,
    modeLabel: event?.mode
      ? `${event.mode[0]?.toUpperCase?.() || ""}${event.mode
          .slice(1)
          .toLowerCase?.()}`
      : "Online session",
    source: "event",
    participantCount: null,
  };
};

export default function LiveClassesScreen() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [liveSessions, setLiveSessions] = useState<SessionCard[]>([]);
  const [programmeMap, setProgrammeMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  usePushNotifications(); // Init hook for side effects only

  const fetchLiveClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventData, liveData, courseProgrammes] = await Promise.all([
        (async () => {
          const res = await fetch(
            `${API_BASE_URL}/api/events?timeframe=upcoming&limit=20`
          );
          if (!res.ok) {
            throw new Error(`Failed to load live classes (${res.status})`);
          }
          const data = await res.json();
          return Array.isArray(data?.items) ? data.items : [];
        })(),
        (async () => {
          try {
            const { token } = await getAuthSession();
            if (!token) return [];

            const enrollRes = await fetch(
              `${API_BASE_URL}/api/users/me/enrollments`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            if (!enrollRes.ok) return [];
            const enrollBody = await enrollRes.json();
            const paidEnrollments = Array.isArray(enrollBody?.items)
              ? enrollBody.items.filter(
                  (item: any) =>
                    !item?.paymentStatus || item.paymentStatus === "PAID"
                )
              : [];

            const results = await Promise.all(
              paidEnrollments.map(async (enrollment: any) => {
                const course = enrollment?.course || {};
                const key =
                  course?.slug ||
                  course?.id ||
                  enrollment?.courseSlug ||
                  enrollment?.courseId;
                if (!key) return null;
                const courseProgramme =
                  course?.programme ||
                  course?.programmeSlug ||
                  enrollment?.programme ||
                  enrollment?.programmeSlug ||
                  null;
                try {
                  const res = await fetch(
                    `${API_BASE_URL}/api/live/sessions/course/${encodeURIComponent(
                      key
                    )}/active`,
                    {
                      headers: { Authorization: `Bearer ${token}` },
                    }
                  );
                  if (!res.ok) return null;
                  const body = await res.json();
                  if (!body?.session || body.session.status !== "live")
                    return null;

                  const session = body.session;
                  const start = session.startedAt
                    ? new Date(session.startedAt)
                    : session.scheduledFor
                    ? new Date(session.scheduledFor)
                    : null;

                  const programmeTag =
                    normalizeProgrammeTag(
                      course?.programme || course?.programmeSlug
                    ) ||
                    normalizeProgrammeTag(enrollment?.programme) ||
                    null;
                  const participantCount =
                    typeof session?.activeParticipantCount === "number"
                      ? session.activeParticipantCount
                      : typeof session?.totalParticipantCount === "number"
                      ? session.totalParticipantCount
                      : null;

                  return {
                    id: String(session.id || session._id),
                    title:
                      session.title ||
                      course?.name ||
                      course?.title ||
                      "Live Class",
                    mentor: session.hostDisplayName || "Instructor",
                    mentorTitle: "",
                    tag:
                      programmeTag ||
                      courseProgramme ||
                      course?.name ||
                      "Live class",
                    date: formatDateLabel(start),
                    time: formatTimeLabel(start, true),
                    badge: "LIVE NOW",
                    isLive: true,
                    timeLeft: "Running",
                    image: course?.imageUrl || fallbackImage,
                    ctaLabel: "Join Now",
                    ctaUrl: null,
                    ctaRoute: session.id
                      ? `/live/${session.id}`
                      : `/live/${session._id}`,
                    detailsUrl: null,
                    detailsRoute: session.id
                      ? `/live/${session.id}`
                      : `/live/${session._id}`,
                    modeLabel: "Live session",
                    source: "live",
                    courseKey: key ? String(key) : null,
                    courseId: course?._id || course?.id || null,
                    programmeHint: courseProgramme,
                    participantCount,
                  } as SessionCard;
                } catch {
                  return null;
                }
              })
            );

            return results.filter(Boolean) as SessionCard[];
          } catch {
            return [];
          }
        })(),
        (async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/courses?limit=200`);
            if (!res.ok) return {};
            const data = await res.json();
            const items = Array.isArray(data?.items) ? data.items : [];
            const map: Record<string, string> = {};
            items.forEach((course: any) => {
              const programme =
                normalizeProgrammeTag(
                  course?.programme || course?.programmeSlug
                ) ||
                course?.programme ||
                course?.programmeSlug ||
                null;
              if (!programme) return;
              const slugKey = normalizeKey(
                course?.slug || course?.courseSlug || course?.programmeSlug
              );
              const idKey = normalizeKey(course?._id || course?.id);
              const slugParts = (course?.slug || "").split("/").filter(Boolean);
              const tailSlug = slugParts.length
                ? normalizeKey(slugParts[slugParts.length - 1])
                : "";

              if (slugKey) map[slugKey] = programme;
              if (idKey) map[idKey] = programme;
              if (tailSlug) map[tailSlug] = programme;
            });
            return map;
          } catch {
            return {};
          }
        })(),
      ]);

      setEvents(eventData);
      setLiveSessions(liveData);
      setProgrammeMap(courseProgrammes);
    } catch (err: any) {
      setError(err?.message || "Unable to load live classes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveClasses();
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLiveClasses();
  }, []);

  const sessions = useMemo(() => {
    const mapProgrammeTag = (card: SessionCard): SessionCard => {
      const programmeTag =
        getProgrammeFromMap(programmeMap, [
          card.courseKey,
          card.courseId,
          card.programmeHint,
        ]) || normalizeProgrammeTag(card.tag);

      return {
        ...card,
        tag: programmeTag || card.tag,
      };
    };

    const liveCards = liveSessions.map(mapProgrammeTag);
    const eventCards = events.map((ev, idx) =>
      normalizeEvent(ev, idx, programmeMap)
    );
    return [...liveCards, ...eventCards];
  }, [events, liveSessions, programmeMap]);

  const handleOpenUrl = async (url: string | null) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.warn("Failed to open link", err);
    }
  };

  const handlePrimaryCta = (session: SessionCard) => {
    if (session.ctaRoute) {
      router.push(session.ctaRoute as any);
      return;
    }
    handleOpenUrl(session.ctaUrl);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBarWrapper}>
        <TopBar onProfilePress={() => router.push("/auth/signin")} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.pageTitle}>Live Classes</Text>

        {loading && (
          <View style={styles.stateCard}>
            <ActivityIndicator size="small" color="#ef3b3b" />
            <Text style={styles.stateText}>Loading live classes...</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Unable to load</Text>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        )}

        {!loading && !error && sessions.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Live class not scheduled</Text>
            <Text style={styles.stateText}>
              We will display upcoming or live sessions here as soon as they are
              announced.
            </Text>
          </View>
        )}

        {sessions.map((session) => (
          <View key={session.id} style={styles.card}>
            <Image
              source={
                typeof session.image === "string"
                  ? { uri: session.image }
                  : session.image
              }
              style={styles.cardImage}
              contentFit="cover"
            />
            <View style={styles.cardOverlay}>
              <Text style={styles.sessionTag}>{session.tag}</Text>
              <Text style={styles.sessionName}>
                {session.mentor}
                {session.mentorTitle ? ` | ${session.mentorTitle}` : ""}
              </Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.badgeRow}>
                <Text
                  style={[
                    styles.liveBadge,
                    session.isLive && styles.liveBadgeActive,
                  ]}
                >
                  {session.badge}
                </Text>
                <View style={styles.regRow}>
                  <Ionicons name="videocam" size={14} color="#666" />
                  <Text style={styles.regText}>{session.modeLabel}</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>{session.title}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={14} color="#666" />
                  <Text style={styles.metaText}>{session.date}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  <Text style={styles.metaText}>{session.time}</Text>
                </View>
                {session.participantCount !== null &&
                  session.participantCount !== undefined && (
                    <View style={styles.metaItem}>
                      <Ionicons name="people" size={14} color="#666" />
                      <Text style={styles.metaText}>
                        {formatCount(session.participantCount)}
                      </Text>
                    </View>
                  )}
                <Text
                  style={[
                    styles.countdown,
                    session.isLive && styles.countdownLive,
                  ]}
                >
                  {session.timeLeft}
                </Text>
              </View>

              <View style={styles.footerRow}>
                <TouchableOpacity
                  style={[styles.primaryBtn, session.isLive && styles.joinBtn]}
                  activeOpacity={0.85}
                  onPress={() => handlePrimaryCta(session)}
                >
                  <Text style={styles.primaryText}>{session.ctaLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  liveBadgeActive: {
    backgroundColor: "#ffe0e0",
    color: "#d32f2f",
  },
  countdownLive: {
    color: "#d32f2f",
    fontWeight: "bold",
  },
  screen: {
    ...screenContainer,
  },
  topBarWrapper: {
    // paddingHorizontal: 16,
    backgroundColor: "#f4f4f4",
    zIndex: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 14,
  },
  pageTitle: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "800",
    color: "#222",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    marginBottom: 12,
  },
  cardImage: {
    width: "100%",
    height: 200,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  cardOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
    alignItems: "flex-end",
    gap: 6,
  },
  sessionTag: {
    backgroundColor: "#2968ff",
    color: "#fff",
    fontWeight: "800",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  sessionName: {
    backgroundColor: "#12a84d",
    color: "#fff",
    fontWeight: "800",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  cardBody: {
    padding: 16,
    gap: 12,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liveBadge: {
    backgroundColor: "#fde4e7",
    color: "#e53935",
    fontWeight: "700",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    fontSize: 13,
  },
  regRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f3f3f3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  regText: {
    fontSize: 13,
    color: "#444",
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  countdown: {
    fontSize: 13,
    color: "#d32f2f",
    fontWeight: "800",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: "#ef3b3b",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  joinBtn: {
    backgroundColor: "#ef3b3b",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  stateCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginTop: 8,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#222",
  },
  stateText: {
    fontSize: 14,
    color: "#555",
  },
});
