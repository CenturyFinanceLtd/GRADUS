import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  startAssessmentAttempt,
  submitAssessmentAttempt,
} from "../services/assessmentService";

const formatPlural = (value, label) => {
  const safe = Number(value) || 0;
  const unit = safe === 1 ? label : `${label}s`;
  return `${safe} ${unit}`;
};

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

  const moduleIndex = useMemo(() => Number(focusContext?.module) || null, [focusContext]);
  const weekIndex = useMemo(
    () => Number(focusContext?.weekInModule) || Number(focusContext?.week) || null,
    [focusContext]
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
      setAttempt(nextAttempt);
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

  const handleSelect = (questionId, optionId) => {
    if (!attempt || attempt.status === "submitted") {
      return;
    }
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmit = async () => {
    if (!attempt || attempt.status === "submitted") {
      return;
    }
    setSubmitting(true);
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
      setFlash("Assessment submitted. Review your answers below.");
    } catch (err) {
      setError(err?.message || "Unable to submit assessment right now.");
    } finally {
      setSubmitting(false);
    }
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
    return attempt.questions.filter((question) => question.isCorrect).length;
  }, [attempt]);

  const renderQuestion = (question, index) => {
    const selected = answers[question.id] || "";
    const isSubmitted = attempt?.status === "submitted";
    const isCorrect = isSubmitted ? question.isCorrect : null;
    const correctOption =
      question.options && question.correctOptionId
        ? question.options.find((opt) => opt.id === question.correctOptionId)
        : null;

    return (
      <div
        key={question.id}
        className={`assessment-question ${isSubmitted ? "is-locked" : ""}`}
        style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}
      >
        <div className='d-flex align-items-start justify-content-between gap-8 mb-8'>
          <p className='assessment-question__prompt mb-0'>
            {index + 1}. {question.prompt}
          </p>
          {isSubmitted ? (
            <span
              className={`assessment-chip ${
                isCorrect ? "assessment-chip--success" : "assessment-chip--danger"
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

            return (
              <button
                key={option.id}
                type='button'
                className={`assessment-option ${optionIsSelected ? "is-selected" : ""} ${
                  optionIsCorrect ? "is-correct" : ""
                } ${optionIsIncorrect ? "is-incorrect" : ""}`}
                onClick={() => handleSelect(question.id, option.id)}
                aria-pressed={optionIsSelected}
                disabled={isSubmitted}
              >
                <span className='assessment-option__letter'>{letterForIndex(optionIndex)}</span>
                <span className='assessment-option__label'>{option.label}</span>
                {optionIsCorrect ? <i className='ph-bold ph-check-circle' aria-hidden='true' /> : null}
                {optionIsIncorrect ? <i className='ph-bold ph-x-circle' aria-hidden='true' /> : null}
              </button>
            );
          })}
        </div>

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

    return (
      <>
        <div className='assessment-runner__header'>
          <div>
            <p className='assessment-runner__eyebrow mb-4'>{scopeLabel || "Module & week assessment"}</p>
            <h3 className='assessment-runner__title mb-2'>{courseName || "Assessment"}</h3>
            <p className='text-neutral-600 mb-0'>
              {formatPlural(totalQuestions, "question")} · {formatPlural(attempt.questionPoolSize || 0, "pool item")} ·
              one attempt per learner
            </p>
          </div>
          <div className='assessment-chip-row'>
            <span className='assessment-chip assessment-chip--ghost'>
              {isSubmitted ? "Submitted" : "In progress"}
            </span>
            <span className='assessment-chip assessment-chip--ghost'>Shuffled per user</span>
          </div>
        </div>

        <div className='assessment-progress mb-16'>
          <div className='assessment-progress__bar' aria-label='Assessment progress'>
            <div
              style={{
                width: `${totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0}%`,
              }}
            />
          </div>
          <div className='assessment-progress__meta'>
            <span>
              Answered {answeredCount} of {totalQuestions || 1}
            </span>
            <span>Attempts allowed: 1</span>
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

        <div className='assessment-question-list d-flex flex-column gap-12 mb-16'>
          {attempt.questions?.map((question, index) => renderQuestion(question, index))}
        </div>

        {!isSubmitted ? (
          <div className='assessment-actions'>
            <div className='d-flex gap-10 flex-wrap'>
              <button
                type='button'
                className='btn btn-main'
                onClick={handleSubmit}
                disabled={submitting || !totalQuestions}
              >
                {submitting ? "Submitting..." : "Submit assessment"}
              </button>
              <span className='text-neutral-600 small'>
                You will see correct answers after submission. Retakes are disabled.
              </span>
            </div>
          </div>
        ) : null}
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
        <div className='assessment-chip-row'>
          {scopeLabel ? <span className='assessment-chip assessment-chip--ghost'>{scopeLabel}</span> : null}
          <span className='assessment-chip assessment-chip--ghost'>Auto-graded</span>
          <span className='assessment-chip'>No retakes</span>
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
