import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  FlatList,
  Alert,
  Linking,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import Ionicons from "@expo/vector-icons/Ionicons";
import { API_BASE_URL } from "@/constants/config";
import { getAuthSession } from "@/utils/auth-storage";
import CustomVideoPlayer from "@/components/CustomVideoPlayer";
import AssessmentPlayer from "@/components/AssessmentPlayer";

// Video playback is now handled by expo-video in CustomVideoPlayer
// No need to load expo-av manually

const { width } = Dimensions.get("window");

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  // Only enable if not using New Architecture (Fabric) to avoid "no-op" warning
  const isFabric = (global as any)?.nativeFabricUIManager != null;
  if (!isFabric) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function ClassroomScreen() {
  const router = useRouter();
  const { courseSlug: slugParam } = useLocalSearchParams();
  const courseSlug = Array.isArray(slugParam) ? slugParam[0] : slugParam;
  const videoRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "modules" | "resources" | "notes" | "assessments"
  >("modules");
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [expandedWeekIndex, setExpandedWeekIndex] = useState<number | null>(0);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [isModuleSelectorOpen, setIsModuleSelectorOpen] = useState(false);
  const [progress, setProgress] = useState<Record<string, any>>({});
  const [assessments, setAssessments] = useState<any[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const [activeAttempt, setActiveAttempt] = useState<any>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [weekAssessments, setWeekAssessments] = useState<Record<string, any>>(
    {}
  );

  // Hold the initial start position for the currently playing video to prevent re-seeking on progress updates
  const startPositionRef = useRef<number>(0);

  const [liveSessionState, setLiveSessionState] = useState<{
    checking: boolean;
    session: any;
    error: any;
  }>({ checking: false, session: null, error: null });

  // Poll for live session
  useEffect(() => {
    let isMounted = true;
    const poll = async () => {
      try {
        const { token } = await getAuthSession();
        if (!token) return;

        // Try course slug first, then ID if available (though slug is primary here)
        const keys = [courseSlug, course?._id, course?.id].filter(Boolean);

        for (const key of keys) {
          try {
            const res = await fetch(
              `${API_BASE_URL}/api/live/sessions/course/${key}/active`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            if (res.ok) {
              const data = await res.json();
              if (data.session && isMounted) {
                setLiveSessionState({
                  checking: false,
                  session: data.session,
                  error: null,
                });
                return;
              }
            }
          } catch (e) {
            // continue to next key
          }
        }
        if (isMounted) {
          setLiveSessionState({ checking: false, session: null, error: null });
        }
      } catch (e) {
        console.warn("Poll error", e);
      }
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [courseSlug, course]);

  const handleJoinLive = () => {
    if (liveSessionState.session?.id) {
      router.push(`/live/${liveSessionState.session.id}`);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const loadCourse = async () => {
    try {
      const { token } = await getAuthSession();
      // if (!token) {
      //   console.log("ClassroomScreen: No token found");
      //   router.replace("/auth/signin");
      //   return;
      // }

      const url = `${API_BASE_URL}/api/courses/${courseSlug}`;
      console.log("ClassroomScreen: Fetching", url);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("ClassroomScreen: Response status", res.status);

      if (res.ok) {
        const data = await res.json();
        const courseObj = data.course || data;

        // Fetch User Progress
        try {
          let progressUrl = `${API_BASE_URL}/api/courses/${courseSlug}/progress`;
          if (courseObj.programmeSlug && courseObj.courseSlug) {
            progressUrl = `${API_BASE_URL}/api/courses/${courseObj.programmeSlug}/${courseObj.courseSlug}/progress`;
          }
          console.log("ClassroomScreen: Fetching progress", progressUrl);
          const progressRes = await fetch(progressUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (progressRes.ok) {
            const progressData = await progressRes.json();
            setProgress(progressData.progress || {});
          }
        } catch (progErr) {
          console.error("ClassroomScreen: Error fetching progress", progErr);
        }

        // Fetch detailed module structure (Lectures/Sections)
        if (courseObj.programmeSlug && courseObj.courseSlug) {
          try {
            const detailUrl = `${API_BASE_URL}/api/courses/${courseObj.programmeSlug}/${courseObj.courseSlug}/modules/detail`;
            console.log("ClassroomScreen: Fetching details", detailUrl);
            const detailRes = await fetch(detailUrl, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (detailRes.ok) {
              const detailData = await detailRes.json();
              if (detailData.modules && Array.isArray(detailData.modules)) {
                // Merge details into course modules
                courseObj.modules = courseObj.modules.map(
                  (mod: any, index: number) => {
                    const detailedMod = detailData.modules[index];
                    if (detailedMod) {
                      return {
                        ...mod,
                        // Map sections -> weeklyStructure
                        weeklyStructure:
                          detailedMod.sections?.map((sec: any) => ({
                            title: sec.title || `Week ${index + 1} Content`,
                            lectures: sec.lectures?.map((lec: any) => {
                              // Resolve duration: Check string 'duration', then 'video.duration' (secs), then 'durationSeconds'
                              let resolvedDuration = lec.duration;
                              if (!resolvedDuration && lec.video?.duration) {
                                resolvedDuration = formatDuration(
                                  lec.video.duration
                                );
                              } else if (
                                !resolvedDuration &&
                                lec.durationSeconds
                              ) {
                                resolvedDuration = formatDuration(
                                  lec.durationSeconds
                                );
                              }

                              return {
                                ...lec,
                                title: lec.title || lec.lectureTitle,
                                duration: resolvedDuration, // Actual fetched duration
                              };
                            }),
                          })) || [],
                      };
                    }
                    return mod;
                  }
                );
              }
            } else {
              console.warn(
                "ClassroomScreen: Failed to fetch details",
                detailRes.status
              );
            }
          } catch (detailErr) {
            console.error("ClassroomScreen: Error fetching details", detailErr);
          }
        }

        setCourse(courseObj);
      } else {
        console.error("Failed to load course", await res.text());
      }
    } catch (error) {
      console.error("Error loading course:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourse();
  }, [courseSlug]);

  useEffect(() => {
    if (activeTab === "assessments" && course) {
      loadAssessments();
    }
  }, [activeTab, courseSlug]);

  const loadAssessments = async () => {
    try {
      setAssessmentsLoading(true);
      const token = (await getAuthSession()).token;
      // Try generic endpoint first
      let url = `${API_BASE_URL}/api/courses/${
        course?.slug || courseSlug
      }/assessments`;
      if (course?.programmeSlug) {
        url = `${API_BASE_URL}/api/courses/${course.programmeSlug}/${course.courseSlug}/assessments`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.items) {
        setAssessments(data.items);
      }
    } catch (e) {
      console.warn("Failed to load assessments", e);
    } finally {
      setAssessmentsLoading(false);
    }
  };

  const handleStartAssessment = async (item: any) => {
    try {
      const token = (await getAuthSession()).token;
      let url = `${API_BASE_URL}/api/courses/${
        course?.slug || courseSlug
      }/assessments/attempts`;
      if (course?.programmeSlug) {
        url = `${API_BASE_URL}/api/courses/${course.programmeSlug}/${course.courseSlug}/assessments/attempts`;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          moduleIndex: item.moduleIndex,
          weekIndex: item.weekIndex,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to start");

      setActiveAttempt(data.attempt);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleSubmitAssessment = async (answers: any) => {
    try {
      setSubmitLoading(true);
      const { token } = await getAuthSession();
      const res = await fetch(
        `${API_BASE_URL}/api/courses/${courseSlug}/assessments/attempts/${activeAttempt.id}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ answers }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setActiveAttempt(data.attempt);
        Alert.alert(
          "Assessment Submitted!",
          `You scored ${data.attempt.score} out of ${data.attempt.totalQuestions}`
        );
      }
    } catch (error) {
      console.error("Submit error:", error);
      Alert.alert("Error", "Failed to submit assessment");
    } finally {
      setSubmitLoading(false);
    }
  };

  const checkWeekCompletion = (weekLectures: any[]) => {
    if (!weekLectures || weekLectures.length === 0) return false;
    return weekLectures.every((lecture: any) => {
      const prog = progress[lecture.lectureId];
      return (
        Boolean(prog?.completedAt) ||
        prog?.isCompleted ||
        (prog?.completionRatio || 0) >= 0.9
      );
    });
  };

  const handleStartWeekAssessment = async (
    moduleIndex: number,
    weekIndex: number,
    forceNew: boolean = false
  ) => {
    try {
      const { token } = await getAuthSession();
      if (!token) {
        Alert.alert("Sign In Required", "Please sign in to take assessments");
        return;
      }

      const res = await fetch(
        `${API_BASE_URL}/api/courses/${courseSlug}/assessments/attempts`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            moduleIndex: moduleIndex + 1,
            weekIndex: weekIndex + 1,
            createNew: forceNew,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setActiveAttempt(data.attempt);
      } else {
        const error = await res.json();
        Alert.alert(
          "Error",
          error.error || error.message || "Failed to start assessment"
        );
      }
    } catch (error) {
      console.error("Start assessment error:", error);
      Alert.alert("Error", "Failed to start assessment");
    }
  };

  useEffect(() => {
    if (playingVideo && course) {
      // Find the lecture to get stored progress
      const lecture = course.modules
        ?.flatMap((m: any) => m.weeklyStructure || [])
        .flatMap((w: any) => w.lectures || [])
        .find((l: any) => l.video?.url === playingVideo);

      if (lecture && progress[lecture.lectureId]?.watchedDuration) {
        startPositionRef.current =
          progress[lecture.lectureId].watchedDuration * 1000;
        console.log("Setting start position:", startPositionRef.current);
      } else {
        startPositionRef.current = 0;
      }
    }
  }, [playingVideo]);

  const updateProgress = async (lectureId: string, status: any) => {
    if (!status.isLoaded || !lectureId) return;

    // Only update every 5 seconds or if finished
    const currentTime = Date.now();
    // Use a ref to throttle updates? For now just rely on onPlaybackStatusUpdate frequency
    // Actually, onPlaybackStatusUpdate fires rapidly. We should throttle this.

    // Simplification: We will just update local state here and let a separate effect sync or just debounce.
    // For MVP robustness: Let's direct call API but throttle it.

    // Better: Update local state immediately, sync to API if significant change
    const duration = status.durationMillis / 1000;
    const position = status.positionMillis / 1000;
    const ratio = duration > 0 ? position / duration : 0;

    // Check if we already have a recent update for this lecture to avoid spamming API
    const lastUpdate = progress[lectureId]?._lastUpdate || 0;
    if (currentTime - lastUpdate < 10000 && !status.didJustFinish) return; // 10s throttle

    const isCompleted = ratio >= 0.9;

    // Optimistic Update
    setProgress((prev) => ({
      ...prev,
      [lectureId]: {
        ...prev[lectureId],
        watchedDuration: position,
        completionRatio: ratio,
        isCompleted: isCompleted || prev[lectureId]?.isCompleted,
        _lastUpdate: currentTime,
      },
    }));

    try {
      const token = (await getAuthSession()).token;
      // Correct Backend Endpoint: POST /api/courses/{progSlug}/{courseSlug}/progress
      let url = `${API_BASE_URL}/api/courses/${course.courseSlug}/progress`;
      if (course.programmeSlug) {
        url = `${API_BASE_URL}/api/courses/${course.programmeSlug}/${course.courseSlug}/progress`;
      }

      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lectureId: lectureId,
          currentTime: position,
          duration: duration,
          videoUrl: currentLecture?.video?.url || "",
          lectureTitle: currentLecture?.title || "",
        }),
      });
      console.log("Progress saved:", lectureId, position);
    } catch (e) {
      console.warn("Failed to save progress", e);
    }
  };

  const handleDownloadNotes = async (
    lecture?: any,
    mIndex?: number,
    wIndex?: number,
    lIndex?: number
  ) => {
    const targetLecture = lecture || currentLecture;
    if (!targetLecture?.notes?.hasFile) {
      Alert.alert("No Notes", "No notes available for this lecture.");
      return;
    }
    try {
      const { token } = await getAuthSession();
      let url = `${API_BASE_URL}/api/courses/${course.courseSlug}/lectures/${targetLecture.lectureId}/notes?token=${token}`;
      if (course.programmeSlug) {
        url = `${API_BASE_URL}/api/courses/${course.programmeSlug}/${course.courseSlug}/lectures/${targetLecture.lectureId}/notes?token=${token}`;
      }

      // Use full course name
      const courseNameStart = course.name || "Course";

      const fileName = (
        targetLecture.notes.fileName || "Lecture Notes"
      ).replace(/\.pdf$/i, "");

      const lecturePart =
        lIndex !== undefined ? `(Lecture ${lIndex + 1}) ` : "";
      const weekPart = wIndex !== undefined ? `Week ${wIndex + 1}` : "";
      const modulePart = mIndex !== undefined ? ` | Module ${mIndex + 1}` : "";
      const coursePart = ` | ${courseNameStart}`;

      const formattedTitle = `${fileName} | ${lecturePart}${weekPart}${modulePart}${coursePart}`;

      // Navigate to dedicated PDF viewer screen
      router.push({
        pathname: "/pdf-viewer",
        params: {
          url: url,
          title: formattedTitle,
        },
      });
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to open notes");
    }
  };

  const toggleWeek = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedWeekIndex(expandedWeekIndex === index ? null : index);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2968ff" />
        </View>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text>Course not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentModule = course.modules?.[selectedModuleIndex];

  // Find currently playing lecture
  const currentLecture = course.modules
    ?.flatMap((m: any) => m.weeklyStructure || [])
    .flatMap((w: any) => w.lectures || [])
    .find((l: any) => l.video?.url === playingVideo);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {course.name}
        </Text>
      </View>

      {/* Custom Video Player */}
      <View style={styles.videoContainer}>
        {playingVideo ? (
          <CustomVideoPlayer
            source={{ uri: playingVideo }}
            style={styles.video}
            title={currentLecture?.title || "Lecture Video"}
            onClose={() => setPlayingVideo(null)}
            poster={course.image?.url || course.imageUrl}
            autoPlay={true}
            initialPosition={startPositionRef.current}
            onProgress={(status) => {
              if (currentLecture?.lectureId) {
                updateProgress(currentLecture.lectureId, status);
              }
            }}
          />
        ) : (
          <Image
            source={{ uri: course.image?.url || course.imageUrl }}
            style={styles.videoPlaceholder}
            resizeMode="cover"
          />
        )}

        {!playingVideo && (
          <View style={styles.playOverlay}>
            {liveSessionState.session?.isLive &&
            liveSessionState.session?.isJoinable ? (
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: "600",
                    marginBottom: 12,
                  }}
                >
                  Live Class is Active!
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#ef4444",
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 24,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  onPress={handleJoinLive}
                >
                  <Ionicons
                    name="videocam"
                    size={20}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Join Live Class
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Ionicons
                  name="play-circle"
                  size={64}
                  color="rgba(255,255,255,0.8)"
                />
                <Text style={{ color: "white", marginTop: 8 }}>
                  Select a lecture to start
                </Text>
              </>
            )}
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {["Modules", "Resources", "Notes", "Assessments"].map((tab) => {
          const key = tab.toLowerCase() as any;
          const isActive = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tabItem, isActive && styles.activeTabItem]}
              onPress={() => setActiveTab(key)}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {activeTab === "modules" && (
          <View style={styles.modulesContainer}>
            <View style={{ marginBottom: 0, zIndex: 1000 }}>
              <TouchableOpacity
                style={[
                  styles.moduleSelector,
                  isModuleSelectorOpen && styles.moduleSelectorActive,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  setIsModuleSelectorOpen(!isModuleSelectorOpen);
                }}
              >
                <Text style={styles.moduleSelectorText}>
                  Module {selectedModuleIndex + 1}
                </Text>
                <Ionicons
                  name={isModuleSelectorOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#555"
                />
              </TouchableOpacity>

              {/* Dropdown List */}
              {isModuleSelectorOpen && (
                <GHScrollView
                  style={styles.dropdownList}
                  nestedScrollEnabled={true}
                  persistentScrollbar={true}
                  showsVerticalScrollIndicator={true}
                >
                  {course.modules?.map((mod: any, index: number) => {
                    const isSelected = selectedModuleIndex === index;
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.dropdownItem,
                          isSelected && styles.dropdownItemActive,
                        ]}
                        onPress={() => {
                          setSelectedModuleIndex(index);
                          setIsModuleSelectorOpen(false);
                        }}
                      >
                        <View style={styles.dropdownBadge}>
                          <Text
                            style={[
                              styles.dropdownBadgeText,
                              isSelected && styles.dropdownBadgeTextActive,
                            ]}
                          >
                            {index + 1}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.dropdownItemTitle,
                              isSelected && styles.dropdownItemTitleActive,
                            ]}
                            numberOfLines={2}
                          >
                            {mod.title || `Module ${index + 1}`}
                          </Text>
                          <Text style={styles.dropdownItemSubtitle}>
                            {mod.weeksLabel ||
                              mod.weeksRange ||
                              `Week ${index + 1}`}
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color="#2968ff"
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </GHScrollView>
              )}

              {/* Selected Module Title Display (Below Dropdown) */}
              {!isModuleSelectorOpen && (
                <View style={styles.selectedModuleInfo}>
                  <Text style={styles.selectedModuleTitle}>
                    {currentModule?.title}
                  </Text>
                  <Text style={styles.selectedModuleSubtitle}>
                    {currentModule?.weeksLabel ||
                      currentModule?.weeksRange ||
                      `${currentModule?.weeklyStructure?.length || 0} Weeks`}
                  </Text>
                </View>
              )}
            </View>

            {/* Topics Covered Section */}
            {currentModule?.topics && currentModule.topics.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#000",
                    marginBottom: 12,
                    marginLeft: 4,
                  }}
                >
                  Topics covered
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    marginHorizontal: -6,
                  }}
                >
                  {currentModule.topics.map((topic: string, index: number) => (
                    <View
                      key={index}
                      style={{
                        width: "50%",
                        padding: 6,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: "#fff",
                          borderWidth: 1,
                          borderColor: "#dbeafe",
                          borderRadius: 8,
                          padding: 12,
                          flexDirection: "row",
                          alignItems: "flex-start",
                        }}
                      >
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#2968ff"
                          style={{ marginRight: 8, marginTop: 2 }}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#333",
                            lineHeight: 18,
                            flex: 1,
                          }}
                        >
                          {topic}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Weekly Structure Header */}
            {currentModule?.weeklyStructure &&
              currentModule.weeklyStructure.length > 0 && (
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#000",
                    marginBottom: 12,
                    marginLeft: 4,
                  }}
                >
                  Weekly structure
                </Text>
              )}

            {/* Weeks List */}
            {currentModule?.weeklyStructure?.map((week: any, index: number) => {
              const isExpanded = expandedWeekIndex === index;
              return (
                <View key={index} style={styles.weekCard}>
                  <TouchableOpacity
                    style={styles.weekHeader}
                    onPress={() => toggleWeek(index)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.weekLabel}>Week {index + 1}</Text>
                      <Text style={styles.weekTitle}>{week.title}</Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.lecturesList}>
                      {week.lectures?.length > 0 ? (
                        week.lectures.map((lecture: any, lIndex: number) => {
                          const prog = progress[lecture.lectureId];
                          const isCompleted =
                            Boolean(prog?.completedAt) ||
                            prog?.isCompleted ||
                            (prog?.completionRatio || 0) >= 0.9;
                          return (
                            <TouchableOpacity
                              key={lIndex}
                              style={styles.lectureItem}
                              onPress={() => {
                                if (lecture.video?.url) {
                                  console.log(
                                    "Playing video:",
                                    lecture.video.url
                                  );
                                  setPlayingVideo(lecture.video.url);
                                } else {
                                  console.warn(
                                    "No video URL for lecture:",
                                    lecture.title
                                  );
                                }
                              }}
                            >
                              <Ionicons
                                name={
                                  isCompleted ? "checkbox" : "square-outline"
                                }
                                size={22}
                                color={isCompleted ? "#2968ff" : "#ccc"}
                              />
                              <Ionicons
                                name="play-circle-outline"
                                size={20}
                                color="#2968ff"
                              />
                              <Text style={styles.lectureTitle}>
                                {lecture.title}
                              </Text>
                              {lecture.duration && (
                                <Text style={styles.lectureDuration}>
                                  {lecture.duration}
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })
                      ) : (
                        <View style={styles.emptyState}>
                          <Text style={styles.emptyText}>
                            Content coming soon
                          </Text>
                        </View>
                      )}

                      {/* Fallback for topics if no lectures structure */}
                      {(!week.lectures || week.lectures.length === 0) &&
                        currentModule.topics &&
                        currentModule.topics.map(
                          (topic: string, tIndex: number) => (
                            <View key={tIndex} style={styles.lectureItem}>
                              <Ionicons
                                name="document-text-outline"
                                size={20}
                                color="#666"
                              />
                              <Text style={styles.lectureTitle}>{topic}</Text>
                            </View>
                          )
                        )}

                      {/* Assessment Checkpoint Section */}
                      {week.lectures && week.lectures.length > 0 && (
                        <View style={styles.assessmentCheckpoint}>
                          <Text style={styles.checkpointTitle}>
                            Module {selectedModuleIndex + 1} Week {index + 1}{" "}
                            Assessment
                          </Text>
                          <Text style={styles.checkpointDescription}>
                            Test yourself on this week&apos;s concepts before
                            moving on.
                          </Text>
                          {checkWeekCompletion(week.lectures) ? (
                            <TouchableOpacity
                              style={styles.goToAssessmentBtn}
                              onPress={() =>
                                handleStartWeekAssessment(
                                  selectedModuleIndex,
                                  index
                                )
                              }
                            >
                              <Text style={styles.goToAssessmentBtnText}>
                                Go to Assessment
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.lockedAssessment}>
                              <Ionicons
                                name="lock-closed"
                                size={18}
                                color="#999"
                              />
                              <Text style={styles.lockedText}>
                                Complete all lectures to unlock
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Outcomes Section */}
            {(currentModule?.outcome ||
              (currentModule?.outcomes &&
                currentModule.outcomes.length > 0)) && (
              <View style={{ marginTop: 16, marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#000",
                    marginBottom: 12,
                    marginLeft: 4,
                  }}
                >
                  Outcomes
                </Text>

                {currentModule.outcome && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      marginBottom: 8,
                      paddingRight: 16,
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#2968ff"
                      style={{ marginTop: 2, marginRight: 8 }}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#444",
                        lineHeight: 18,
                        flex: 1,
                      }}
                    >
                      {currentModule.outcome}
                    </Text>
                  </View>
                )}

                {currentModule?.outcomes?.map(
                  (outcome: string, index: number) => (
                    <View
                      key={index}
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        marginBottom: 8,
                        paddingRight: 16,
                      }}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#2968ff"
                        style={{ marginTop: 2, marginRight: 8 }}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#444",
                          lineHeight: 18,
                          flex: 1,
                        }}
                      >
                        {outcome}
                      </Text>
                    </View>
                  )
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === "resources" && (
          <View style={styles.overviewContainer}>
            <Text style={styles.emptyText}>Resources coming soon</Text>
          </View>
        )}

        {activeTab === "notes" && (
          <View style={styles.overviewContainer}>
            <Text style={styles.sectionTitle}>Notes</Text>

            {/* List ALL available notes if no specific one needs focus, or just always list them all like the web? 
                User said "showing like this show like this" pointing to web which lists them.
                Let's list all notes. If user plays video, we can highlight? No request for that.
                Just list all notes. */}

            {course.modules
              ?.flatMap((m: any) => m.weeklyStructure || [])
              .flatMap((w: any) => w.lectures || [])
              .filter((l: any) => l.notes?.hasFile).length > 0 ? (
              course.modules.flatMap((m: any, mIndex: number) =>
                (m.weeklyStructure || []).flatMap((w: any, wIndex: number) =>
                  (w.lectures || [])
                    .filter((l: any) => l.notes?.hasFile)
                    .map((l: any, lIndex: number) => (
                      <View
                        key={`${mIndex}-${wIndex}-${lIndex}`}
                        style={styles.noteListItem}
                      >
                        <View style={{ flex: 1, marginRight: 12 }}>
                          {/* Breadcrumbs */}
                          <Text style={styles.noteBreadcrumb}>
                            {course.name?.toUpperCase()} | MODULE {mIndex + 1} |
                            WEEK {wIndex + 1} | LECTURE {lIndex + 1}
                          </Text>

                          <Text style={styles.noteListTitle}>
                            {l.notes.fileName || l.title || "Lecture Notes"}
                          </Text>

                          <Text style={styles.noteDate}>
                            Updated{" "}
                            {new Date().toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.viewNotesBtn}
                          onPress={() =>
                            handleDownloadNotes(l, mIndex, wIndex, lIndex)
                          }
                        >
                          <Text style={styles.viewNotesBtnText}>
                            View Notes
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))
                )
              )
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="document-text-outline"
                  size={48}
                  color="#ddd"
                  style={{ marginBottom: 12 }}
                />
                <Text style={styles.emptyText}>
                  No notes available for this course yet.
                </Text>
              </View>
            )}
          </View>
        )}
        {activeTab === "assessments" && (
          <ScrollView
            style={styles.content}
            contentContainerStyle={{ padding: 16 }}
          >
            <Text style={styles.sectionTitle}>Weekly Checkpoints</Text>
            <Text style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
              Complete all lectures in each week to unlock assessments
            </Text>

            {course?.modules?.map((module: any, moduleIndex: number) => (
              <View key={moduleIndex} style={{ marginBottom: 24 }}>
                <Text style={styles.moduleAssessmentTitle}>{module.title}</Text>

                {module.weeklyStructure?.map((week: any, weekIndex: number) => {
                  const isUnlocked = checkWeekCompletion(week.lectures || []);
                  const hasLectures = week.lectures && week.lectures.length > 0;

                  if (!hasLectures) return null;

                  return (
                    <View key={weekIndex} style={styles.weekAssessmentCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.weekAssessmentTitle}>
                          Module {moduleIndex + 1} Week {weekIndex + 1}
                        </Text>
                        <Text style={styles.weekAssessmentSubtitle}>
                          {week.title}
                        </Text>
                        <Text style={styles.weekAssessmentMeta}>
                          {week.lectures.length} lectures •{" "}
                          {isUnlocked ? "Unlocked" : "Locked"}
                        </Text>
                      </View>

                      {isUnlocked ? (
                        <TouchableOpacity
                          style={styles.startAssessmentBtn}
                          onPress={() =>
                            handleStartWeekAssessment(moduleIndex, weekIndex)
                          }
                        >
                          <Text style={styles.startAssessmentBtnText}>
                            Start
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.lockedBadge}>
                          <Ionicons name="lock-closed" size={16} color="#999" />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        )}

        {/* Assessment Player Modal */}
        <AssessmentPlayer
          visible={!!activeAttempt}
          attempt={activeAttempt}
          onClose={() => setActiveAttempt(null)}
          onSubmit={handleSubmitAssessment}
          loadingSubmit={submitLoading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  videoContainer: {
    width: "100%",
    height: 220,
    backgroundColor: "#000",
    position: "relative",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    opacity: 0.6,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    color: "#111",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  courseInfo: {
    padding: 16,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFB800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  ratingText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  learnerCount: {
    color: "#666",
    fontSize: 13,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabItem: {
    borderBottomColor: "#2968ff",
  },
  tabText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#2968ff",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  modulesContainer: {
    padding: 16,
    gap: 16,
  },
  moduleSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eef2ff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e7ff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  moduleSelectorActive: {
    backgroundColor: "#fff",
    borderColor: "#2968ff",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  moduleSelectorText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#444",
    flex: 1,
    marginRight: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    marginTop: 12,
  },
  assessmentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  assessmentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },
  assessmentMeta: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
  assessmentSummary: {
    fontSize: 13,
    color: "#444",
  },
  startBtn: {
    backgroundColor: "#2968ff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  startBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  dropdownList: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#2968ff",
    marginBottom: 0,
    maxHeight: 300,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    position: "absolute",
    top: 50, // Height of selector roughly
    left: 0,
    right: 0,
    zIndex: 10,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dropdownItemActive: {
    backgroundColor: "#f5f9ff",
  },
  dropdownBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#eef2ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dropdownBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
  },
  dropdownBadgeTextActive: {
    color: "#2968ff",
  },
  dropdownItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    lineHeight: 20,
  },
  dropdownItemTitleActive: {
    color: "#2968ff",
  },
  dropdownItemSubtitle: {
    fontSize: 12,
    color: "#888",
  },
  selectedModuleInfo: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  selectedModuleTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  selectedModuleSubtitle: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  weekCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 0,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  weekLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  lecturesList: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  lectureItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f9f9f9",
  },
  lectureTitle: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  lectureDuration: {
    fontSize: 12,
    color: "#999",
  },

  overviewContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 8,
    color: "#111",
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#444",
    marginBottom: 20,
  },
  bulletItem: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  bulletText: {
    color: "#666",
    marginTop: 12,
  },
  assessmentCheckpoint: {
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 8,
  },
  checkpointTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  checkpointDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
    lineHeight: 18,
  },
  goToAssessmentBtn: {
    backgroundColor: "#2968ff",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  goToAssessmentBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  lockedAssessment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  lockedText: {
    fontSize: 13,
    color: "#999",
  },
  moduleAssessmentTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  weekAssessmentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  weekAssessmentTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },
  weekAssessmentSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  weekAssessmentMeta: {
    fontSize: 12,
    color: "#999",
  },
  startAssessmentBtn: {
    backgroundColor: "#2968ff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startAssessmentBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  lockedBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  notesCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 24,
    textAlign: "center",
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2968ff",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 10,
  },
  downloadBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  noteListItem: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noteBreadcrumb: {
    fontSize: 10,
    color: "#2968ff",
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  noteListTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  noteDate: {
    fontSize: 12,
    color: "#666",
  },
  viewNotesBtn: {
    backgroundColor: "#2968ff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  viewNotesBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
