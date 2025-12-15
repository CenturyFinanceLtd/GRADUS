import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { RTCView } from "react-native-webrtc";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLiveStudentSession } from "@/hooks/useLiveStudentSession";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getFirstName, getAuthSession } from "@/utils/auth-storage";
// import { Audio } from "expo-av";
import * as ScreenOrientation from "expo-screen-orientation";

export default function LiveClassScreen() {
  const { id } = useLocalSearchParams();
  const sessionId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();

  // Handle Orientation & Audio
  useEffect(() => {
    // 1. Audio: Force Speaker using expo-audio
    (async () => {
      try {
        // In newer Expo SDKs (52+), AudioModule handles routing
        /*
        // For now, removing explicit expo-av setAudioModeAsync as webrtc handles it mostly.
        // If we need explicit routing, we'd use:
        // import { AudioModule } from 'expo-audio';
        // await AudioModule.setAudioModeAsync({ ... });
        */
        // However, since we are moving to expo-video/audio, let's just ensure we don't crash.
        // Use standard InCallManager or similar if webrtc requires it,
        // but typically removing the expo-av force might be safer effectively if expo-audio doesn't have 1:1 parity yet.
        // Let's comment this out for now and rely on default behavior which usually defaults to speaker for video calls.
      } catch (e) {
        console.warn("Audio mode error", e);
      }
    })();

    // 2. Orientation: Unlock to allow landscape
    const unlockOrientation = async () => {
      await ScreenOrientation.unlockAsync();
    };
    unlockOrientation();

    // 3. Cleanup: Lock back to Portrait when leaving
    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    };
  }, []);

  const {
    session,
    stageStatus,
    stageError,
    instructorStream,
    joinClass,
    leaveSession,
    loading,
    toggleMic,
    toggleCamera,
    isMicOn,
    isCameraOn,
  } = useLiveStudentSession(sessionId);

  // Auto-join if possible or just show join button
  // For simplicity, we'll ask user to tap "Join Live Now"

  useEffect(() => {
    if (stageError) {
      Alert.alert("Live Class Error", stageError);
    }
  }, [stageError]);

  // Auto-join when session is loaded
  useEffect(() => {
    if (!loading && stageStatus === "idle" && session) {
      handleJoin();
    }
  }, [loading, stageStatus, session]);

  const handleJoin = async () => {
    // Pass stored display name if available, or just generic
    const storedName = await getFirstName();
    const { user } = await getAuthSession();
    const displayName =
      storedName || user?.name || user?.firstName || "Student";

    joinClass({ displayName });
  };

  const handleLeave = () => {
    leaveSession();
    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header Overlay */}
      <View style={styles.headerContainer}>
        <SafeAreaView edges={["top"]} style={styles.safeHeader}>
          <Text style={styles.headerTitle}>
            {session?.title || "Live Class"}
          </Text>
        </SafeAreaView>
      </View>

      <View style={styles.content}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.text}>Loading Session...</Text>
          </View>
        )}

        {!loading && stageStatus === "idle" && (
          <View style={styles.center}>
            <Text style={styles.title}>{session?.title}</Text>
            <Text style={styles.subtitle}>Ready to join?</Text>
            <TouchableOpacity style={styles.joinBtn} onPress={handleJoin}>
              <Text style={styles.joinBtnText}>Join Live Class</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading &&
          (stageStatus === "joining" || stageStatus === "connecting") && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.text}>Connecting to classroom...</Text>
            </View>
          )}

        {!loading && stageStatus === "live" && (
          <View style={styles.videoContainer}>
            {instructorStream ? (
              <View style={{ flex: 1 }}>
                <RTCView
                  streamURL={instructorStream.toURL()}
                  style={styles.video}
                  objectFit="contain"
                  mirror={false}
                  zOrder={1}
                />
              </View>
            ) : (
              <View style={styles.center}>
                <Text style={styles.text}>Waiting for instructor video...</Text>
              </View>
            )}

            {/* Controls */}
            <View style={styles.controlsBar}>
              <TouchableOpacity
                onPress={toggleMic}
                style={[styles.controlBtn, !isMicOn && styles.controlBtnOff]}
              >
                <Ionicons
                  name={isMicOn ? "mic" : "mic-off"}
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={toggleCamera}
                style={[styles.controlBtn, !isCameraOn && styles.controlBtnOff]}
              >
                <Ionicons
                  name={isCameraOn ? "videocam" : "videocam-off"}
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLeave}
                style={[styles.controlBtn, styles.leaveBtn]}
              >
                <Ionicons name="call" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!loading && stageStatus === "ended" && (
          <View style={styles.center}>
            <Text style={styles.title}>Class Ended</Text>
            <TouchableOpacity style={styles.joinBtn} onPress={handleLeave}>
              <Text style={styles.joinBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  safeHeader: {
    backgroundColor: "rgba(0,0,0,0.6)",
    width: "100%",
    alignItems: "center",
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  text: {
    color: "#ccc",
    marginTop: 10,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#aaa",
    fontSize: 16,
    marginBottom: 30,
  },
  joinBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  joinBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  videoContainer: {
    width: "100%",
    height: "100%",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  controlsBar: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    zIndex: 20,
  },
  controlBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnOff: {
    backgroundColor: "#ef4444",
  },
  leaveBtn: {
    backgroundColor: "#dc2626",
  },
  debugOverlay: {
    position: "absolute",
    top: 100,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 5,
  },
  debugText: {
    color: "#0f0",
    fontSize: 10,
  },
});
