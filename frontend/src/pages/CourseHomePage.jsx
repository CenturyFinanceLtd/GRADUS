import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import HeaderOne from "../components/HeaderOne";
import FooterOne from "../components/FooterOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../services/apiClient";

const NAV_SECTIONS = [
  { id: "info", label: "Course Info", slug: "course-info" },
  { id: "module", label: "Course Module", slug: "module" },
  { id: "resources", label: "Resources", slug: "resources" },
  { id: "notes", label: "Notes", slug: "notes" },
  { id: "assessments", label: "Assessments", slug: "assessments" },
  { id: "messages", label: "Messages", slug: "messages" },
  
  
];

const MODULE_SECTION_ID = "module";
const MODULE_SECTION_SLUG = "module";
const DEFAULT_SECTION_ID = "info";
const SECTION_SLUG_BY_ID = NAV_SECTIONS.reduce((acc, section) => {
  acc[section.id] = section.slug || section.id;
  return acc;
}, {});
const SECTION_ID_BY_SLUG = NAV_SECTIONS.reduce((acc, section) => {
  acc[(section.slug || section.id).toLowerCase()] = section.id;
  return acc;
}, {});

const resolveSectionFromSlug = (slug) => {
  if (!slug) {
    return DEFAULT_SECTION_ID;
  }
  const normalized = String(slug).toLowerCase();
  if (normalized === MODULE_SECTION_SLUG) {
    return MODULE_SECTION_ID;
  }
  return SECTION_ID_BY_SLUG[normalized] || DEFAULT_SECTION_ID;
};

const formatSlugText = (value = "") =>
  value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const resolveImageUrl = (input) => {
  if (!input) {
    return "";
  }
  if (typeof input === "string") {
    return input;
  }
  if (typeof input === "object") {
    return input.url || input.src || input.path || "";
  }
  return "";
};

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,|;|\u2022/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeLectureItems = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((entry) => {
      if (typeof entry === "string") {
        const title = entry.trim();
        return title ? { title, duration: "", type: "", lectureId: "" } : null;
      }
      if (entry && typeof entry === "object") {
        const title = String(entry.title || entry.name || entry.label || "").trim();
        const duration = String(entry.duration || entry.length || entry.time || "").trim();
        const type = String(entry.type || entry.category || "").trim();
        const lectureId = String(entry.lectureId || entry.id || entry._id || "").trim();
        const videoUrl =
          entry.videoUrl ||
          entry.videoURL ||
          entry.video?.url ||
          entry.url ||
          entry.src ||
          entry.link ||
          "";
        const poster =
          entry.poster ||
          entry.thumbnail ||
          entry.cover ||
          entry.preview ||
          entry.image ||
          entry.video?.poster ||
          "";
        if (!title) {
          return null;
        }
        return { title, duration, type, videoUrl, poster, lectureId };
      }
      return null;
    })
    .filter(Boolean);
};

const normalizeWeeklyStructureBlocks = (module, moduleIndex = 0) => {
  const source =
    module?.weeklyStructure ??
    module?.structure ??
    module?.schedule ??
    module?.weeksStructure ??
    [];
  const blocks = Array.isArray(source) ? source : source ? [source] : [];
  const moduleId = String(module?.moduleId || module?.id || `module-${moduleIndex + 1}`).trim();
  return blocks
    .map((entry, idx) => {
      if (!entry) {
        return null;
      }
      if (typeof entry === "string") {
        const title = entry.trim();
        return title
          ? {
              title,
              subtitle: "",
              summary: "",
              lectures: [],
              assignments: [],
              projects: [],
              quizzes: [],
              notes: [],
              sectionId: `${moduleId}-section-${idx + 1}`,
              moduleId,
            }
          : null;
      }
      if (typeof entry !== "object") {
        return null;
      }
      const title = String(entry.title || entry.heading || entry.label || "").trim();
      const subtitle = String(entry.subtitle || entry.tagline || entry.summary || "").trim();
      const summary = String(entry.summary || entry.description || "").trim();
      const sectionId =
        String(entry.sectionId || entry.id || entry.weekId || "").trim() ||
        `${moduleId}-section-${idx + 1}`;
      const lectures = normalizeLectureItems(entry.lectures || entry.items || entry.videos || []).map(
        (lecture, lectureIdx) => {
          const lectureId =
            String(lecture.lectureId || "").trim() || `${sectionId}-lecture-${lectureIdx + 1}`;
          return {
            ...lecture,
            lectureId,
            moduleId,
            sectionId,
          };
        }
      );
      const assignments = toArray(entry.assignments || entry.tasks || entry.homework);
      const projects = toArray(entry.projects || entry.activities);
      const quizzes = toArray(entry.quizzes || entry.tests);
      const notes = toArray(entry.notes || entry.resources);
      if (
        !title &&
        !subtitle &&
        !summary &&
        !lectures.length &&
        !assignments.length &&
        !projects.length &&
        !quizzes.length &&
        !notes.length
      ) {
        return null;
      }
      return {
        title: title || `Week ${idx + 1}`,
        subtitle,
        summary,
        lectures,
        assignments,
        projects,
        quizzes,
        notes,
        sectionId,
        moduleId,
      };
    })
    .filter(Boolean);
};

const formatVideoTime = (seconds) => {
  if (!Number.isFinite(seconds)) {
    return "00:00";
  }
  const rounded = Math.max(seconds, 0);
  const minutes = Math.floor(rounded / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(rounded % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${secs}`;
};

const DEFAULT_VIDEO_SRC = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const AUTOPLAY_STORAGE_KEY = "gradus-course-autoplay";
const VIDEO_COMPLETION_THRESHOLD = 0.9;

const CourseVideoPlaceholder = ({ banner }) => (
  <div className='course-video-banner'>
    <div
      className='course-video-banner__media'
      style={banner ? { backgroundImage: `url(${banner})` } : undefined}
    />
  </div>
);

const CourseVideoPlayer = ({
  src = DEFAULT_VIDEO_SRC,
  poster,
  title,
  subtitle,
  autoPlayToken = 0,
  onClose,
  autoPlayEnabled = true,
  onToggleAutoplay,
  qualityOptions = [],
  qualityPreference = "auto",
  onQualityChange,
  subtitleOptions = [],
  subtitlePreference = "off",
  onSubtitleChange,
  lectureMeta = null,
  resumePositionSeconds = 0,
  onProgress,
}) => {
  const playerRef = useRef(null);
  const videoRef = useRef(null);
  const settingsRef = useRef(null);
  const resumeTargetRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState("root");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const lastAutoPlayTokenRef = useRef(autoPlayToken);
  const applyResumePosition = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const target = resumeTargetRef.current;
    if (!target) {
      return;
    }
    const durationValue = video.duration || 0;
    if (!durationValue) {
      return;
    }
    const safeTarget = Math.min(target, Math.max(durationValue - 0.35, 0));
    if (Math.abs(video.currentTime - safeTarget) > 1) {
      video.currentTime = safeTarget;
    }
  }, []);
  const emitProgressEvent = useCallback(
    ({ currentTime: overrideTime, duration: overrideDuration, completed }) => {
      if (!lectureMeta?.lectureId || typeof onProgress !== "function") {
        return;
      }
      const video = videoRef.current;
      const effectiveDuration =
        overrideDuration ?? video?.duration ?? duration ?? 0;
      const effectiveTime =
        typeof overrideTime === "number" ? overrideTime : video?.currentTime || 0;
      const ratio = effectiveDuration > 0 ? Math.min(effectiveTime / effectiveDuration, 1) : 0;
      onProgress({
        lectureId: lectureMeta.lectureId,
        moduleId: lectureMeta.moduleId,
        sectionId: lectureMeta.sectionId,
        lectureTitle: lectureMeta.lectureTitle,
        videoUrl: lectureMeta.videoUrl || src,
        currentTime: effectiveTime,
        duration: effectiveDuration,
        completed:
          typeof completed === "boolean" ? completed : ratio >= VIDEO_COMPLETION_THRESHOLD,
      });
    },
    [lectureMeta, onProgress, duration, src]
  );

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    setDuration(video.duration || 0);
    video.volume = volume;
    video.playbackRate = playbackRate;
    applyResumePosition();
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (video.paused || video.ended) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    setCurrentTime(video.currentTime || 0);
    emitProgressEvent({});
  };

  const handleProgressChange = (event) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const nextTime = Number(event.target.value);
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleVolumeChange = (event) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const nextVolume = Number(event.target.value);
    video.volume = nextVolume;
    setVolume(nextVolume);
  };

  const handlePlaybackRateChange = (event) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const rate = Number(event.target.value);
    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
    }
    emitProgressEvent({ currentTime: duration || video?.duration || 0, completed: true });
  };

  const handleSkip = (amount) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const next = Math.min(Math.max(video.currentTime + amount, 0), video.duration || video.currentTime);
    video.currentTime = next;
    emitProgressEvent({ currentTime: next, duration: video.duration || duration || 0 });
  };

  const handleSettingsToggle = () => {
    setSettingsOpen((prev) => !prev);
    setSettingsView("root");
  };

  const handlePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) {
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else {
        await video.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch (error) {
      console.error("Unable to toggle Picture-in-Picture", error);
    }
  };

  const handleFullscreenToggle = async () => {
    const node = playerRef.current;
    if (!node) {
      return;
    }
    try {
      if (document.fullscreenElement === node) {
        await document.exitFullscreen();
      } else if (node.requestFullscreen) {
        await node.requestFullscreen();
      }
    } catch (error) {
      console.error("Unable to toggle fullscreen", error);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.pause();
    video.load();
    setIsPlaying(false);
    setCurrentTime(0);
  }, [src]);

  useEffect(() => {
    resumeTargetRef.current = Math.max(0, Number(resumePositionSeconds) || 0);
    if (resumeTargetRef.current > 0) {
      applyResumePosition();
    }
  }, [resumePositionSeconds, applyResumePosition, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.volume = volume;
  }, [volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (!autoPlayToken) {
      lastAutoPlayTokenRef.current = autoPlayToken;
      return;
    }
    if (lastAutoPlayTokenRef.current === autoPlayToken) {
      return;
    }
    lastAutoPlayTokenRef.current = autoPlayToken;
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const playPromise = video.play();
    if (playPromise?.then) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(true);
    }
  }, [autoPlayToken, src]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isSettingsOpen) {
        return;
      }
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target) &&
        !event.target.closest(".course-video-player__settings-btn")
      ) {
        setSettingsOpen(false);
        setSettingsView("root");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSettingsOpen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleLeavePiP = () => setIsPiP(false);
    document.addEventListener("leavepictureinpicture", handleLeavePiP);
    return () => document.removeEventListener("leavepictureinpicture", handleLeavePiP);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      return undefined;
    }
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video) {
        return;
      }
      emitProgressEvent({
        currentTime: video.currentTime || 0,
        duration: video.duration || duration || 0,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, emitProgressEvent, duration]);

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    if (typeof onClose === "function") {
      onClose();
    }
  };

  const qualityLabel =
    qualityOptions.find((option) => option.value === qualityPreference)?.label ||
    qualityOptions[0]?.label ||
    "Auto";
  const subtitleLabel =
    subtitleOptions.find((option) => option.value === subtitlePreference)?.label || "Off";

  const renderSettingsContent = () => {
    if (settingsView === "quality") {
      const options = qualityOptions.length ? qualityOptions : [{ value: "auto", label: "Auto" }];
      return (
        <div className='course-video-player__settings-panel'>
          <button
            type='button'
            className='course-video-player__settings-back'
            onClick={() => setSettingsView("root")}
          >
            <i className='ph-bold ph-caret-left' aria-hidden='true' /> Quality
          </button>
          <div className='course-video-player__settings-list'>
            {options.map((option) => {
              const isActive = option.value === qualityPreference;
              return (
                <button
                  type='button'
                  key={option.value}
                  className={`course-video-player__settings-item ${isActive ? "is-active" : ""}`}
                  onClick={() => {
                    onQualityChange?.(option.value);
                    setSettingsView("root");
                    setSettingsOpen(false);
                  }}
                >
                  <span>{option.label}</span>
                  {isActive ? <i className='ph-bold ph-check' aria-hidden='true' /> : null}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (settingsView === "speed") {
      const playbackOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];
      return (
        <div className='course-video-player__settings-panel'>
          <button
            type='button'
            className='course-video-player__settings-back'
            onClick={() => setSettingsView("root")}
          >
            <i className='ph-bold ph-caret-left' aria-hidden='true' /> Playback speed
          </button>
          <div className='course-video-player__settings-list'>
            {playbackOptions.map((rate) => (
              <button
                type='button'
                key={`speed-${rate}`}
                className={`course-video-player__settings-item ${playbackRate === rate ? "is-active" : ""}`}
                onClick={() => {
                  handlePlaybackRateChange({ target: { value: rate } });
                  setSettingsView("root");
                  setSettingsOpen(false);
                }}
              >
                <span>{rate === 1 ? "Normal" : `${rate}x`}</span>
                {playbackRate === rate ? <i className='ph-bold ph-check' aria-hidden='true' /> : null}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (settingsView === "subtitles") {
      return (
        <div className='course-video-player__settings-panel'>
          <button
            type='button'
            className='course-video-player__settings-back'
            onClick={() => setSettingsView("root")}
          >
            <i className='ph-bold ph-caret-left' aria-hidden='true' /> Subtitles
          </button>
          <div className='course-video-player__settings-list'>
            {(subtitleOptions.length ? subtitleOptions : [{ value: "off", label: "Off" }]).map((option) => (
              <button
                type='button'
                key={`subtitle-${option.value}`}
                className={`course-video-player__settings-item ${
                  subtitlePreference === option.value ? "is-active" : ""
                }`}
                onClick={() => {
                  onSubtitleChange?.(option.value);
                  setSettingsView("root");
                  setSettingsOpen(false);
                }}
              >
                <span>{option.label}</span>
                {subtitlePreference === option.value ? <i className='ph-bold ph-check' aria-hidden='true' /> : null}
              </button>
            ))}
            {subtitleOptions.length <= 1 ? (
              <div className='course-video-player__settings-note'>Subtitles not available for this video.</div>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div className='course-video-player__settings-panel'>
        <div className='course-video-player__settings-list'>
          <button
            type='button'
            className='course-video-player__settings-item'
            onClick={() => onToggleAutoplay?.(!autoPlayEnabled)}
            aria-pressed={autoPlayEnabled}
          >
            <div className='course-video-player__settings-row'>
              <span>Autoplay</span>
            </div>
            <span className={`course-video-player__switch ${autoPlayEnabled ? "is-on" : ""}`}>
              <span />
            </span>
          </button>
          <button
            type='button'
            className='course-video-player__settings-item'
            onClick={() => setSettingsView("quality")}
          >
            <div className='course-video-player__settings-row'>
              <span>Quality</span>
              <small>{qualityLabel}</small>
            </div>
            <i className='ph-bold ph-caret-right' aria-hidden='true' />
          </button>
          <button
            type='button'
            className='course-video-player__settings-item'
            onClick={() => setSettingsView("speed")}
          >
            <div className='course-video-player__settings-row'>
              <span>Playback speed</span>
              <small>{playbackRate === 1 ? "Normal" : `${playbackRate}x`}</small>
            </div>
            <i className='ph-bold ph-caret-right' aria-hidden='true' />
          </button>
          <button
            type='button'
            className='course-video-player__settings-item'
            onClick={() => setSettingsView("subtitles")}
          >
            <div className='course-video-player__settings-row'>
              <span>Subtitles</span>
              <small>{subtitleLabel}</small>
            </div>
            <i className='ph-bold ph-caret-right' aria-hidden='true' />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`course-video-player ${isFullscreen ? "is-fullscreen" : ""}`} ref={playerRef}>
      {onClose ? (
        <button type='button' className='course-video-player__close' onClick={handleClose} aria-label='Close player'>
          <i className='ph-bold ph-x' aria-hidden='true' />
        </button>
      ) : null}
      <div className='course-video-player__media' tabIndex={0}>
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
        <button
          type='button'
          className={`course-video-player__play ${isPlaying ? "is-hidden" : ""}`}
          onClick={togglePlay}
        >
          <i className={`ph-bold ${isPlaying ? "ph-pause" : "ph-play"}`} aria-hidden='true' />
        </button>
        {title ? (
          <div className='course-video-player__badge'>
            <i className='ph-bold ph-film-strip' aria-hidden='true' />
            <span>{title}</span>
          </div>
        ) : null}
        <div className='course-video-player__controls'>
          <button type='button' className='course-video-player__control-btn' onClick={togglePlay}>
            <i className={`ph-bold ${isPlaying ? "ph-pause" : "ph-play"}`} aria-hidden='true' />
          </button>
          <button type='button' className='course-video-player__control-btn' onClick={() => handleSkip(-10)}>
            <i className='ph-bold ph-arrow-counter-clockwise' aria-hidden='true' />
            <span className='sr-only'>Replay 10 seconds</span>
          </button>
          <span className='course-video-player__time'>{formatVideoTime(currentTime)}</span>
          <input
            type='range'
            min='0'
            max={duration || 0}
            step='0.1'
            value={currentTime}
            onChange={handleProgressChange}
            className='course-video-player__progress'
            aria-label='Seek video'
          />
          <span className='course-video-player__time'>{formatVideoTime(duration)}</span>
          <div className='course-video-player__volume'>
            <i className='ph-bold ph-speaker-high' aria-hidden='true' />
            <input
              type='range'
              min='0'
              max='1'
              step='0.05'
              value={volume}
              onChange={handleVolumeChange}
              aria-label='Adjust volume'
            />
          </div>
          <button
            type='button'
            className='course-video-player__settings-btn'
            aria-label='Settings'
            onClick={handleSettingsToggle}
          >
            <i className='ph-bold ph-gear' aria-hidden='true' />
          </button>
          <button type='button' className='course-video-player__settings-btn' onClick={handlePictureInPicture}>
            <i className={`ph-bold ${isPiP ? "ph-divider" : "ph-device-tablet-speaker"}`} aria-hidden='true' />
            <span className='sr-only'>Toggle picture-in-picture</span>
          </button>
          <button type='button' className='course-video-player__settings-btn' onClick={handleFullscreenToggle}>
            <i className={`ph-bold ${isFullscreen ? "ph-corners-in" : "ph-corners-out"}`} aria-hidden='true' />
            <span className='sr-only'>Toggle fullscreen</span>
          </button>
        </div>
        {title || subtitle ? (
          <div className='course-video-player__info'>
            {title ? <p className='course-video-player__info-title'>{title}</p> : null}
            {subtitle ? <p className='course-video-player__info-subtitle'>{subtitle}</p> : null}
          </div>
        ) : null}
        <div
          className={`course-video-player__settings ${isSettingsOpen ? "is-visible" : ""}`}
          ref={settingsRef}
          role='dialog'
          aria-hidden={!isSettingsOpen}
        >
          {renderSettingsContent()}
        </div>
      </div>
    </div>
  );
};

const deriveModuleOutcomes = (module) => {
  if (Array.isArray(module?.outcomes) && module.outcomes.length) {
    return module.outcomes.filter(Boolean);
  }
  if (module?.outcome) {
    return [module.outcome];
  }
  return [];
};

const normalizeModules = (courseData) => {
  if (!courseData) {
    return [];
  }

  if (Array.isArray(courseData.modules) && courseData.modules.length) {
    return courseData.modules.map((module, index) => {
      const topics = module?.topics?.length !== undefined ? module.topics : module?.points;
      const moduleId = module?.moduleId || module?.id || `module-${index + 1}`;
      return {
        moduleId,
        moduleLabel: module?.moduleLabel || `Module ${index + 1}`,
        title: module?.title || `Module ${index + 1}`,
        subtitle: module?.weeksLabel || module?.hours || "",
        topics: toArray(topics),
        outcome: module?.outcome || "",
        weeklyStructure: normalizeWeeklyStructureBlocks({ ...module, moduleId }, index),
        outcomes: deriveModuleOutcomes(module),
        resources: toArray(module?.resources),
        extras: module?.extras,
      };
    });
  }

  if (Array.isArray(courseData.weeks) && courseData.weeks.length) {
    return courseData.weeks.map((week, index) => ({
      title: week?.title || `Module ${index + 1}`,
      subtitle: week?.hours || "",
      topics: toArray(week?.points),
      outcome: "",
      weeklyStructure: [],
      outcomes: [],
      resources: [],
      extras: undefined,
    }));
  }

  return [];
};

const adaptDetailedModules = (detailModules = []) => {
  if (!Array.isArray(detailModules)) {
    return [];
  }
  return detailModules.map((module, index) => {
    const moduleId = module.moduleId || module.id || `module-${index + 1}`;
    const weeklyStructure = Array.isArray(module.sections)
      ? module.sections.map((section, sectionIndex) => {
          const sectionId = section.sectionId || section.id || `${moduleId}-section-${sectionIndex + 1}`;
          return {
            title: section.title || `Week ${sectionIndex + 1}`,
            subtitle: section.subtitle || "",
            summary: section.summary || "",
            sectionId,
            moduleId,
            lectures: Array.isArray(section.lectures)
              ? section.lectures.map((lecture, lectureIdx) => ({
                  lectureId: lecture.lectureId || lecture.id || `${sectionId}-lecture-${lectureIdx + 1}`,
                  moduleId,
                  sectionId,
                  title: lecture.title || "Lecture",
                  duration:
                    lecture.duration ||
                    (lecture.video?.duration
                      ? `${Math.max(1, Math.round(lecture.video.duration))} min`
                      : ""),
                  type: lecture.video?.url ? "Video" : lecture.type || "",
                  videoUrl:
                    lecture.video?.url ||
                    lecture.url ||
                    lecture.src ||
                    lecture.link ||
                    "",
                  poster:
                    lecture.poster ||
                    lecture.thumbnail ||
                    lecture.cover ||
                    lecture.video?.poster ||
                    lecture.video?.thumbnail ||
                    "",
                  subtitles: Array.isArray(lecture.subtitles) ? lecture.subtitles : lecture.captions || [],
                }))
              : [],
            assignments: Array.isArray(section.assignments) ? section.assignments : toArray(section.assignments),
            quizzes: Array.isArray(section.quizzes) ? section.quizzes : toArray(section.quizzes),
            projects: Array.isArray(section.projects) ? section.projects : toArray(section.projects),
            notes: Array.isArray(section.notes) ? section.notes : toArray(section.notes),
          };
        })
      : [];

    const extras =
      module.variant === "capstone" || module.capstone?.summary || module.capstone?.deliverables?.length
        ? {
            projectTitle: module.moduleLabel || module.title || `Module ${index + 1}`,
            projectDescription: module.capstone?.summary || module.summary || "",
            examples: module.capstone?.rubric || [],
            deliverables: module.capstone?.deliverables || [],
          }
        : undefined;

    return {
      moduleId,
      title: module.title || module.moduleLabel || `Module ${index + 1}`,
      subtitle: module.weeksLabel || module.subtitle || "",
      topics: Array.isArray(module.topicsCovered) ? module.topicsCovered : toArray(module.topicsCovered),
      outcome: module.summary || "",
      weeklyStructure,
      outcomes: Array.isArray(module.outcomes) ? module.outcomes : toArray(module.outcomes),
      resources: Array.isArray(module.resources) ? module.resources : toArray(module.resources),
      extras,
    };
  });
};

const buildOverviewFromCourse = (courseData = {}) => {
  const hero = courseData.hero || {};
  const stats = courseData.stats || {};
  const modules = normalizeModules(courseData);
  const aboutProgram =
    Array.isArray(courseData.aboutProgram) && courseData.aboutProgram.length
      ? courseData.aboutProgram
      : courseData.outcomeSummary
      ? [courseData.outcomeSummary]
      : [];
  const learn =
    Array.isArray(courseData.learn) && courseData.learn.length
      ? courseData.learn
      : Array.isArray(courseData.outcomes)
      ? courseData.outcomes
      : [];
  const skills = Array.isArray(courseData.skills) ? courseData.skills : [];
  const details = courseData.details || {};
  const capstone = courseData.capstone || {};
  const capstoneBullets = toArray(
    (Array.isArray(capstone.bullets) && capstone.bullets.length
      ? capstone.bullets
      : courseData.capstonePoints) || []
  );
  const careerOutcomes = toArray(courseData.careerOutcomes);
  const toolsFrameworks = toArray(courseData.toolsFrameworks);
  const instructors = Array.isArray(courseData.instructors)
    ? courseData.instructors
    : [];

  return {
    hero: {
      subtitle: courseData.subtitle || hero.subtitle || "",
      enrolledText: hero.enrolledText || "",
    },
    stats: {
      modules: modules.length || stats.modules || 0,
      mode: courseData.mode || stats.mode || "",
      level: courseData.level || stats.level || "",
      duration: courseData.duration || stats.duration || "",
    },
    aboutProgram,
    learn,
    skills,
    details: {
      effort: details.effort || "",
      language: details.language || "",
      prerequisites: details.prerequisites || "",
    },
    capstone: {
      summary: capstone.summary || courseData.focus || courseData.outcomeSummary || "",
      bullets: capstoneBullets,
    },
    careerOutcomes,
    toolsFrameworks,
    instructors,
    modules,
  };
};

const NotesIllustration = () => (
  <svg
    className='course-home-illustration'
    width='180'
    height='140'
    viewBox='0 0 180 140'
    role='img'
    aria-hidden='true'
  >
    <rect x='10' y='20' width='110' height='90' rx='12' fill='#E9F4FF' />
    <rect x='28' y='36' width='74' height='6' rx='3' fill='#B4D8FF' />
    <rect x='28' y='50' width='64' height='6' rx='3' fill='#B4D8FF' />
    <rect x='28' y='64' width='82' height='6' rx='3' fill='#B4D8FF' />
    <rect x='28' y='78' width='48' height='6' rx='3' fill='#B4D8FF' />
    <rect x='120' y='32' width='50' height='72' rx='10' fill='#D7F0DB' />
    <rect x='128' y='46' width='34' height='6' rx='3' fill='#8DD19A' />
    <rect x='128' y='60' width='34' height='6' rx='3' fill='#8DD19A' />
    <rect x='128' y='74' width='34' height='6' rx='3' fill='#8DD19A' />
    <path
      d='M68 96L84 116'
      stroke='#2D8CFF'
      strokeWidth='8'
      strokeLinecap='round'
    />
    <path
      d='M96 88L84 116'
      stroke='#FFBF3C'
      strokeWidth='8'
      strokeLinecap='round'
    />
  </svg>
);

const SectionPlaceholder = ({ title, description }) => (
  <div className='course-home-panel'>
    <div className='course-home-panel__header border-bottom pb-24 mb-32'>
      <div>
        <p className='course-home-panel__eyebrow mb-12'>{title}</p>
        <h2 className='course-home-panel__title'>{title}</h2>
      </div>
    </div>
    <p className='text-neutral-600 mb-0'>{description}</p>
  </div>
);

const CourseHomePage = () => {
  const { programme, course, section: sectionSlugParam, subSection: sectionDetailParam } =
    useParams();
  const { token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const sectionFromUrl = useMemo(
    () => resolveSectionFromSlug(sectionSlugParam),
    [sectionSlugParam]
  );
  const [state, setState] = useState({ loading: true, error: null, course: null, overview: null });
  const [detailState, setDetailState] = useState({ loading: false, error: null, modules: [] });
  const [activeSection, setActiveSection] = useState(sectionFromUrl);
  const [lastModuleIndex, setLastModuleIndex] = useState(0);
  const [isModuleDropdownOpen, setModuleDropdownOpen] = useState(false);
  const baseModules = useMemo(() => normalizeModules(state.course), [state.course]);
  const modules = detailState.modules.length ? detailState.modules : baseModules;
  const moduleSelectorRef = useRef(null);
  const [progressState, setProgressState] = useState({ loading: false, data: {} });
  const [currentLectureMeta, setCurrentLectureMeta] = useState(null);
  const [resumePositionSeconds, setResumePositionSeconds] = useState(0);
  const progressUpdateRef = useRef({});
  const moduleIndexFromUrl = useMemo(() => {
    if (sectionFromUrl !== MODULE_SECTION_ID) {
      return null;
    }
    const parsed = Number(sectionDetailParam);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return 0;
    }
    return parsed - 1;
  }, [sectionFromUrl, sectionDetailParam]);

  useEffect(() => {
    setActiveSection(sectionFromUrl);
  }, [sectionFromUrl]);

  useEffect(() => {
    if (!token || !programme || !course) {
      setProgressState({ loading: false, data: {} });
      return;
    }
    let cancelled = false;
    const loadProgress = async () => {
      setProgressState((prev) => ({ ...prev, loading: true }));
      try {
        const response = await fetch(
          `${API_BASE_URL}/courses/${encodeURIComponent(programme)}/${encodeURIComponent(course)}/progress`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          }
        );
        if (!response.ok) {
          throw new Error("Unable to load progress");
        }
        const payload = await response.json();
        if (!cancelled) {
          setProgressState({ loading: false, data: payload.progress || {} });
        }
      } catch (error) {
        if (!cancelled) {
          setProgressState((prev) => ({ ...prev, loading: false }));
        }
      }
    };
    loadProgress();
    return () => {
      cancelled = true;
    };
  }, [programme, course, token]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moduleSelectorRef.current && !moduleSelectorRef.current.contains(event.target)) {
        setModuleDropdownOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setModuleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    setModuleDropdownOpen(false);
  }, [sectionFromUrl, moduleIndexFromUrl]);

  useEffect(() => {
    if (!programme || !course || sectionFromUrl === MODULE_SECTION_ID) {
      return;
    }
    const expectedSlug =
      SECTION_SLUG_BY_ID[sectionFromUrl] || SECTION_SLUG_BY_ID[DEFAULT_SECTION_ID];
    const normalizedSlug = sectionSlugParam ? sectionSlugParam.toLowerCase() : "";
    const hasValidSlug = Boolean(normalizedSlug && SECTION_ID_BY_SLUG[normalizedSlug]);
    if (sectionSlugParam !== expectedSlug) {
      navigate(`/${programme}/${course}/home/${expectedSlug}`, {
        replace: !sectionSlugParam || !hasValidSlug,
      });
    }
  }, [programme, course, sectionSlugParam, sectionFromUrl, navigate]);

  useEffect(() => {
    if (sectionFromUrl !== MODULE_SECTION_ID) {
      return;
    }
    if (!programme || !course || !modules.length) {
      return;
    }
    const safeIndex = Math.min(
      Math.max(moduleIndexFromUrl ?? 0, 0),
      Math.max(modules.length - 1, 0)
    );
    const canonicalDetail = String(safeIndex + 1);
    if (sectionDetailParam !== canonicalDetail) {
      navigate(`/${programme}/${course}/home/${MODULE_SECTION_SLUG}/${canonicalDetail}`, {
        replace: true,
      });
    }
  }, [
    sectionFromUrl,
    moduleIndexFromUrl,
    modules.length,
    sectionDetailParam,
    programme,
    course,
    navigate,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (!programme || !course || authLoading) {
      return undefined;
    }

    const loadCourse = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const headers = new Headers();
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        const response = await fetch(
          `${API_BASE_URL}/courses/${encodeURIComponent(programme)}/${encodeURIComponent(course)}`,
          {
            credentials: "include",
            headers,
          }
        );
        if (!response.ok) {
          throw new Error(`Unable to load course (HTTP ${response.status})`);
        }
        const payload = await response.json();
        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            course: payload?.course || null,
            overview: buildOverviewFromCourse(payload?.course || {}),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error?.message || "Unable to load the course at this moment.",
            course: null,
            overview: null,
          });
        }
      }
    };

    loadCourse();
    return () => {
      cancelled = true;
    };
  }, [programme, course, token, authLoading]);

  useEffect(() => {
    let cancelled = false;
    const loadModuleDetail = async () => {
      if (!programme || !course) {
        setDetailState((prev) => ({ ...prev, modules: [] }));
        return;
      }
      setDetailState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const headers = new Headers();
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        const response = await fetch(
          `${API_BASE_URL}/courses/${encodeURIComponent(programme)}/${encodeURIComponent(
            course
          )}/modules/detail`,
          {
            credentials: "include",
            headers,
          }
        );
        if (!response.ok) {
          throw new Error(`Unable to load module detail (HTTP ${response.status})`);
        }
        const payload = await response.json();
        if (!cancelled) {
          setDetailState({
            loading: false,
            error: null,
            modules: adaptDetailedModules(payload?.modules || []),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setDetailState({
            loading: false,
            error: error?.message || "Unable to load module detail.",
            modules: [],
          });
        }
      }
    };
    loadModuleDetail();
    return () => {
      cancelled = true;
    };
  }, [programme, course, token]);

  useEffect(() => {
    if (!currentLectureMeta?.lectureId) {
      setResumePositionSeconds(0);
      return;
    }
    const latest = progressState.data[currentLectureMeta.lectureId];
    if (latest) {
      setResumePositionSeconds(latest.lastPositionSeconds || 0);
    } else {
      setResumePositionSeconds(0);
    }
  }, [progressState, currentLectureMeta]);







  useEffect(() => {
    if (!modules.length) return;
    if (sectionFromUrl === MODULE_SECTION_ID) {
      const safeIndex = Math.min(
        Math.max(moduleIndexFromUrl ?? 0, 0),
        Math.max(modules.length - 1, 0)
      );
      setLastModuleIndex(safeIndex);
    }
  }, [modules.length, sectionFromUrl, moduleIndexFromUrl]);



  const programmeSlug = (programme || "").trim().toLowerCase();
  const prettyProgrammeName = useMemo(
    () => formatSlugText(programmeSlug),
    [programmeSlug]
  );
  const prettyCourseName = useMemo(
    () => state.course?.name || formatSlugText(course || ""),
    [state.course?.name, course]
  );
  const programmeTitle = prettyProgrammeName || "Programme";
  const introVideoSrc =
    state.course?.introVideoUrl ||
    state.course?.previewVideo ||
    state.course?.overviewVideo ||
    state.course?.videoUrl ||
    DEFAULT_VIDEO_SRC;
  const courseBannerUrl =
    resolveImageUrl(state.course?.media?.banner) ||
    resolveImageUrl(state.course?.heroImage) ||
    resolveImageUrl(state.course?.bannerImage) ||
    resolveImageUrl(state.course?.thumbnail) ||
    resolveImageUrl(state.course?.image) ||
    "";
  const introVideoPoster = courseBannerUrl || null;
  const defaultVideoMeta = useMemo(
    () => ({
      src: introVideoSrc || DEFAULT_VIDEO_SRC,
      poster: introVideoPoster,
      title: prettyCourseName ? `${prettyCourseName} overview` : "Course Overview",
      subtitle: programmeTitle,
      meta: null,
    }),
    [introVideoSrc, introVideoPoster, prettyCourseName, programmeTitle]
  );
  const [activeVideo, setActiveVideo] = useState(null);
  const [videoAutoPlayToken, setVideoAutoPlayToken] = useState(0);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    const stored = window.localStorage.getItem(AUTOPLAY_STORAGE_KEY);
    if (stored === null) {
      return true;
    }
    return stored !== "false";
  });
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(AUTOPLAY_STORAGE_KEY, autoPlayEnabled ? "true" : "false");
  }, [autoPlayEnabled]);
  const derivedQualityOptions = useMemo(() => {
    const fromCourse = Array.isArray(state.course?.media?.qualities)
      ? state.course.media.qualities
          .map((entry) => {
            if (!entry) {
              return null;
            }
            if (typeof entry === "string") {
              return { value: entry.toLowerCase(), label: entry };
            }
            if (typeof entry === "object") {
              const value = String(entry.value || entry.label || "")
                .trim()
                .toLowerCase();
              const label = entry.label || entry.value || entry.display || "";
              return value ? { value, label } : null;
            }
            return null;
          })
          .filter(Boolean)
      : [];
    const defaults =
      fromCourse.length > 0
        ? fromCourse
        : [
            { value: "auto", label: "Auto" },
            { value: "1080p", label: "1080p" },
            { value: "720p", label: "720p" },
            { value: "480p", label: "480p" },
          ];
    if (!defaults.find((opt) => opt.value === "auto")) {
      return [{ value: "auto", label: "Auto" }, ...defaults];
    }
    return defaults;
  }, [state.course?.media?.qualities]);
  const subtitleOptions = useMemo(() => {
    const languages = Array.isArray(state.course?.media?.subtitles)
      ? state.course.media.subtitles
          .map((entry) => {
            if (!entry) {
              return null;
            }
            if (typeof entry === "string") {
              const value = entry.trim().toLowerCase();
              return value ? { value, label: entry } : null;
            }
            if (typeof entry === "object") {
              const value = String(entry.value || entry.code || entry.language || "")
                .trim()
                .toLowerCase();
              const label = entry.label || entry.name || entry.language || entry.value || "";
              return value ? { value, label } : null;
            }
            return null;
          })
          .filter(Boolean)
      : [];
    return [{ value: "off", label: "Off" }, ...languages];
  }, [state.course?.media?.subtitles]);
  const [qualityPreference, setQualityPreference] = useState("auto");
  const [subtitlePreference, setSubtitlePreference] = useState("off");

  const isEnrolled = Boolean(state.course?.isEnrolled);
  const handleSectionChange = (nextSectionId) => {
    const normalizedSection =
      NAV_SECTIONS.find((section) => section.id === nextSectionId)?.id || DEFAULT_SECTION_ID;
    const slug =
      SECTION_SLUG_BY_ID[normalizedSection] || SECTION_SLUG_BY_ID[DEFAULT_SECTION_ID];
    setActiveSection(normalizedSection);
    navigate(`/${programme}/${course}/home/${slug}`);
  };
  const handleModuleClick = (moduleIndex) => {
    if (!modules.length) {
      return;
    }
    const safeIndex = Math.min(Math.max(moduleIndex, 0), modules.length - 1);
    setActiveSection(MODULE_SECTION_ID);
    navigate(`/${programme}/${course}/home/${MODULE_SECTION_SLUG}/${safeIndex + 1}`);
    setLastModuleIndex(safeIndex);
  };
  const handleModuleKeyDown = (event, moduleIndex) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleModuleClick(moduleIndex);
    }
  };
  const syncProgressWithServer = useCallback(
    async ({ lectureId, moduleId, sectionId, lectureTitle, videoUrl, currentTime, duration }) => {
      if (!token || !programme || !course || !lectureId) {
        return;
      }
      try {
        const response = await fetch(
          `${API_BASE_URL}/courses/${encodeURIComponent(programme)}/${encodeURIComponent(course)}/progress`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
            body: JSON.stringify({
              lectureId,
              moduleId,
              sectionId,
              lectureTitle,
              videoUrl,
              currentTime,
              duration,
            }),
          }
        );
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        if (payload?.progress?.lectureId) {
          setProgressState((prev) => ({
            loading: prev.loading,
            data: { ...prev.data, [payload.progress.lectureId]: payload.progress },
          }));
        }
      } catch (error) {
        // Silently ignore network errors for progress syncing
      }
    },
    [programme, course, token]
  );

  const handlePlayerProgress = useCallback(
    ({ currentTime, duration, completed }) => {
      if (!token || !currentLectureMeta?.lectureId) {
        return;
      }
      const lectureId = currentLectureMeta.lectureId;
      const tracker = progressUpdateRef.current[lectureId] || { time: 0, position: 0 };
      const now = Date.now();
      const shouldSend =
        completed || now - tracker.time > 5000 || Math.abs(currentTime - tracker.position) >= 5;
      if (!shouldSend) {
        return;
      }
      progressUpdateRef.current[lectureId] = { time: now, position: currentTime };
      syncProgressWithServer({
        lectureId,
        moduleId: currentLectureMeta.moduleId,
        sectionId: currentLectureMeta.sectionId,
        lectureTitle: currentLectureMeta.lectureTitle,
        videoUrl: currentLectureMeta.videoUrl || activeVideo?.src || "",
        currentTime,
        duration,
      });
    },
    [token, currentLectureMeta, syncProgressWithServer, activeVideo?.src]
  );
  const handleAutoplayToggle = (nextValue) => {
    setAutoPlayEnabled((prev) =>
      typeof nextValue === "boolean" ? nextValue : !prev
    );
  };

  const handleLecturePlay = (lecture, meta = {}) => {
    if (!lecture?.videoUrl) {
      return;
    }
    const lectureId =
      lecture.lectureId ||
      meta.lectureId ||
      `${meta.moduleId || "module"}-${meta.sectionId || meta.weekIndex || 0}-${meta.lectureIndex || 0}`;
    const subtitleParts = [];
    if (meta.moduleTitle) {
      subtitleParts.push(meta.moduleTitle);
    }
    if (meta.weekTitle) {
      subtitleParts.push(meta.weekTitle);
    }
    const subtitle = subtitleParts.length ? subtitleParts.join(" - ") : defaultVideoMeta.subtitle;
    setActiveVideo({
      src: lecture.videoUrl,
      poster: lecture.poster || meta.poster || introVideoPoster || defaultVideoMeta.poster,
      title: lecture.title || "Lecture",
      subtitle,
      meta: { ...meta, lectureId, subtitles: lecture.subtitles || lecture.captions || [] },
    });
    setCurrentLectureMeta({
      lectureId,
      moduleId: meta.moduleId,
      sectionId: meta.sectionId,
      lectureTitle: lecture.title || "Lecture",
      moduleTitle: meta.moduleTitle,
      weekTitle: meta.weekTitle,
      videoUrl: lecture.videoUrl,
    });
    const resumeSeconds =
      lectureId && progressState.data[lectureId]
        ? progressState.data[lectureId].lastPositionSeconds || 0
        : 0;
    setResumePositionSeconds(resumeSeconds);
    if (autoPlayEnabled) {
      setVideoAutoPlayToken((token) => token + 1);
    }
  };
  const toggleModuleDropdown = () => {
    if (!modules.length) {
      return;
    }
    setModuleDropdownOpen((prev) => !prev);
  };
  const handleModuleSelectFromDropdown = (moduleIndex) => {
    handleModuleClick(moduleIndex);
    setModuleDropdownOpen(false);
  };
  const handleModuleSelectorKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isModuleDropdownOpen) {
        setModuleDropdownOpen(true);
      }
    }
  };

  const renderModuleDetail = () => {
    if (!modules.length) {
      return (
        <div className='course-home-panel'>
          <p className='text-neutral-600 mb-0'>Module details will be available soon.</p>
        </div>
      );
    }
    const safeIndex = Math.min(Math.max(moduleIndexFromUrl ?? 0, 0), modules.length - 1);
    const module = modules[safeIndex];
    const weeklyStructure = Array.isArray(module.weeklyStructure) ? module.weeklyStructure : [];
    const totalLectures = weeklyStructure.reduce(
      (count, week) => count + (week.lectures?.length || 0),
      0
    );
    const totalAssignments = weeklyStructure.reduce(
      (count, week) => count + (week.assignments?.length || 0),
      0
    );
    const isCapstoneModule = module.extras || module.variant === "capstone";
    const moduleOutcomes =
      Array.isArray(module.outcomes) && module.outcomes.length
        ? module.outcomes
        : module.outcome
        ? [module.outcome]
        : [];
    const resources = Array.isArray(module.resources) ? module.resources : [];
    const extras = module.extras;
    const hasTopics = Array.isArray(module.topics) && module.topics.length;

    const renderWeekBulletGroup = (title, items, iconClass = "ph-check-circle") => {
      if (!items?.length) {
        return null;
      }
      return (
        <div className='course-module-week__group'>
          <p className='course-module-week__group-title'>{title}</p>
          <ul className='course-module-week__list course-module-week__list--bullets'>
            {items.map((item, idx) => (
              <li key={`${title}-${idx}`}>
                <i className={`ph-bold ${iconClass} text-main-500`} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    };

    return (
        <div className='course-home-panel course-info-panel module-detail-panel'>
          <div className='course-home-panel__header mb-24 course-module-header'>
            <div>
              <div
                className={`course-module-selector ${isModuleDropdownOpen ? "is-open" : ""}`}
                ref={moduleSelectorRef}
              >
                <button
                  type='button'
                  id='module-selector'
                  className='course-module-selector__trigger'
                  aria-haspopup='listbox'
                  aria-expanded={isModuleDropdownOpen}
                  aria-controls='module-selector-list'
                  onClick={toggleModuleDropdown}
                  onKeyDown={handleModuleSelectorKeyDown}
                >
                  <span className='course-module-selector__current'>
                    Module {safeIndex + 1}: {module.title}
                  </span>
                  <i className='ph-bold ph-caret-down' aria-hidden='true' />
                </button>
                <div
                  className='course-module-selector__list-wrap'
                  aria-hidden={!isModuleDropdownOpen}
                >
                  <ul
                    id='module-selector-list'
                    className='course-module-selector__list'
                    role='listbox'
                    aria-activedescendant={`module-option-${safeIndex}`}
                  >
                    {modules.map((m, idx) => {
                      const optionId = `module-option-${idx}`;
                      const isActive = idx === safeIndex;
                      return (
                        <li key={optionId}>
                          <button
                            type='button'
                            id={optionId}
                            role='option'
                            aria-selected={isActive}
                            className={`course-module-selector__option ${
                              isActive ? "is-active" : ""
                            }`}
                            tabIndex={isModuleDropdownOpen ? 0 : -1}
                            onClick={() => handleModuleSelectFromDropdown(idx)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleModuleSelectFromDropdown(idx);
                              }
                            }}
                          >
                            <div className='course-module-selector__option-text'>
                              <span className='course-module-selector__option-title'>
                                Module {idx + 1}: {m.title}
                              </span>
                              {m.subtitle ? (
                                <span className='course-module-selector__option-subtitle'>
                                  {m.subtitle}
                                </span>
                              ) : null}
                            </div>
                            {isActive ? (
                              <i className='ph-bold ph-check-circle' aria-hidden='true' />
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
              <h2 className='course-home-panel__title mb-0'>{module.title}</h2>
              {module.summary ? <p className='module-summary text-neutral-600 mb-0'>{module.summary}</p> : null}
            </div>
            <div className='course-module-meta'>
            {module.subtitle ? <span className='course-module-pill'>{module.subtitle}</span> : null}
            {totalLectures ? (
              <span className='course-module-pill'>
                <i className='ph-bold ph-play-circle' /> {totalLectures} lectures
              </span>
            ) : null}
            {totalAssignments ? (
              <span className='course-module-pill'>
                <i className='ph-bold ph-checks' /> {totalAssignments} assignments
              </span>
            ) : null}
            {isCapstoneModule ? (
              <span className='course-module-pill pill-accent'>
                <i className='ph-bold ph-star' /> Capstone
              </span>
            ) : null}
          </div>
        </div>
        {hasTopics ? (
          <div className='course-info-section module-topics'>
            <h3 className='course-info-section__title'>Topics covered</h3>
            <ul className='module-topic-list'>
              {module.topics.map((topic, idx) => (
                <li key={`module-detail-${safeIndex}-topic-${idx}`}>
                  <i className='ph-bold ph-circle-wavy-check text-main-500' />
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {!hasTopics && !weeklyStructure.length ? (
          <p className='text-neutral-600 mb-0'>Detailed topics for this module will be added soon.</p>
        ) : null}

        {weeklyStructure.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Weekly structure</h3>
            <div className='course-module-weeks'>
              {weeklyStructure.map((week, weekIdx) => (
                <div key={`module-${safeIndex}-week-${weekIdx}`} className='course-module-week'>
                  <div className='course-module-week__header'>
                    <div>
                      <p className='course-module-week__title'>{week.title || `Week ${weekIdx + 1}`}</p>
                      {week.subtitle ? (
                        <span className='course-module-week__subtitle'>{week.subtitle}</span>
                      ) : null}
                    </div>
                    {week.summary ? <p className='text-neutral-600 mb-0'>{week.summary}</p> : null}
                  </div>
                  {week.lectures?.length ? (
                    <div className='course-module-week__group'>
                      <p className='course-module-week__group-title'>Lectures</p>
                      <ul className='course-module-week__list course-module-week__list--lectures'>
                        {week.lectures.map((lecture, lectureIdx) => {
                          const lectureKey = `module-${safeIndex}-week-${weekIdx}-lecture-${lectureIdx}`;
                          const isPlayable = Boolean(lecture.videoUrl);
                          const lectureMeta = {
                            moduleTitle: module.title || `Module ${safeIndex + 1}`,
                            weekTitle: week.title || `Week ${weekIdx + 1}`,
                            moduleIndex: safeIndex,
                            weekIndex: weekIdx,
                            lectureIndex: lectureIdx,
                            poster: lecture.poster,
                            moduleId: module.moduleId,
                            sectionId: week.sectionId,
                            lectureId: lecture.lectureId,
                            lectureTitle: lecture.title,
                            videoUrl: lecture.videoUrl,
                          };
                          const lectureProgress =
                            lecture.lectureId && progressState.data[lecture.lectureId]
                              ? progressState.data[lecture.lectureId]
                              : null;
                          const completionRatio = lectureProgress?.completionRatio || 0;
                          const isCompleted =
                            Boolean(lectureProgress?.completedAt) ||
                            completionRatio >= VIDEO_COMPLETION_THRESHOLD;
                          const isActiveLecture =
                            activeVideo?.meta &&
                            activeVideo.meta.moduleIndex === safeIndex &&
                            activeVideo.meta.weekIndex === weekIdx &&
                            activeVideo.meta.lectureIndex === lectureIdx;
                          return (
                            <li key={lectureKey}>
                              <button
                                type='button'
                                className={`course-module-week__lecture-button ${
                                  isPlayable ? "is-playable" : ""
                                } ${isActiveLecture ? "is-active" : ""}`}
                                onClick={() => handleLecturePlay(lecture, lectureMeta)}
                                disabled={!isPlayable}
                                aria-label={
                                  isPlayable
                                    ? isCompleted
                                      ? `${lecture.title} completed`
                                      : `Play ${lecture.title}`
                                    : `${lecture.title} video unavailable`
                                }
                              >
                                <span
                                  className={`course-module-week__completion ${
                                    isCompleted ? "is-completed" : ""
                                  }`}
                                  aria-hidden='true'
                                >
                                  {isCompleted ? <i className='ph-bold ph-check' /> : null}
                                </span>
                                <div className='course-module-week__lecture-info'>
                                  <span className='course-module-week__lecture-title'>
                                    {lecture.type ? (
                                      <span className='course-module-week__lecture-type'>
                                        {lecture.type === "Video" ? (
                                          <>
                                            <i className='ph-bold ph-play-circle' aria-hidden='true' />
                                            <span className='sr-only'>Video</span>
                                          </>
                                        ) : (
                                          <span className='course-module-week__lecture-type-text'>
                                            {lecture.type}
                                          </span>
                                        )}
                                      </span>
                                    ) : null}
                                    {lecture.title}
                                  </span>
                                  <span
                                    className={`course-module-week__prompt ${
                                      !isPlayable
                                        ? "is-muted"
                                        : isCompleted && !isActiveLecture
                                        ? "is-completed"
                                        : ""
                                    }`}
                                  >
                                    {!isPlayable
                                      ? "Video unavailable"
                                      : isActiveLecture
                                      ? "Now playing"
                                      : isCompleted
                                      ? "Completed"
                                      : "Play in player"}
                                  </span>
                                </div>
                                {lecture.duration ? (
                                  <span className='course-module-week__badge'>{lecture.duration}</span>
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                  {renderWeekBulletGroup("Assignments", week.assignments, "ph-pencil-simple")}
                  {renderWeekBulletGroup("Quizzes", week.quizzes, "ph-list-checks")}
                  {renderWeekBulletGroup("Projects & practice", week.projects, "ph-flask")}
                  {renderWeekBulletGroup("Notes & resources", week.notes, "ph-book-open")} 
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {moduleOutcomes.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Outcomes</h3>
            <ul className='course-info-list'>
              {moduleOutcomes.map((item, idx) => (
                <li key={`module-outcome-${idx}`}>
                  <i className='ph-bold ph-target text-main-500' />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {extras && (extras.projectTitle || extras.projectDescription || extras.examples?.length || extras.deliverables?.length) ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>{extras.projectTitle || "Projects & deliverables"}</h3>
            {extras.projectDescription ? (
              <p className='text-neutral-600 mb-12'>{extras.projectDescription}</p>
            ) : null}
            {extras.examples?.length ? renderWeekBulletGroup("Example projects", extras.examples, "ph-check") : null}
            {extras.deliverables?.length
              ? renderWeekBulletGroup("Deliverables", extras.deliverables, "ph-package")
              : null}
          </div>
        ) : null}

        {resources.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Recommended resources</h3>
            <div className='course-info-chips'>
              {resources.map((item, idx) => (
                <span key={`module-resource-${idx}`} className='course-info-chip'>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderCourseInfo = () => {
    const info = state.overview;
    if (!info) {
      return (
        <div className='course-home-panel'>
          <p className='text-neutral-600 mb-0'>Course info will be available soon.</p>
        </div>
      );
    }

    const statsCards = [
      info.stats?.modules ? { label: "Modules included", value: `${info.stats.modules}` } : null,
      info.stats?.mode ? { label: "Mode", value: info.stats.mode } : null,
      info.stats?.level ? { label: "Level", value: info.stats.level } : null,
      info.stats?.duration ? { label: "Duration", value: info.stats.duration } : null,
    ].filter(Boolean);

    const detailCards = [
      info.details?.effort ? { label: "Effort", value: info.details.effort } : null,
      info.details?.language ? { label: "Language", value: info.details.language } : null,
      info.details?.prerequisites
        ? { label: "Prerequisites", value: info.details.prerequisites }
        : null,
    ].filter(Boolean);

    return (
      <div className='course-home-panel course-info-panel'>
        <div className='course-home-panel__header mb-24'>
          <div>
            <p className='course-home-panel__eyebrow mb-8'>Course Info</p>
            <h2 className='course-home-panel__title mb-0'>Course Info</h2>
          </div>
        </div>

        {statsCards.length ? (
          <div className='course-info-grid mb-32'>
            {statsCards.map((card, idx) => (
              <div key={`stat-${idx}`} className='course-info-card'>
                <p className='course-info-card__label'>{card.label}</p>
                <p className='course-info-card__value'>{card.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {info.aboutProgram?.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>About the Program</h3>
            <div className='d-grid gap-12'>
              {info.aboutProgram.map((paragraph, idx) => (
                <p key={`about-${idx}`} className='text-neutral-600 mb-0'>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {info.learn?.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>What you'll learn</h3>
            <ul className='course-info-list'>
              {info.learn.map((item, idx) => (
                <li key={`learn-${idx}`}>
                  <i className='ph-bold ph-check-circle text-main-500' />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {info.skills?.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Skills you'll gain</h3>
            <div className='course-info-chips'>
              {info.skills.map((skill, idx) => (
                <span key={`skill-${idx}`} className='course-info-chip'>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {detailCards.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Course details</h3>
            <div className='course-info-grid'>
              {detailCards.map((card, idx) => (
                <div key={`detail-${idx}`} className='course-info-card'>
                  <p className='course-info-card__label'>{card.label}</p>
                  <p className='course-info-card__value'>{card.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {info.modules?.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Module breakdown</h3>
            <div className='course-info-modules'>
              {info.modules.map((module, idx) => (
                <div key={`module-${idx}`} className='course-info-module'>
                  <div className='d-flex justify-content-between flex-wrap gap-8 mb-12'>
                    <div>
                      <p className='course-info-module__eyebrow'>Module {idx + 1}</p>
                      <h4 className='course-info-module__title'>{module.title}</h4>
                    </div>
                    {module.subtitle ? (
                      <span className='course-info-module__meta'>{module.subtitle}</span>
                    ) : null}
                  </div>
                  {module.topics?.length ? (
                    <ul className='course-info-list course-info-list--compact'>
                      {module.topics.map((topic, topicIdx) => (
                        <li key={`module-${idx}-topic-${topicIdx}`}>
                          <i className='ph-bold ph-caret-right text-main-500' />
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {info.capstone?.summary || (info.capstone?.bullets || []).length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Capstone outcome</h3>
            {info.capstone?.summary ? (
              <p className='text-neutral-600 mb-16'>{info.capstone.summary}</p>
            ) : null}
            {(info.capstone?.bullets || []).length ? (
              <ul className='course-info-list'>
                {info.capstone.bullets.map((item, idx) => (
                  <li key={`capstone-${idx}`}>
                    <i className='ph-bold ph-target text-main-500' />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {info.careerOutcomes?.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Career outcomes</h3>
            <ul className='course-info-list'>
              {info.careerOutcomes.map((item, idx) => (
                <li key={`career-${idx}`}>
                  <i className='ph-bold ph-briefcase text-main-500' />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {info.toolsFrameworks?.length ? (
          <div className='course-info-section'>
            <h3 className='course-info-section__title'>Tools &amp; frameworks</h3>
            <div className='course-info-chips'>
              {info.toolsFrameworks.map((tool, idx) => (
                <span key={`tool-${idx}`} className='course-info-chip'>
                  {tool}
                </span>
              ))}
            </div>
          </div>
        ) : null}

      </div>
    );
  };

  const renderMainContent = () => {
    if (state.loading) {
      return (
        <div className='course-home-panel'>
          <p className='text-neutral-600 mb-0'>Loading your course workspace...</p>
        </div>
      );
    }

    if (state.error) {
      return (
        <div className='course-home-panel text-center'>
          <p className='text-danger-600 mb-16'>{state.error}</p>
          <button
            type='button'
            className='btn btn-main rounded-pill px-32'
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      );
    }

    if (!isEnrolled) {
      return (
        <div className='course-home-panel text-center'>
          <p className='text-neutral-800 fw-semibold mb-12'>
            You need to enroll in this course to access the workspace.
          </p>
          <p className='text-neutral-600 mb-24'>
            Complete your enrollment to unlock modules, notes, resources, and assessments.
          </p>
          <button
            type='button'
            className='btn btn-main rounded-pill px-32'
            onClick={() => navigate(`/${programme}/${course}`)}
          >
            Review course overview
          </button>
        </div>
      );
    }

    switch (activeSection) {
      case "notes":
        return (
          <div className='course-home-panel'>
            <div className='course-home-panel__header mb-32'>
              <div>
                <p className='course-home-panel__eyebrow mb-8'>Notes</p>
                <h2 className='course-home-panel__title mb-0'>Notes</h2>
              </div>
              <button type='button' className='course-home-filter'>
                <span>Filter: </span>
                <strong>All notes</strong>
                <i className='ph-bold ph-caret-down d-inline-flex text-md' />
              </button>
            </div>
            <div className='course-home-empty text-center'>
              <NotesIllustration />
              <p className='text-neutral-700 fw-semibold mb-8'>
                You have not added any notes yet.
              </p>
              <p className='text-neutral-600 mb-0'>
                Notes can be created from video pages and will appear here automatically.
              </p>
            </div>
          </div>
        );
      case "assessments":
        return (
          <SectionPlaceholder
            title='Assessments'
            description='Assessments unlock as you progress through modules. Keep learning to access your first checkpoint.'
          />
        );
      case "messages":
        return (
          <SectionPlaceholder
            title='Messages'
            description='Stay tuned! Mentor updates and cohort announcements will show up here once your batch begins.'
          />
        );
      case "resources":
        return (
          <SectionPlaceholder
            title='Resources'
            description='Downloadable templates, case studies, and reading lists will be added for your cohort soon.'
          />
        );
      case "info":
        return renderCourseInfo();
      case MODULE_SECTION_ID:
        return renderModuleDetail();
      default:
        return null;
    }
  };

  const renderSidebar = () => (
    <div className='course-home-tabs'>
      <nav className='course-home-nav'>
        {NAV_SECTIONS.map((section) => {
          const isModuleTab = section.id === MODULE_SECTION_ID;
          return (
            <button
              key={section.id}
              type='button'
              className={`course-home-nav__item ${
                activeSection === section.id ? "is-active" : ""
              }`}
              onClick={() =>
                isModuleTab ? handleModuleClick(lastModuleIndex) : handleSectionChange(section.id)
              }
            >
              {section.label}
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <section className='course-home-section py-40'>
        <div className='container'>
          <div className='course-home-hero mb-20'>
            <div className='course-home-hero__text'>
              <p className='text-main-600 fw-semibold mb-8 course-home-hero__programme'>{programmeTitle}</p>
              <div className='course-home-hero__title-row'>
                <button
                  type='button'
                  className='course-home-back'
                  aria-label='Go back'
                  onClick={() => navigate(`/${programme}/${course}`)}
                >
                  <i className='ph-bold ph-arrow-left' aria-hidden='true' />
                </button>
                <h1 className='text-neutral-900 mb-0 course-home-hero__title'>{prettyCourseName}</h1>
              </div>
            </div>
          </div>
          <div className='course-home-video mb-20'>
            {activeVideo?.src ? (
              <CourseVideoPlayer
                src={activeVideo?.src || defaultVideoMeta.src}
                poster={activeVideo?.poster || defaultVideoMeta.poster}
                title={activeVideo?.title || defaultVideoMeta.title}
                subtitle={activeVideo?.subtitle || defaultVideoMeta.subtitle}
                autoPlayToken={videoAutoPlayToken}
                onClose={handlePlayerClose}
                autoPlayEnabled={autoPlayEnabled}
                onToggleAutoplay={handleAutoplayToggle}
                qualityOptions={derivedQualityOptions}
                qualityPreference={qualityPreference}
                onQualityChange={setQualityPreference}
                subtitleOptions={subtitleOptions}
                subtitlePreference={subtitlePreference}
                onSubtitleChange={setSubtitlePreference}
                lectureMeta={currentLectureMeta}
                resumePositionSeconds={resumePositionSeconds}
                onProgress={handlePlayerProgress}
              />
            ) : (
              <CourseVideoPlaceholder banner={courseBannerUrl} />
            )}
          </div>
          <div className='course-home-grid'>
            {renderSidebar()}
            <div className='course-home-content'>{renderMainContent()}</div>
          </div>
        </div>
      </section>
      <FooterOne />
    </>
  );
};

export default CourseHomePage;
  const handlePlayerClose = () => {
    setActiveVideo(null);
    setCurrentLectureMeta(null);
    setResumePositionSeconds(0);
  };
