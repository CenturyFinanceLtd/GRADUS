import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StatusBar,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as ScreenOrientation from "expo-screen-orientation";

interface CustomVideoPlayerProps {
  source: string | { uri: string };
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  initialPosition?: number;
  onClose?: () => void;
  onProgress?: (status: any) => void;
  style?: any;
}

const formatTime = (seconds: number) => {
  if (!seconds || seconds < 0) return "00:00";
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remSeconds = totalSeconds % 60;
  return `${minutes < 10 ? "0" : ""}${minutes}:${
    remSeconds < 10 ? "0" : ""
  }${remSeconds}`;
};

export default function CustomVideoPlayerNew({
  source,
  poster,
  title,
  autoPlay = false,
  initialPosition = 0,
  onClose,
  onProgress,
  style,
}: CustomVideoPlayerProps) {
  // Resolve URI string
  const videoSource = typeof source === "string" ? source : source?.uri;

  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
    player.timeUpdateEventInterval = 0.5; // Update every 500ms for smoother slider
    if (autoPlay) {
      player.play();
    }
    if (initialPosition > 0) {
      // seekTo is usually available or setting currentTime
      player.currentTime = initialPosition / 1000;
    }
  });

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(initialPosition / 1000);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const controlsTimeout = useRef<any>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<
    "speed" | "quality"
  >("speed");
  const [currentQuality, setCurrentQuality] = useState("Auto");

  useEffect(() => {
    const subscription = player.addListener("playingChange", (event) => {
      setIsPlaying(event.isPlaying);
    });
    const timeSubscription = player.addListener("timeUpdate", (event) => {
      // event.currentTime is in seconds
      if (!isSeeking) {
        setCurrentTime(event.currentTime);
      }
      setDuration(player.duration); // duration is in seconds

      // Mocking expo-av status for backward compatibility if needed
      if (onProgress) {
        onProgress({
          isLoaded: true,
          positionMillis: event.currentTime * 1000,
          durationMillis: player.duration * 1000,
          isPlaying: player.playing,
          didJustFinish: false,
        });
      }
    });

    return () => {
      subscription.remove();
      timeSubscription.remove();
    };
  }, [player, isSeeking, onProgress]);

  // Controls Visibility Logic
  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, [showControls, isPlaying]);

  const resetControlsTimeout = () => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    if (isPlaying && showControls) {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const handlePressScreen = () => {
    setShowControls(!showControls);
    resetControlsTimeout();
  };

  const togglePlay = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
      if (Math.abs(player.currentTime - player.duration) < 0.5) {
        player.currentTime = 0; // Replay if at end (approx)
        player.play();
      }
    }
    resetControlsTimeout();
  };

  const skip = (amount: number) => {
    const newTime = player.currentTime + amount;
    player.currentTime = Math.max(0, Math.min(newTime, player.duration));
    resetControlsTimeout();
  };

  const handleSliderChange = (value: number) => {
    setCurrentTime(value * duration);
    if (!isSeeking) {
      setIsSeeking(true);
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    }
  };

  const handleSeek = (value: number) => {
    const newTime = value * duration;
    player.currentTime = newTime;
    setIsSeeking(false);
    resetControlsTimeout();
  };

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
      setIsFullscreen(false);
    } else {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
      setIsFullscreen(true);
    }
  };

  const changeSpeed = (speed: number) => {
    player.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettings(false);
  };

  // Note: Quality switching is tricky with simple URL source.
  // We'll reimplement the basic one if source is cloudinary,
  // but useVideoPlayer usually expects a stable source.
  // Replacing source might reset player.
  // For now, omitting detailed quality switch internal implementation or we trigger a new source load.
  // Assuming simpler implementation for now.

  const renderPlayerContent = (isModal: boolean) => (
    <View style={isModal ? styles.fullscreenVideoWrapper : styles.videoWrapper}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
      />

      {/* Touch Shim: Catches taps to toggle controls when interactions land on empty space or when controls are hidden */}
      <TouchableWithoutFeedback onPress={handlePressScreen}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      {/* Controls Overlay */}
      {showControls && (
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topBar}>
            {onClose && (
              <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <Text style={styles.videoTitle} numberOfLines={1}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={styles.iconBtn}
            >
              <Ionicons name="settings-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.centerControls}>
            <TouchableOpacity onPress={() => skip(-10)} style={styles.skipBtn}>
              <Ionicons name="play-back" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlay} style={styles.playBtnLarge}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={40}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => skip(10)} style={styles.skipBtn}>
              <Ionicons name="play-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomBar}>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>

              <Slider
                style={{ flex: 1, height: 40 }}
                minimumValue={0}
                maximumValue={1}
                value={duration > 0 ? currentTime / duration : 0}
                minimumTrackTintColor="#2968ff"
                maximumTrackTintColor="rgba(255,255,255,0.2)"
                thumbTintColor="#2968ff"
                onValueChange={handleSliderChange}
                onSlidingComplete={handleSeek}
              />

              <TouchableOpacity
                onPress={toggleFullscreen}
                style={styles.iconBtn}
              >
                <Ionicons
                  name={isFullscreen ? "contract" : "scan"}
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Settings Overlay */}
      {showSettings && (
        <TouchableWithoutFeedback onPress={() => setShowSettings(false)}>
          <View style={styles.settingsOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.settingsContent}>
                {/* Tabs */}
                <View style={styles.settingsTabs}>
                  <TouchableOpacity
                    style={[
                      styles.settingsTab,
                      activeSettingsTab === "speed" && styles.settingsTabActive,
                    ]}
                    onPress={() => setActiveSettingsTab("speed")}
                  >
                    <Text
                      style={[
                        styles.settingsTabText,
                        activeSettingsTab === "speed" &&
                          styles.settingsTabTextActive,
                      ]}
                    >
                      Speed
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.settingsTab,
                      activeSettingsTab === "quality" &&
                        styles.settingsTabActive,
                    ]}
                    onPress={() => setActiveSettingsTab("quality")}
                  >
                    <Text
                      style={[
                        styles.settingsTabText,
                        activeSettingsTab === "quality" &&
                          styles.settingsTabTextActive,
                      ]}
                    >
                      Quality
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView
                  style={styles.settingsScroll}
                  contentContainerStyle={{ paddingBottom: 16 }}
                >
                  {activeSettingsTab === "speed" ? (
                    <>
                      <Text style={styles.settingsLabel}>Playback Speed</Text>
                      {[0.5, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                        <TouchableOpacity
                          key={speed}
                          style={[
                            styles.settingOption,
                            playbackSpeed === speed &&
                              styles.settingOptionActive,
                          ]}
                          onPress={() => changeSpeed(speed)}
                        >
                          <Text
                            style={[
                              styles.settingText,
                              playbackSpeed === speed &&
                                styles.settingTextActive,
                            ]}
                          >
                            {speed}x
                          </Text>
                          {playbackSpeed === speed && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </>
                  ) : (
                    <>
                      <Text style={styles.settingsLabel}>Video Quality</Text>
                      {/* Mock Quality Options for now since we use direct MP4/URL */}
                      {["Auto", "1080p", "720p", "480p"].map((q) => (
                        <TouchableOpacity
                          key={q}
                          style={[
                            styles.settingOption,
                            currentQuality === q && styles.settingOptionActive,
                          ]}
                          onPress={() => setCurrentQuality(q)}
                        >
                          <Text
                            style={[
                              styles.settingText,
                              currentQuality === q && styles.settingTextActive,
                            ]}
                          >
                            {q}
                          </Text>
                          {currentQuality === q && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </TouchableOpacity>
                      ))}
                      <Text style={styles.helperText}>
                        (Quality selection is simulated for this stream)
                      </Text>
                    </>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <StatusBar hidden={isFullscreen} />
      {isFullscreen ? (
        <Modal
          visible={true}
          transparent={false}
          animationType="fade"
          onRequestClose={toggleFullscreen}
        >
          <View style={styles.fullscreenContainer}>
            {renderPlayerContent(true)}
          </View>
        </Modal>
      ) : (
        renderPlayerContent(false)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  fullscreenVideoWrapper: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "black",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 24,
    justifyContent: "space-between",
    zIndex: 2,
  },
  videoTitle: {
    color: "#fff",
    flex: 1,
    marginHorizontal: 12,
    fontSize: 15,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: "transparent",
    zIndex: 2,
  },
  centerControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 48,
    zIndex: 1,
  },
  playBtnLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  skipBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  timeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
    width: 85,
    textAlign: "center",
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  settingsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  settingsContent: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    width: 280,
    maxHeight: "80%", // Constraint height to avoid clipping
    overflow: "hidden",
    padding: 0, // Reset padding
  },
  settingsScroll: {
    paddingHorizontal: 20,
    maxHeight: 300,
  },
  settingsTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    marginBottom: 0,
  },
  settingsTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  settingsTabActive: {
    backgroundColor: "transparent",
    borderBottomWidth: 2,
    borderBottomColor: "#2968ff",
  },
  settingsTabText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
  settingsTabTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  settingsLabel: {
    color: "#666",
    fontSize: 12,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 8,
    fontWeight: "700",
  },
  helperText: {
    color: "#555",
    fontSize: 11,
    marginTop: 8,
    fontStyle: "italic",
  },
  settingOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  settingOptionActive: {
    backgroundColor: "rgba(41, 104, 255, 0.1)",
  },
  settingText: {
    color: "#ccc",
    fontSize: 14,
  },
  settingTextActive: {
    color: "#2968ff",
    fontWeight: "600",
  },
});
