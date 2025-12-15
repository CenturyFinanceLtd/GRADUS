import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Option {
  id: string;
  label: string;
}

interface Question {
  id: string; // questionId
  prompt: string;
  options: Option[];
  selectedOptionId?: string;
  correctOptionId?: string;
  isCorrect?: boolean;
}

interface Attempt {
  id: string;
  title?: string;
  status: "in-progress" | "submitted";
  score?: number;
  totalQuestions?: number;
  questions: Question[];
}

interface AssessmentPlayerProps {
  visible: boolean;
  attempt: Attempt | null;
  onClose: () => void;
  onSubmit: (
    answers: { questionId: string; selectedOptionId: string }[]
  ) => Promise<void>;
  loadingSubmit?: boolean;
}

export default function AssessmentPlayer({
  visible,
  attempt,
  onClose,
  onSubmit,
  loadingSubmit,
}: AssessmentPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hasStarted, setHasStarted] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [lockedQuestions, setLockedQuestions] = useState<
    Record<string, boolean>
  >({});
  const [questionStartAt, setQuestionStartAt] = useState<Date | null>(null);
  const PER_QUESTION_MS = 20000; // 20 seconds per question

  // Initialization effect - only pre-fill answers in review mode
  useEffect(() => {
    if (visible && attempt) {
      console.log("=== OPENING ASSESSMENT PLAYER ===");
      console.log("Attempt ID:", attempt.id);
      console.log("Status:", attempt.status);
      console.log("First Question ID:", attempt.questions[0]?.id);
      console.log(
        "First Question Options:",
        JSON.stringify(attempt.questions[0]?.options, null, 2)
      );

      // Check for duplicate question IDs which causes "ghost" answers
      const idCounts: Record<string, number> = {};
      const duplicates: string[] = [];
      attempt.questions.forEach((q) => {
        idCounts[q.id] = (idCounts[q.id] || 0) + 1;
        if (idCounts[q.id] === 2) duplicates.push(q.id);
      });
      if (duplicates.length > 0) {
        console.error("CRITICAL: DUPLICATE QUESTION IDs FOUND:", duplicates);
        Alert.alert(
          "Error",
          "Assessment has duplicate questions. Please report this."
        );
      } else {
        console.log("Question IDs are unique. Good.");
      }

      setCurrentIndex(0);
      setLockedQuestions({});
      setQuestionStartAt(null);

      // Only pre-fill answers if this is a submitted assessment (review mode)
      const initialAnswers: Record<string, string> = {};
      if (attempt.status === "submitted") {
        console.log("Review Mode: Pre-filling answers from backend");
        attempt.questions.forEach((q) => {
          if (q.selectedOptionId) {
            initialAnswers[q.id] = q.selectedOptionId;
          }
        });
      } else {
        console.log("Active Mode: Starting with clean answers");
        // STRICTLY ensure answers are empty for new/in-progress attempts
      }
      setAnswers(initialAnswers);

      // Check if already submitted (review mode)
      if (attempt.status === "submitted") {
        setHasStarted(true);
        setShowStartConfirm(false);
        setRemainingMs(null);
      } else {
        // Show confirmation dialog for new/in-progress assessments
        setHasStarted(false);
        setShowStartConfirm(true);
      }
    }
  }, [visible, attempt]);

  // Timer effect
  useEffect(() => {
    if (!hasStarted || !attempt || attempt.status === "submitted") {
      setRemainingMs(null);
      return;
    }

    const currentQuestion = attempt.questions[currentIndex];
    if (!currentQuestion || lockedQuestions[currentQuestion.id]) {
      setRemainingMs(0);
      return;
    }

    if (!questionStartAt) {
      // Start timer for first question
      setQuestionStartAt(new Date());
      return;
    }

    const startTime = questionStartAt.getTime();
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, PER_QUESTION_MS - elapsed);
      setRemainingMs(remaining);

      if (remaining <= 0) {
        // Auto-submit current question
        submitCurrentQuestion(true);
      }
    }, 250);

    return () => clearInterval(timer);
  }, [hasStarted, attempt, currentIndex, questionStartAt, lockedQuestions]);

  if (!visible || !attempt) return null;

  const isReviewMode = attempt.status === "submitted";
  const currentQuestion = attempt.questions[currentIndex];
  const total = attempt.questions.length;
  const progress = ((currentIndex + 1) / total) * 100;

  const handleConfirmStart = () => {
    setHasStarted(true);
    setShowStartConfirm(false);
    setQuestionStartAt(new Date());
  };

  const handleSelectOption = (optionId: string) => {
    if (isReviewMode || lockedQuestions[currentQuestion.id]) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  const submitCurrentQuestion = (auto: boolean = false) => {
    if (isReviewMode) return;
    const question = currentQuestion;
    if (!question) return;

    // Lock current question
    setLockedQuestions((prev) => ({ ...prev, [question.id]: true }));

    const lastIndex = total - 1;
    if (currentIndex >= lastIndex) {
      // Last question - submit entire assessment
      handleFullSubmit(auto);
    } else {
      // Move to next question
      setCurrentIndex(currentIndex + 1);
      setQuestionStartAt(new Date());
    }
  };

  const handleNext = () => {
    if (isReviewMode) {
      // In review mode, just navigate
      if (currentIndex < total - 1) {
        setCurrentIndex(currentIndex + 1);
      }
      return;
    }

    if (lockedQuestions[currentQuestion.id]) {
      // Already locked, just navigate
      if (currentIndex < total - 1) {
        setCurrentIndex(currentIndex + 1);
        setQuestionStartAt(new Date());
      } else {
        handleFullSubmit(false);
      }
    } else {
      // Lock and move
      submitCurrentQuestion(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      if (
        !isReviewMode &&
        !lockedQuestions[attempt.questions[currentIndex - 1].id]
      ) {
        setQuestionStartAt(new Date());
      }
    }
  };

  const handleFullSubmit = (auto: boolean = false) => {
    const payload = attempt.questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: answers[q.id] || "",
    }));

    // DEBUG: Count how many answers are actually recorded
    const nonEmptyCount = Object.values(answers).filter(Boolean).length;

    if (!auto) {
      Alert.alert(
        "Debug Submit",
        `Sending ${nonEmptyCount} answers. Payload size: ${payload.length}`,
        [{ text: "OK", onPress: () => onSubmit(payload) }]
      );
      return;
    }

    if (auto) {
      Alert.alert(
        "Time's Up!",
        "Assessment auto-submitted due to timer expiration."
      );
    }

    onSubmit(payload);
  };

  const handleSubmitPress = () => {
    // Check if all answered
    const unanswered = attempt.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      Alert.alert(
        "Incomplete",
        `You have ${unanswered.length} unanswered questions. Are you sure you want to submit?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Submit",
            onPress: () => handleFullSubmit(false),
          },
        ]
      );
    } else {
      handleFullSubmit(false);
    }
  };

  const currentAnswer = answers[currentQuestion?.id];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container}>
        {/* Confirmation Screen */}
        {showStartConfirm && !hasStarted ? (
          <View style={styles.confirmContainer}>
            <View style={styles.confirmHeader}>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.confirmContent}>
              <Ionicons
                name="timer-outline"
                size={64}
                color="#2968ff"
                style={{ alignSelf: "center", marginBottom: 24 }}
              />
              <Text style={styles.confirmTitle}>Weekly Assessment</Text>
              <Text style={styles.confirmSubtitle}>
                {attempt.title || `Module ${currentIndex + 1} Assessment`}
              </Text>

              <View style={styles.rulesContainer}>
                <Text style={styles.rulesTitle}>Assessment Rules:</Text>

                <View style={styles.ruleItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#2968ff" />
                  <Text style={styles.ruleText}>
                    Total Questions:{" "}
                    <Text style={{ fontWeight: "700" }}>{total}</Text>
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <Ionicons name="time" size={20} color="#2968ff" />
                  <Text style={styles.ruleText}>
                    Time per Question:{" "}
                    <Text style={{ fontWeight: "700" }}>20 seconds</Text>
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <Ionicons name="lock-closed" size={20} color="#2968ff" />
                  <Text style={styles.ruleText}>
                    Questions auto-lock after 20 seconds
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <Ionicons name="alert-circle" size={20} color="#ff6b6b" />
                  <Text style={styles.ruleText}>
                    Unanswered questions will be marked incorrect
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <Ionicons name="ban" size={20} color="#ff6b6b" />
                  <Text style={styles.ruleText}>
                    You cannot retake this assessment once submitted
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.startButton}
                onPress={handleConfirmStart}
              >
                <Text style={styles.startButtonText}>Start Assessment</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        ) : (
          <>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {isReviewMode ? "Review" : "Assessment"}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarBg}>
              <View
                style={[styles.progressBarFill, { width: `${progress}%` }]}
              />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
              {/* Review Score Banner */}
              {isReviewMode && (
                <View style={styles.scoreBanner}>
                  <Text style={styles.scoreTitle}>Score</Text>
                  <Text style={styles.scoreValue}>
                    {attempt.score} / {attempt.totalQuestions}
                  </Text>
                  <Text style={styles.scorePercent}>
                    {Math.round(
                      ((attempt.score || 0) / (attempt.totalQuestions || 1)) *
                        100
                    )}
                    %
                  </Text>
                </View>
              )}

              {/* Question Card */}
              <View style={styles.questionCard}>
                <View style={styles.qMeta}>
                  <Text style={styles.qIndex}>
                    Question {currentIndex + 1} of {total}
                  </Text>
                  {!isReviewMode &&
                    hasStarted &&
                    remainingMs !== null &&
                    !lockedQuestions[currentQuestion.id] && (
                      <View style={styles.timerBadge}>
                        <Ionicons name="time" size={14} color="#2968ff" />
                        <Text style={styles.timerText}>
                          {Math.ceil((remainingMs || 0) / 1000)}s
                        </Text>
                      </View>
                    )}
                  {isReviewMode && (
                    <View
                      style={[
                        styles.statusBadge,
                        currentQuestion.isCorrect
                          ? styles.correctBadge
                          : styles.wrongBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          currentQuestion.isCorrect
                            ? styles.correctText
                            : styles.wrongText,
                        ]}
                      >
                        {currentQuestion.isCorrect ? "Correct" : "Incorrect"}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.qPrompt}>{currentQuestion.prompt}</Text>

                <View style={styles.optionsList}>
                  {currentQuestion.options.map((opt) => {
                    // In review mode, use the selectedOptionId from the backend
                    // In active mode, use our local answers state
                    const isSelected = isReviewMode
                      ? currentQuestion.selectedOptionId === opt.id
                      : currentAnswer === opt.id;
                    const isCorrect =
                      currentQuestion.correctOptionId === opt.id;

                    let borderStyle = {};
                    let iconName = isSelected
                      ? "radio-button-on"
                      : "radio-button-off";
                    let iconColor = isSelected ? "#2968ff" : "#ccc";

                    if (isReviewMode) {
                      if (isCorrect) {
                        borderStyle = {
                          borderColor: "#2e7d32",
                          backgroundColor: "#f1f8e9",
                        };
                        iconName = "checkmark-circle";
                        iconColor = "#2e7d32";
                      } else if (isSelected && !isCorrect) {
                        borderStyle = {
                          borderColor: "#c62828",
                          backgroundColor: "#ffebee",
                        };
                        iconName = "close-circle";
                        iconColor = "#c62828";
                      }
                    } else if (isSelected) {
                      borderStyle = {
                        borderColor: "#2968ff",
                        backgroundColor: "#eff6ff",
                      };
                    }

                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.optionItem, borderStyle]}
                        onPress={() => handleSelectOption(opt.id)}
                        disabled={isReviewMode}
                      >
                        <Ionicons
                          name={iconName as any}
                          size={20}
                          color={iconColor}
                          style={{ marginRight: 10 }}
                        />
                        <Text
                          style={[
                            styles.optionText,
                            (isSelected || (isReviewMode && isCorrect)) && {
                              fontWeight: "600",
                            },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {isReviewMode && !currentQuestion.isCorrect && (
                  <View style={styles.explanationBox}>
                    <Text style={styles.expTitle}>Explanation:</Text>
                    <Text style={styles.expText}>
                      {/* We assume explanation is not sent by backend yet but UI ready */}
                      The correct answer is highlighted in green.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.navBtn,
                  currentIndex === 0 && styles.disabledBtn,
                ]}
                onPress={handlePrev}
                disabled={currentIndex === 0}
              >
                <Text style={styles.navBtnText}>Previous</Text>
              </TouchableOpacity>

              {currentIndex === total - 1 ? (
                !isReviewMode ? (
                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      loadingSubmit && styles.disabledBtn,
                    ]}
                    onPress={handleSubmitPress}
                    disabled={loadingSubmit}
                  >
                    {loadingSubmit ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitBtnText}>Submit</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.navBtn} onPress={onClose}>
                    <Text style={styles.navBtnText}>Close</Text>
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity style={styles.navBtn} onPress={handleNext}>
                  <Text style={styles.navBtnText}>Next</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  closeBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "#eee",
    width: "100%",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2968ff",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  scoreBanner: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eee",
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111",
  },
  scorePercent: {
    fontSize: 16,
    color: "#2968ff",
    fontWeight: "600",
    marginTop: 4,
  },
  questionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    minHeight: 300,
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  qMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  qIndex: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  qPrompt: {
    fontSize: 18,
    color: "#111",
    fontWeight: "600",
    lineHeight: 26,
    marginBottom: 24,
  },
  optionsList: {
    gap: 12,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  optionText: {
    fontSize: 15,
    color: "#333",
    flex: 1,
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  correctBadge: { backgroundColor: "#e8f5e9" },
  wrongBadge: { backgroundColor: "#ffebee" },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  correctText: { color: "#2e7d32" },
  wrongText: { color: "#c62828" },
  explanationBox: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  expTitle: {
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 4,
    color: "#555",
  },
  expText: {
    color: "#666",
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    justifyContent: "space-between",
  },
  navBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  navBtnText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 15,
  },
  submitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: "#2968ff",
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  confirmContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  confirmHeader: {
    padding: 16,
    alignItems: "flex-end",
  },
  confirmContent: {
    flexGrow: 1,
    padding: 24,
    alignItems: "center",
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
    textAlign: "center",
  },
  confirmSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
  },
  rulesContainer: {
    width: "100%",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 16,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
  },
  startButton: {
    width: "100%",
    backgroundColor: "#2968ff",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    width: "100%",
    backgroundColor: "#f0f0f0",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#e3f2fd",
    borderRadius: 12,
  },
  timerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2968ff",
  },
});
