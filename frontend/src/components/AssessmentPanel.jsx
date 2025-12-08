import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  startAssessmentAttempt,
  submitAssessmentAttempt,
} from "../services/assessmentService";

const letterForIndex = (index) => String.fromCharCode(65 + index);

const AssessmentPanel = ({
  courseSlug,
  programmeSlug,
  courseName = "",
  modules = [],
  focusContext = null,
}) => {
  const { token } = useAuth();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [remainingMs, setRemainingMs] = useState(null);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lockedQuestions, setLockedQuestions] = useState({});
  const [questionStartAt, setQuestionStartAt] = useState(null);
  const perQuestionMs = 20000;

  const moduleIndex = useMemo(() => Number(focusContext?.module) || null, [focusContext]);
  const weekIndex = useMemo(
    () => Number(focusContext?.weekInModule) || Number(focusContext?.week) || null,
    [focusContext]
  );

  const persistPosition = useCallback(
    (nextIndex, nextStart) => {
      setCurrentIndex(nextIndex);
      setQuestionStartAt(nextStart);
      if (attempt?.id) {
        localStorage.setItem(
          `assessment-state-${attempt.id}`,
          JSON.stringify({
            currentIndex: nextIndex,
            questionStartAt: nextStart ? nextStart.toISOString() : null,
          })
        );
      }
    },
    [attempt?.id]
  );

  const scopeLabel = useMemo(() => {
    if (!moduleIndex || !weekIndex) {
      return "";
    }
    const moduleTitle =
      modules[moduleIndex - 1]?.title || modules[moduleIndex - 1]?.moduleLabel || `Module ${moduleIndex}`;
    const weekTitle =
      modules[moduleIndex - 1]?.weeklyStructure?.[weekIndex - 1]?.title || `Week ${weekIndex}`;
    return `${moduleTitle} · ${weekTitle}`;
  }, [modules, moduleIndex, weekIndex]);

  const loadAttempt = useCallback(async () => {
    if (!moduleIndex || !weekIndex) {
      setAttempt(null);
      return;
    }
    if (!token) {
      setError("Sign in to access assessments.");
      return;
    }
    setLoading(true);
    setError("");
    setFlash("");
    try {
      const response = await startAssessmentAttempt({
        courseSlug,
        programmeSlug,
        moduleIndex,
        weekIndex,
        token,
      });
      const nextAttempt = response?.attempt || response;
      const totalQuestions = nextAttempt?.questions?.length || 0;
      let savedIndex = 0;
      let savedQuestionStart = null;
      const stateKey = nextAttempt?.id ? `assessment-state-${nextAttempt.id}` : null;
      if (stateKey) {
        const storedState = localStorage.getItem(stateKey);
        if (storedState) {
          try {
            const parsedState = JSON.parse(storedState);
            if (typeof parsedState?.currentIndex === "number") {
              savedIndex = Math.min(Math.max(parsedState.currentIndex, 0), Math.max(totalQuestions - 1, 0));
            }
            if (parsedState?.questionStartAt) {
              const parsedStart = new Date(parsedState.questionStartAt);
              if (!Number.isNaN(parsedStart.getTime())) {
                savedQuestionStart = parsedStart;
              }
            }
          } catch (parseErr) {
            // ignore state parse errors
          }
        }
      }
      setAttempt(nextAttempt);
      setCurrentIndex(savedIndex);
      setQuestionStartAt(savedQuestionStart);
      // Only reset lockedQuestions if this is a new attempt or submitted
      if (nextAttempt?.status === 'submitted' || !stateKey || !localStorage.getItem(stateKey)) {
        setLockedQuestions({});
      }
      if (nextAttempt?.status === "submitted") {
        setHasStarted(true);
        setRemainingMs(null);
      } else {
        const stored = nextAttempt?.id ? localStorage.getItem(`assessment-start-${nextAttempt.id}`) : null;
        if (stored) {
          const parsed = new Date(stored);
          if (!Number.isNaN(parsed.getTime())) {
            setHasStarted(true);
            if (!savedQuestionStart) {
              setQuestionStartAt(parsed);
            }
          }
        } else {
          setHasStarted(false);
          setQuestionStartAt(null);
        }
      }
      const initialAnswers = {};
      (nextAttempt.questions || []).forEach((question) => {
        if (question.selectedOptionId) {
          initialAnswers[question.id] = question.selectedOptionId;
        }
      });
      setAnswers(initialAnswers);
    } catch (err) {
      setError(err?.message || "Unable to load assessment right now.");
    } finally {
      setLoading(false);
    }
  }, [courseSlug, moduleIndex, programmeSlug, token, weekIndex]);

  useEffect(() => {
    loadAttempt();
  }, [loadAttempt]);

  useEffect(() => {
    const currentQuestion = attempt?.questions?.[currentIndex];
    const isLocked = currentQuestion && lockedQuestions[currentQuestion.id];
    if (hasStarted && !questionStartAt && attempt && attempt.status !== "submitted" && !isLocked) {
      const now = new Date();
      persistPosition(currentIndex, now);
    }
  }, [hasStarted, questionStartAt, attempt, currentIndex, persistPosition, lockedQuestions]);

  const handleSelect = (questionId, optionId) => {
    if (!attempt || attempt.status === "submitted") {
      return;
    }
    if (lockedQuestions[questionId]) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmit = async (auto = false) => {
    if (!attempt || attempt.status === "submitted") {
      return;
    }
    if (autoSubmitting || submitting) return;
    if (auto) {
      setAutoSubmitting(true);
    } else {
      setSubmitting(true);
    }
    setError("");
    setFlash("");
    try {
      const payload = (attempt.questions || []).map((question) => ({
        questionId: question.id,
        selectedOptionId: answers[question.id] || "",
      }));
      const response = await submitAssessmentAttempt({
        courseSlug,
        programmeSlug,
        attemptId: attempt.id,
        answers: payload,
        token,
      });
      const nextAttempt = response?.attempt || response;
      setAttempt(nextAttempt);
      const nextAnswers = {};
      (nextAttempt.questions || []).forEach((question) => {
        if (question.selectedOptionId) {
          nextAnswers[question.id] = question.selectedOptionId;
        }
      });
      setAnswers(nextAnswers);
      setFlash(auto ? "Time expired. Assessment auto-submitted." : "Assessment submitted. Review your answers below.");
    } catch (err) {
      setError(err?.message || "Unable to submit assessment right now.");
    } finally {
      setSubmitting(false);
      setAutoSubmitting(false);
    }
  };

  useEffect(() => {
    let timer;
    const currentQuestion = attempt?.questions?.[currentIndex];
    const isSubmitted = attempt?.status === "submitted";
    if (!hasStarted || !attempt || !currentQuestion || isSubmitted) {
      setRemainingMs(null);
      return () => {
        if (timer) clearInterval(timer);
      };
    }

    const isLocked = lockedQuestions[currentQuestion.id];
    if (isLocked) {
      setRemainingMs(0);
      return () => {
        if (timer) clearInterval(timer);
      };
    }

    const startTime = questionStartAt?.getTime ? questionStartAt.getTime() : Date.now();

    const tick = () => {
      const now = Date.now();
      const elapsedCurrent = now - startTime;
      const remainingCurrent = Math.max(0, perQuestionMs - elapsedCurrent);
      setRemainingMs(remainingCurrent);
      if (remainingCurrent <= 0 && !autoSubmitting && !submitting) {
        submitCurrentQuestion(true);
      }
    };

    tick();
    timer = setInterval(tick, 250);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [
    hasStarted,
    attempt,
    questionStartAt,
    autoSubmitting,
    submitting,
    currentIndex,
    perQuestionMs,
    lockedQuestions,
  ]);

  const handleStart = () => {
    if (!attempt || hasStarted) return;
    const now = new Date();
    setHasStarted(true);
    persistPosition(0, now);
    if (attempt.id) {
      localStorage.setItem(`assessment-start-${attempt.id}`, now.toISOString());
    }
  };

  const submitCurrentQuestion = (auto = false) => {
    if (!attempt || attempt.status === "submitted") return;
    const question = attempt.questions?.[currentIndex];
    if (!question) return;
    const lastIndex = Math.max((attempt.questions?.length || 1) - 1, 0);

    if (lockedQuestions[question.id]) {
      if (currentIndex >= lastIndex) {
        handleSubmit(auto);
      } else {
        const nextStart = new Date();
        persistPosition(Math.min(lastIndex, currentIndex + 1), nextStart);
      }
      return;
    }

    setLockedQuestions((prev) => ({ ...prev, [question.id]: true }));

    if (currentIndex >= lastIndex) {
      // all questions locked; auto submit entire assessment
      handleSubmit(auto);
    } else {
      const nextStart = new Date();
      persistPosition(Math.min(lastIndex, currentIndex + 1), nextStart);
    }
  };

  const handleNext = () => {
    if (!attempt || attempt.status === "submitted") return;
    const currentQuestion = attempt.questions?.[currentIndex];
    const lastIndex = Math.max((attempt.questions?.length || 1) - 1, 0);

    if (currentQuestion && lockedQuestions[currentQuestion.id]) {
      if (currentIndex >= lastIndex) {
        handleSubmit(false);
      } else {
        const nextStart = new Date();
        persistPosition(Math.min(lastIndex, currentIndex + 1), nextStart);
      }
      return;
    }

    submitCurrentQuestion(false);
  };

  const handlePrev = () => {
    if (!attempt || currentIndex <= 0) return;
    const prevIndex = Math.max(0, currentIndex - 1);
    const prevQuestion = attempt.questions?.[prevIndex];
    const nextStart = prevQuestion && lockedQuestions[prevQuestion.id] ? null : new Date();
    persistPosition(prevIndex, nextStart);
  };

  const answeredCount = useMemo(() => {
    if (!attempt?.questions) {
      return 0;
    }
    return attempt.questions.reduce((count, question) => count + (answers[question.id] ? 1 : 0), 0);
  }, [attempt, answers]);

  const correctCount = useMemo(() => {
    if (!attempt?.questions) {
      return 0;
    }
    return attempt.questions.reduce((count, question) => count + (question.isCorrect ? 1 : 0), 0);
  }, [attempt]);

  const renderQuestion = (question, index) => {
    const selected = answers[question.id] || "";
    const isSubmitted = attempt?.status === "submitted";
    const isCorrect = isSubmitted ? question.isCorrect : null;
    const isLocked = isSubmitted || lockedQuestions[question.id];
    const correctOption =
      question.options && question.correctOptionId
        ? question.options.find((opt) => opt.id === question.correctOptionId)
        : null;

    const questionKey = question.id ? `${question.id}-${index}` : `question-${index}`;
    return (
      <div
        key={questionKey}
        className={`assessment-question ${isSubmitted ? "is-locked" : ""}`}
        style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}
      >
        <div className='d-flex align-items-start justify-content-between gap-8 mb-8'>
          <p className='assessment-question__prompt mb-0'>
            {index + 1}. {question.prompt}
          </p>
          {isSubmitted ? (
            <span
              className={`assessment-chip ${isCorrect ? "assessment-chip--success" : "assessment-chip--danger"
                }`}
            >
              {isCorrect ? "Correct" : "Incorrect"}
            </span>
          ) : null}
        </div>
        <div className='assessment-options' role='group' aria-label='Answer choices'>
          {question.options?.map((option, optionIndex) => {
            const optionIsSelected = selected === option.id;
            const optionIsCorrect = isSubmitted && question.correctOptionId === option.id;
            const optionIsIncorrect = isSubmitted && optionIsSelected && !optionIsCorrect;
            const optionKey = `${question.id || "q"}-${option.id || optionIndex}-${optionIndex}`;

            return (
              <button
                key={optionKey}
                type='button'
                className={`assessment-option ${optionIsSelected ? "is-selected" : ""} ${optionIsCorrect ? "is-correct" : ""
                  } ${optionIsIncorrect ? "is-incorrect" : ""}`}
                onClick={() => handleSelect(question.id, option.id)}
                aria-pressed={optionIsSelected}
                disabled={isLocked}
              >
                <span className='assessment-option__letter'>{letterForIndex(optionIndex)}</span>
                <span className='assessment-option__label'>{option.label}</span>
                {optionIsCorrect ? <i className='ph-bold ph-check-circle' aria-hidden='true' /> : null}
                {optionIsIncorrect ? <i className='ph-bold ph-x-circle' aria-hidden='true' /> : null}
              </button>
            );
          })}
        </div>

        {!isSubmitted && isLocked ? (
          <p className='text-neutral-600 small mt-3 mb-0'>This question is locked. You can review but cannot change your answer.</p>
        ) : null}

        {isSubmitted ? (
          <div className='assessment-explanation'>
            <p className='mb-2 text-neutral-700'>
              Your answer:{" "}
              {selected
                ? question.options?.find((opt) => opt.id === selected)?.label || "Not answered"
                : "Not answered"}
            </p>
            {!isCorrect && correctOption ? (
              <p className='mb-0 text-neutral-700'>
                Correct answer: <strong>{correctOption.label}</strong>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  const renderAttempt = () => {
    if (!attempt) {
      return null;
    }

    const totalQuestions = attempt.questions?.length || 0;
    const isSubmitted = attempt.status === "submitted";
    const currentQuestion = attempt.questions?.[currentIndex] || null;
    const isCurrentLocked = currentQuestion ? lockedQuestions[currentQuestion.id] : false;
    const lockedCount = Object.keys(lockedQuestions).length;
    const showTimer = hasStarted && !isSubmitted && remainingMs !== null && !isCurrentLocked;
    const completionRatio = totalQuestions
      ? Math.round((Math.max(lockedCount, answeredCount) / totalQuestions) * 100)
      : 0;
    const timeLabel = showTimer
      ? `${Math.max(0, Math.floor((remainingMs || 0) / 60000))
        .toString()
        .padStart(2, "0")}:${Math.max(0, Math.floor(((remainingMs || 0) % 60000) / 1000))
          .toString()
          .padStart(2, "0")}`
      : null;

    if (!hasStarted && !isSubmitted) {
      return (
        <div className='assessment-runner__header flex-column'>
          <div className='mb-3'>
            <p className='assessment-runner__eyebrow mb-2'>{scopeLabel || "Module & week assessment"}</p>
            <h3 className='assessment-runner__title mb-2'>{courseName || "Assessment"}</h3>
            <p className='text-neutral-600 mb-0'>
              Start to reveal questions. Each question has 20 seconds; when time expires the question locks and auto-advances. Unanswered questions will be marked incorrect.
            </p>
          </div>
          <div className='d-flex align-items-center gap-3'>
            <button type='button' className='btn btn-main' onClick={handleStart}>
              Start assessment
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className='assessment-runner__header'>
          <div>
            <p className='assessment-runner__eyebrow mb-4'>{scopeLabel || "Module & week assessment"}</p>
            <h3 className='assessment-runner__title mb-2'>{courseName || "Assessment"}</h3>
          </div>
        </div>

        <div className='assessment-progress mb-16'>
          <div className='assessment-progress__bar' aria-label='Assessment progress'>
            <div
              style={{
                width: `${completionRatio}%`,
              }}
            />
          </div>
          <div className='assessment-progress__meta'>
            <span>
              Question {Math.min(currentIndex + 1, totalQuestions || 1)} of {totalQuestions || 1}
            </span>
            <span>
              Answered {answeredCount} of {totalQuestions || 1}
            </span>
            {showTimer ? (
              <span>
                Time left for this question: <strong className='ms-2'>{timeLabel}</strong>
              </span>
            ) : !isSubmitted && hasStarted && isCurrentLocked ? (
              <span>This question is locked.</span>
            ) : null}
          </div>
        </div>

        {isSubmitted ? (
          <div className='assessment-result mb-16'>
            <div>
              <p className='assessment-result__eyebrow mb-4'>Score</p>
              <h4 className='assessment-result__score mb-4'>
                {attempt.score}/{totalQuestions || 1} correct
                <span className='assessment-result__badge'>
                  {totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0}%
                </span>
              </h4>
              <p className='mb-0 text-neutral-600'>
                You cannot retake this assessment. Review the correct answers below.
              </p>
            </div>
          </div>
        ) : null}

        {!isSubmitted ? (
          <>
            <div className='assessment-question-list d-flex flex-column gap-12 mb-16'>
              {currentQuestion ? renderQuestion(currentQuestion, currentIndex) : <p>No questions available.</p>}
            </div>

            <div className='d-flex align-items-center justify-content-between gap-3 flex-wrap mb-12'>
              <div className='d-flex gap-2'>
                <button type='button' className='btn btn-ghost' onClick={handlePrev} disabled={currentIndex === 0}>
                  Previous
                </button>
                <button
                  type='button'
                  className='btn btn-main'
                  onClick={handleNext}
                  disabled={!totalQuestions || submitting || autoSubmitting}
                >
                  {currentIndex >= (totalQuestions || 1) - 1
                    ? lockedCount >= totalQuestions
                      ? "Submit answers"
                      : "Lock & submit"
                    : isCurrentLocked
                      ? "Next question"
                      : "Lock & next"}
                </button>
              </div>
              <button
                type='button'
                className='btn btn-secondary'
                onClick={() => handleSubmit(false)}
                disabled={submitting || autoSubmitting || !totalQuestions}
              >
                {submitting || autoSubmitting ? "Submitting..." : "Submit all"}
              </button>
            </div>
          </>
        ) : (
          <div className='assessment-question-list d-flex flex-column gap-12 mb-16'>
            {attempt.questions?.map((question, index) => renderQuestion(question, index))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className='course-home-panel'>
      <div className='course-home-panel__header mb-16 align-items-start flex-wrap'>
        <div>
          <p className='course-home-panel__eyebrow mb-8'>Assessments</p>
          <h2 className='course-home-panel__title mb-4'>Weekly checkpoints</h2>

        </div>
      </div>

      {!moduleIndex || !weekIndex ? (
        <div className='course-home-empty text-center'>
          <p className='text-neutral-700 fw-semibold mb-8'>Pick a week to get your questions.</p>
          <p className='text-neutral-600 mb-0'>
            Open a module and click “Go to assessment” for the week you want to practice. Questions are tailored per
            module and week.
          </p>
        </div>
      ) : null}

      {error ? <p className='text-danger mb-12'>{error}</p> : null}
      {flash ? <p className='text-success mb-12'>{flash}</p> : null}

      {loading ? <p className='text-neutral-600 mb-0'>Syncing your weekly assessment...</p> : null}

      {!loading && moduleIndex && weekIndex ? renderAttempt() : null}
    </div>
  );
};

export default AssessmentPanel;
