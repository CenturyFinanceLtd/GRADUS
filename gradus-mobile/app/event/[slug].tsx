import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EventItem, fetchEventBySlug } from "@/services/events";
import { registerForEvent } from "@/services/registrations";
import { useAuth } from "@/context/AuthContext";
import { fetchUserProfile } from "@/services/users";

const formatSchedule = (value?: string) => {
  if (!value) return "Schedule TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Schedule TBA";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getJoinWindow = (start?: string) => {
  if (!start) return { canJoin: true, label: "Join session" };
  const startTime = new Date(start).getTime();
  if (Number.isNaN(startTime)) return { canJoin: true, label: "Join session" };
  const now = Date.now();
  const earliest = startTime - 10 * 60 * 1000;
  const latest = startTime + 30 * 60 * 1000;
  if (now < earliest) return { canJoin: false, label: "Join opens 10 min before" };
  if (now > latest) return { canJoin: false, label: "Join window closed" };
  return { canJoin: true, label: "Join session" };
};

export default function EventDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const slug =
    typeof params.slug === "string" ? decodeURIComponent(params.slug) : "";
  const { user, session } = useAuth();
  const token = session?.access_token || "";

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [occupation, setOccupation] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        const data = await fetchEventBySlug(slug);
        setEvent(data);
      } catch (error) {
        console.warn("[event] Failed to load", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  useEffect(() => {
    const prefill = async () => {
      if (!token) return;
      try {
        const profile = await fetchUserProfile(token);
        setFirstName(profile.firstName || "");
        setLastName(profile.lastName || "");
        setEmail(profile.email || "");
        setPhone(profile.mobile || "");
        const details = (profile.personalDetails || {}) as Record<string, string>;
        setCity(details.city || "");
        setOccupation(details.occupation || "");
      } catch (error) {
        console.warn("[event] Unable to prefill profile", error);
      }
    };
    prefill();
  }, [token]);

  const joinInfo = useMemo(
    () => getJoinWindow(event?.schedule?.start),
    [event?.schedule?.start]
  );

  const isMasterclass = event?.eventType
    ? event.eventType.toLowerCase().includes("masterclass")
    : false;
  const joinUrl =
    event?.registration?.joinUrl ||
    event?.registration?.url ||
    event?.registration?.formUrl;

  const handleJoin = async () => {
    if (!joinUrl) {
      Alert.alert("Join link unavailable", "We will update it shortly.");
      return;
    }
    const target = joinUrl.startsWith("http") ? joinUrl : `https://${joinUrl}`;
    if (isMasterclass && !user) {
      router.push({
        pathname: "/auth/phone",
        params: { returnTo: `/event/${encodeURIComponent(slug)}` },
      });
      return;
    }
    const supported = await Linking.canOpenURL(target);
    if (!supported) {
      Alert.alert("Unable to open session link.");
      return;
    }
    Linking.openURL(target);
  };

  const canRegister =
    firstName.trim().length >= 2 &&
    email.trim().length >= 4 &&
    (phone.trim().length >= 8 || email.trim().includes("@"));

  const handleRegister = async () => {
    if (!event) return;
    if (!canRegister) {
      Alert.alert(
        "Add details",
        "Enter your name and a valid email or phone number."
      );
      return;
    }
    try {
      setRegistering(true);
      await registerForEvent({
        eventSlug: event.slug,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim(),
        occupation: occupation.trim(),
      });
      setRegistered(true);
      Alert.alert("Registration confirmed", "We will contact you with updates.");
    } catch (error: any) {
      Alert.alert("Registration failed", error?.message || "Try again.");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <GlassBackground>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </GlassBackground>
    );
  }

  if (!event) {
    return (
      <GlassBackground>
        <View style={styles.loading}>
          <Text style={styles.empty}>Event not found.</Text>
        </View>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
      <GlassHeader title="Event Details" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 70 },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <Image
            source={
              event.heroImage?.url
                ? { uri: event.heroImage.url }
                : require("@/assets/images/icon.png")
            }
            style={styles.hero}
            resizeMode="cover"
          />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{event.eventType || "Event"}</Text>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>{event.name}</Text>
          <Text style={styles.meta}>{formatSchedule(event.schedule?.start)}</Text>
          {event.location?.address ? (
            <Text style={styles.meta}>{event.location.address}</Text>
          ) : null}
          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}
        </View>

        {event.speakers?.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Speakers</Text>
            {event.speakers.map((speaker, index) => (
              <Text key={`speaker-${index}`} style={styles.speaker}>
                {speaker.name}
                {speaker.title ? ` · ${speaker.title}` : ""}
              </Text>
            ))}
          </View>
        ) : null}

        {joinUrl ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {isMasterclass ? "Masterclass access" : "Event access"}
            </Text>
            <Text style={styles.sectionHint}>
              Join the session when the window opens.
            </Text>
            <Pressable
              style={[styles.secondaryButton, !joinInfo.canJoin && styles.buttonDisabled]}
              onPress={handleJoin}
              disabled={!joinInfo.canJoin}
            >
              <Text style={styles.secondaryText}>{joinInfo.label}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Register</Text>
          <Text style={styles.sectionHint}>
            Reserve your seat and get reminders before we go live.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="First name"
            value={firstName}
            onChangeText={setFirstName}
            placeholderTextColor={colors.muted}
          />
          <TextInput
            style={styles.input}
            placeholder="Last name"
            value={lastName}
            onChangeText={setLastName}
            placeholderTextColor={colors.muted}
          />
          <TextInput
            style={styles.input}
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.muted}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={colors.muted}
          />
          <TextInput
            style={styles.input}
            placeholder="City"
            value={city}
            onChangeText={setCity}
            placeholderTextColor={colors.muted}
          />
          <TextInput
            style={styles.input}
            placeholder="Occupation"
            value={occupation}
            onChangeText={setOccupation}
            placeholderTextColor={colors.muted}
          />
          <Pressable
            style={[
              styles.primaryButton,
              (registering || registered || !canRegister) && styles.buttonDisabled,
            ]}
            onPress={handleRegister}
            disabled={registering || registered || !canRegister}
          >
            <Text style={styles.primaryText}>
              {registered ? "Registered" : registering ? "Submitting..." : "Register now"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  empty: {
    color: colors.muted,
    fontFamily: fonts.body,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 130,
  },
  heroCard: {
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  hero: {
    width: "100%",
    height: 210,
    backgroundColor: colors.border,
  },
  badge: {
    position: "absolute",
    top: 14,
    left: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    fontFamily: fonts.bodySemi,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.heading,
  },
  meta: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  description: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.heading,
    fontFamily: fonts.headingSemi,
  },
  sectionHint: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: fonts.body,
  },
  speaker: {
    fontSize: 13,
    color: colors.text,
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
  primaryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    fontFamily: fonts.bodySemi,
  },
  secondaryButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassHighlight,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
    fontFamily: fonts.bodySemi,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
