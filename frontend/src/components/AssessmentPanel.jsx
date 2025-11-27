import { useEffect, useMemo, useState } from "react";
import { getAssessmentsForCourse } from "../data/assessments";

const buildSession = (quizId, status = "idle") => ({
  quizId: quizId || null,
  status: quizId ? status : "empty",
  currentIndex: 0,
  answers: {},
  startedAt: quizId ? Date.now() : null,
  completedAt: null,
});

const formatPlural = (value, label) => {
  const safe = Number(value) || 0;
  const unit = safe === 1 ? label : `${label}s`;
  return `${safe} ${unit}`;
};

const AssessmentPanel = ({ courseSlug, programmeSlug, courseName = "", modules = [] }) => {
  const assessments = useMemo(
    () => getAssessmentsForCourse({ courseSlug, programmeSlug }) || [],
    [courseSlug, programmeSlug]
  );
  const [activeQuizId, setActiveQuizId] = useState(assessments[0]?.id || null);
  const [session, setSession] = useState(() => buildSession(assessments[0]?.id));
  const [flashMessage, setFlashMessage] = useState("");
  const [tryItOpen, setTryItOpen] = useState(false);
  const [tryItCode, setTryItCode] = useState("");
  const [tryItTitle, setTryItTitle] = useState("Try it");
  const [tryItRunToken, setTryItRunToken] = useState(0);

  useEffect(() => {
    const firstId = assessments[0]?.id || null;
    setActiveQuizId(firstId);
    setSession(buildSession(firstId));
    setFlashMessage("");
  }, [assessments]);

  const activeQuiz = useMemo(
    () => assessments.find((quiz) => quiz.id === activeQuizId) || null,
    [assessments, activeQuizId]
  );
  const activeQuestion = activeQuiz?.questions?.[session.currentIndex] || null;
  const totalQuestions = activeQuiz?.questions?.length || 0;
  const answeredCount = activeQuiz
    ? activeQuiz.questions.reduce(
        (count, question) => count + (session.answers[question.id]?.checked ? 1 : 0),
        0
      )
    : 0;
  const score = activeQuiz
    ? activeQuiz.questions.reduce(
        (count, question) => count + (session.answers[question.id]?.isCorrect ? 1 : 0),
        0
      )
    : 0;
  const scorePercent = totalQuestions ? Math.round((score / totalQuestions) * 100) : 0;
  const progressPercent = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const currentAnswer = activeQuestion ? session.answers[activeQuestion.id] : null;
  const selectedOptionId = currentAnswer?.selectedOptionId || "";
  const isChecked = Boolean(currentAnswer?.checked);
  const isLastQuestion = totalQuestions ? session.currentIndex >= totalQuestions - 1 : false;
  const showStartCallout = session.status === "idle" && answeredCount === 0;

  const upcomingFromModules = useMemo(() => {
    const items = [];
    modules.forEach((module, moduleIndex) => {
      if (!Array.isArray(module?.weeklyStructure)) {
        return;
      }
      module.weeklyStructure.forEach((section) => {
        if (!Array.isArray(section?.quizzes) || !section.quizzes.length) {
          return;
        }
        section.quizzes.forEach((quizTitle, quizIndex) => {
          const label =
            typeof quizTitle === "string"
              ? quizTitle
              : quizTitle?.title || quizTitle?.name || `Quiz ${quizIndex + 1}`;
          if (label) {
            items.push({
              label,
              moduleTitle: module.title || `Module ${moduleIndex + 1}`,
            });
          }
        });
      });
    });
    return items.slice(0, 4);
  }, [modules]);

  const handleSelectQuiz = (quizId) => {
    setActiveQuizId(quizId);
    setSession(buildSession(quizId));
    setFlashMessage("");
  };

  const handleStartQuiz = () => {
    if (!activeQuiz?.id) {
      return;
    }
    setSession(buildSession(activeQuiz.id, "in-progress"));
    setFlashMessage("");
  };

  const handleOptionSelect = (optionId) => {
    if (!activeQuiz || !activeQuestion || isChecked) {
      return;
    }
    setSession((prev) => ({
      ...prev,
      status: prev.status === "idle" ? "in-progress" : prev.status,
      answers: {
        ...prev.answers,
        [activeQuestion.id]: {
          ...(prev.answers[activeQuestion.id] || {}),
          selectedOptionId: optionId,
          checked: false,
        },
      },
    }));
    setFlashMessage("");
  };

  const handleCheckAnswer = () => {
    if (!activeQuiz || !activeQuestion) {
      return;
    }
    if (!selectedOptionId) {
      setFlashMessage("Pick an option to check your answer.");
      return;
    }
    const isCorrect = selectedOptionId === activeQuestion.correctOptionId;
    setSession((prev) => ({
      ...prev,
      status: prev.status === "idle" ? "in-progress" : prev.status,
      answers: {
        ...prev.answers,
        [activeQuestion.id]: {
          ...(prev.answers[activeQuestion.id] || {}),
          selectedOptionId,
          checked: true,
          isCorrect,
        },
      },
    }));
    setFlashMessage(isCorrect ? "Correct! Keep going." : "Not quite. Review the explanation below.");
  };

  const handleNextQuestion = () => {
    if (!activeQuiz || !activeQuestion || !isChecked) {
      return;
    }
    if (isLastQuestion) {
      setSession((prev) => ({
        ...prev,
        status: "completed",
        completedAt: Date.now(),
      }));
      setFlashMessage("");
      return;
    }
    setSession((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
    }));
    setFlashMessage("");
  };

  const handleRestart = () => {
    if (!activeQuiz?.id) {
      return;
    }
    setSession(buildSession(activeQuiz.id, "in-progress"));
    setFlashMessage("");
  };

  const openTryIt = () => {
    if (!activeQuestion?.tryItTemplate) {
      return;
    }
    setTryItCode(activeQuestion.tryItTemplate);
    setTryItTitle(activeQuestion.prompt || "Try it");
    setTryItOpen(true);
    setTryItRunToken((t) => t + 1);
  };

  const buildSrcDoc = (code) => {
    return `<!doctype html>
<html>
  <head>
    <style>body{font-family: Arial, sans-serif; padding:12px;}</style>
  </head>
  <body>
    <pre id="output"></pre>
    <script>
      try {
        ${code}
      } catch (err) {
        document.getElementById('output').textContent = 'Error: ' + err.message;
      }
    <\/script>
  </body>
</html>`;
  };

  const tryItSrcDoc = useMemo(() => buildSrcDoc(tryItCode), [tryItCode, tryItRunToken]);

  if (!assessments.length) {
    return (
      <div className='course-home-panel'>
        <div className='course-home-panel__header mb-16'>
          <div>
            <p className='course-home-panel__eyebrow mb-8'>Assessments</p>
            <h2 className='course-home-panel__title mb-0'>Practice checkpoints</h2>
          </div>
        </div>
        <div className='course-home-empty text-center'>
          <p className='text-neutral-700 fw-semibold mb-8'>No assessments yet for this course.</p>
          <p className='text-neutral-600 mb-0'>
            Add question sets to <code>frontend/src/data/assessments.js</code> to enable the quizzes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='course-home-panel'>
      <div className='course-home-panel__header mb-16 align-items-start flex-wrap'>
        <div>
          <p className='course-home-panel__eyebrow mb-8'>Assessments</p>
          <h2 className='course-home-panel__title mb-4'>Practice checkpoints</h2>
          <p className='text-neutral-600 mb-0'>
            Auto-graded multiple choice with instant feedback. No external dependencies.
          </p>
        </div>
        <div className='assessment-chip-row'>
          <span className='assessment-chip'>Instant feedback</span>
          <span className='assessment-chip'>Multiple choice</span>
          <span className='assessment-chip'>Auto-graded</span>
        </div>
      </div>

      <div className='assessment-layout'>
        <div className='assessment-runner'>
          <div className='assessment-runner__header'>
            <div>
              <p className='assessment-runner__eyebrow mb-4'>Active quiz</p>
              <h3 className='assessment-runner__title mb-2'>{activeQuiz?.title}</h3>
              <p className='text-neutral-600 mb-0'>
                {courseName ? `${courseName} · ` : ""}
                {formatPlural(totalQuestions, "question")} · {activeQuiz?.level}
              </p>
            </div>
            <div className='assessment-chip-row'>
              {activeQuiz?.tags?.map((tag) => (
                <span key={tag} className='assessment-chip assessment-chip--ghost'>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className='assessment-progress mb-16'>
            <div className='assessment-progress__bar' aria-label='Assessment progress'>
              <div style={{ width: `${progressPercent}%` }} />
            </div>
            <div className='assessment-progress__meta'>
              <span>
                Question {Math.min(session.currentIndex + 1, totalQuestions)} of {totalQuestions || 1}
              </span>
              <span>
                Score: {score}/{totalQuestions || 1}
              </span>
            </div>
          </div>

          {showStartCallout ? (
            <div className='assessment-start card border-0 mb-16'>
              <div className='d-flex align-items-center gap-12 mb-12'>
                <i className='ph-bold ph-lightning text-main-500 fs-5' aria-hidden='true' />
                <div>
                  <p className='mb-2 fw-semibold text-neutral-800'>Ready to try a checkpoint?</p>
                  <p className='mb-0 text-neutral-600'>Work through bite-sized questions with instant validation.</p>
                </div>
              </div>
              <div className='d-flex gap-8 flex-wrap'>
                <button type='button' className='btn btn-main rounded-pill' onClick={handleStartQuiz}>
                  Start quiz
                </button>
                <button
                  type='button'
                  className='btn btn-outline-primary rounded-pill'
                  onClick={() => setSession(buildSession(activeQuiz.id, "in-progress"))}
                >
                  Jump in
                </button>
              </div>
            </div>
          ) : null}

          <div className='assessment-question'>
            <div className='assessment-question__meta'>
              <span className='assessment-chip assessment-chip--ghost'>
                {formatPlural(session.currentIndex + 1, "question")}
              </span>
              {isChecked ? (
                <span
                  className={`assessment-chip ${currentAnswer?.isCorrect ? "assessment-chip--success" : "assessment-chip--danger"}`}
                >
                  {currentAnswer?.isCorrect ? "Correct" : "Keep practicing"}
                </span>
              ) : null}
            </div>
            <p className='assessment-question__prompt'>{activeQuestion?.prompt}</p>
            <div className='assessment-options' role='group' aria-label='Answer choices'>
              {activeQuestion?.options?.map((option, index) => {
                const isSelected = selectedOptionId === option.id;
                const isCorrect = isChecked && option.id === activeQuestion.correctOptionId;
                const isIncorrect = isChecked && isSelected && !isCorrect;
                const letter = String.fromCharCode(65 + index);
                return (
                  <button
                    key={option.id}
                    type='button'
                    className={`assessment-option ${isSelected ? "is-selected" : ""} ${
                      isCorrect ? "is-correct" : ""
                    } ${isIncorrect ? "is-incorrect" : ""}`}
                    onClick={() => handleOptionSelect(option.id)}
                    aria-pressed={isSelected}
                    disabled={isChecked}
                  >
                    <span className='assessment-option__letter'>{letter}</span>
                    <span className='assessment-option__label'>{option.label}</span>
                    {isCorrect ? <i className='ph-bold ph-check-circle' aria-hidden='true' /> : null}
                    {isIncorrect ? <i className='ph-bold ph-x-circle' aria-hidden='true' /> : null}
                  </button>
                );
              })}
            </div>

            {flashMessage ? (
              <div
                className={`assessment-feedback ${
                  isChecked ? (currentAnswer?.isCorrect ? "is-correct" : "is-incorrect") : ""
                }`}
              >
                <i className='ph-bold ph-info' aria-hidden='true' />
                <div>
                  <p className='mb-2 fw-semibold text-neutral-800'>{isChecked ? (currentAnswer?.isCorrect ? "Nice job" : "Review") : "Heads up"}</p>
                  <p className='mb-0 text-neutral-600'>{flashMessage}</p>
                </div>
              </div>
            ) : null}

            {isChecked && activeQuestion?.explanation ? (
              <div className='assessment-explanation'>
                <p className='mb-0 text-neutral-700'>{activeQuestion.explanation}</p>
              </div>
            ) : null}
            {activeQuestion?.tryItTemplate ? (
              <div className='d-flex justify-content-start mb-12'>
                <button type='button' className='btn btn-outline-secondary btn-sm' onClick={openTryIt}>
                  Try it
                </button>
              </div>
            ) : null}

            <div className='assessment-actions'>
              <div className='d-flex flex-wrap gap-10'>
                <button
                  type='button'
                  className='btn btn-main'
                  onClick={handleCheckAnswer}
                  disabled={!selectedOptionId || isChecked}
                >
                  Check answer
                </button>
                <button
                  type='button'
                  className='btn btn-outline-primary'
                  onClick={handleNextQuestion}
                  disabled={!isChecked}
                >
                  {isLastQuestion ? "See result" : "Next question"}
                </button>
                <button type='button' className='btn btn-link text-neutral-600' onClick={handleRestart}>
                  Restart quiz
                </button>
              </div>
              <p className='mb-0 text-neutral-500 small'>
                Built for quick feedback. Answers do not leave your browser.
              </p>
            </div>
          </div>

          {session.status === "completed" ? (
            <div className='assessment-result'>
              <div>
                <p className='assessment-result__eyebrow mb-4'>Quiz complete</p>
                <h4 className='assessment-result__score mb-4'>
                  {score}/{totalQuestions} correct
                  <span className='assessment-result__badge'>{scorePercent}%</span>
                </h4>
                <p className='mb-0 text-neutral-600'>
                  {scorePercent >= 80
                    ? "Strong grasp! Consider moving to the next module."
                    : "Review the explanations above and retry to improve your score."}
                </p>
              </div>
              <div className='d-flex gap-8 flex-wrap'>
                <button type='button' className='btn btn-main rounded-pill' onClick={handleRestart}>
                  Retake quiz
                </button>
                <button
                  type='button'
                  className='btn btn-outline-primary rounded-pill'
                  onClick={() =>
                    setSession((prev) => ({
                      ...prev,
                      status: "in-progress",
                      currentIndex: 0,
                    }))
                  }
                >
                  Review from start
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className='assessment-sidebar'>
          <div className='assessment-sidebar__section'>
            <p className='assessment-sidebar__eyebrow mb-8'>Available sets</p>
            <div className='assessment-quiz-list'>
              {assessments.map((quiz) => {
                const isActive = quiz.id === activeQuizId;
                return (
                  <button
                    key={quiz.id}
                    type='button'
                    className={`assessment-quiz ${isActive ? "is-active" : ""}`}
                    onClick={() => handleSelectQuiz(quiz.id)}
                  >
                    <div>
                      <p className='assessment-quiz__title mb-4'>{quiz.title}</p>
                      <p className='assessment-quiz__meta mb-0'>
                        {formatPlural(quiz.questions?.length || 0, "question")} · {quiz.level}
                      </p>
                    </div>
                    <i className='ph-bold ph-caret-right' aria-hidden='true' />
                  </button>
                );
              })}
            </div>
          </div>

          <div className='assessment-sidebar__section'>
            <p className='assessment-sidebar__eyebrow mb-8'>From your modules</p>
            {upcomingFromModules.length ? (
              <ul className='assessment-upcoming'>
                {upcomingFromModules.map((item, idx) => (
                  <li key={`${item.moduleTitle}-${idx}`}>
                    <div>
                      <p className='mb-2 fw-semibold text-neutral-800'>{item.label}</p>
                      <p className='mb-0 text-neutral-600 small'>{item.moduleTitle}</p>
                    </div>
                    <span className='assessment-chip assessment-chip--ghost'>Upcoming</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className='mb-0 text-neutral-600'>Add quizzes to module sections to preview them here.</p>
            )}
          </div>

          <div className='assessment-sidebar__note'>
            <p className='mb-2 fw-semibold text-neutral-800'>Want more?</p>
            <p className='mb-0 text-neutral-600'>
              Extend <code>assessments.js</code> with course-specific questions. The UI will auto-pick them per slug.
            </p>
          </div>
        </aside>
      </div>
      {tryItOpen ? (
        <div className='assessment-tryit-modal' role='dialog' aria-modal='true' aria-label='Try code'>
          <div className='assessment-tryit-backdrop' onClick={() => setTryItOpen(false)} />
          <div className='assessment-tryit-body'>
            <div className='d-flex justify-content-between align-items-center mb-12'>
              <div>
                <p className='assessment-runner__eyebrow mb-2'>Interactive</p>
                <h5 className='mb-0'>{tryItTitle}</h5>
              </div>
              <button type='button' className='btn btn-sm btn-outline-secondary' onClick={() => setTryItOpen(false)}>
                Close
              </button>
            </div>
            <div className='assessment-tryit-grid'>
              <div className='assessment-tryit-editor'>
                <label className='form-label text-sm'>Code</label>
                <textarea
                  value={tryItCode}
                  onChange={(e) => setTryItCode(e.target.value)}
                  spellCheck='false'
                  className='form-control'
                  style={{ minHeight: 160, fontFamily: '"JetBrains Mono","Fira Code", monospace' }}
                />
                <div className='d-flex gap-8 mt-8'>
                  <button type='button' className='btn btn-main btn-sm' onClick={() => setTryItRunToken((t) => t + 1)}>
                    Run
                  </button>
                  <button
                    type='button'
                    className='btn btn-outline-secondary btn-sm'
                    onClick={() => {
                      setTryItCode(activeQuestion?.tryItTemplate || "");
                      setTryItRunToken((t) => t + 1);
                    }}
                  >
                    Reset to template
                  </button>
                </div>
              </div>
              <div className='assessment-tryit-preview'>
                <div className='assessment-tryit-preview-title'>Preview</div>
                <iframe
                  key={tryItRunToken}
                  title='Try it preview'
                  srcDoc={tryItSrcDoc}
                  sandbox='allow-scripts'
                  className='assessment-tryit-iframe'
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AssessmentPanel;
