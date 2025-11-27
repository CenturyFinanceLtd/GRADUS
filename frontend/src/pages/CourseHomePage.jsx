import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import HeaderOne from "../components/HeaderOne";
import FooterOne from "../components/FooterOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";
import AssessmentPanel from "../components/AssessmentPanel";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../services/apiClient";
import { fetchActiveLiveSessionForCourse } from "../live/liveApi";
import useLiveStudentSession from "../live/useLiveStudentSession";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

GlobalWorkerOptions.workerSrc = pdfWorker;

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

const buildEmptyLectureNotes = () => ({
  hasFile: false,
  pages: 0,
  bytes: 0,
  format: "",
  fileName: "",
  updatedAt: "",
});

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

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

const normalizeAssignmentUploads = (items = [], fallbackPrefix = "Assignment") => {
  const source = Array.isArray(items) ? items : toArray(items);
  return source
    .map((raw, idx) => {
      if (!raw) {
        return null;
      }
      if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (!trimmed) {
          return null;
        }
        const urlMatch = trimmed.match(/https?:\/\/\S+/i);
        if (!urlMatch) {
          return null;
        }
        const url = urlMatch[0];
        const label = trimmed.replace(url, "").trim() || `${fallbackPrefix} ${idx + 1}`;
        return { label, url };
      }
      if (typeof raw === "object") {
        const label = String(raw.label || raw.title || raw.name || raw.text || "").trim();
        const url = String(raw.url || raw.href || raw.link || raw.file || raw.src || "").trim();
        if (!url) {
          return null;
        }
        return { label: label || `${fallbackPrefix} ${idx + 1}`, url };
      }
      return null;
    })
    .filter(Boolean);
};

const normalizeLectureItems = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((entry) => {
      if (typeof entry === "string") {
        const title = entry.trim();
        return title ? { title, duration: "", durationSeconds: 0, type: "", lectureId: "" } : null;
      }
      if (entry && typeof entry === "object") {
        const title = String(entry.title || entry.name || entry.label || "").trim();
        const duration = String(entry.duration || entry.length || entry.time || "").trim();
        const durationSeconds =
          toPositiveNumber(entry.durationSeconds) ||
          toPositiveNumber(entry.lengthSeconds) ||
          toPositiveNumber(entry.timeSeconds) ||
          toPositiveNumber(entry.video?.duration);
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
        const notesMeta =
          entry.notes && typeof entry.notes === "object"
            ? {
                hasFile: Boolean(entry.notes.hasFile || entry.notes.publicId || entry.notes.url),
                pages: Number(entry.notes.pages) || 0,
                bytes: Number(entry.notes.bytes) || 0,
                format: String(entry.notes.format || entry.notes.type || ""),
                updatedAt: entry.notes.updatedAt || entry.notes.uploadedAt || "",
              }
            : buildEmptyLectureNotes();
        if (!title) {
          return null;
        }
        return { title, duration, durationSeconds, type, videoUrl, poster, lectureId, notes: notesMeta };
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
      const assignmentsSource = entry.assignments || entry.tasks || entry.homework;
      const assignmentsRaw = toArray(assignmentsSource);
      const assignments = normalizeAssignmentUploads(assignmentsSource, `Assignment ${idx + 1}`);
      const projects = toArray(entry.projects || entry.activities);
      const quizzes = toArray(entry.quizzes || entry.tests);
      const notes = toArray(entry.notes || entry.resources);
      if (
        !title &&
        !subtitle &&
        !summary &&
        !lectures.length &&
        !assignmentsRaw.length &&
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

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const formatLectureDurationLabel = (seconds) => {
  const safeSeconds = toPositiveNumber(seconds);
  if (!safeSeconds) {
    return "";
  }
  if (safeSeconds < 60) {
    const secs = Math.max(1, Math.round(safeSeconds));
    return `${secs} sec`;
  }
  if (safeSeconds >= 3600) {
    let hours = Math.floor(safeSeconds / 3600);
    let minutes = Math.round((safeSeconds % 3600) / 60);
    if (minutes === 60) {
      hours += 1;
      minutes = 0;
    }
    const hourUnit = hours === 1 ? "hr" : "hrs";
    return minutes ? `${hours} ${hourUnit} ${minutes} min` : `${hours} ${hourUnit}`;
  }
  const minutes = Math.max(1, Math.round(safeSeconds / 60));
  return `${minutes} min`;
};

const getLectureDurationLabel = (lecture, lectureProgress) => {
  const lectureSeconds = toPositiveNumber(lecture?.durationSeconds);
  if (lectureSeconds) {
    return formatLectureDurationLabel(lectureSeconds);
  }
  const progressSeconds = toPositiveNumber(lectureProgress?.durationSeconds);
  if (progressSeconds) {
    return formatLectureDurationLabel(progressSeconds);
  }
  return typeof lecture?.duration === "string" ? lecture.duration : "";
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
    // Restart from the beginning when replaying a finished lecture.
    if (video.ended) {
      video.currentTime = 0;
    }
    applyResumePosition();
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
              ? section.lectures.map((lecture, lectureIdx) => {
                  const lectureId = lecture.lectureId || lecture.id || `${sectionId}-lecture-${lectureIdx + 1}`;
                  const hasNotes = Boolean(
                    lecture.notes?.hasFile || lecture.notes?.publicId || lecture.notes?.url
                  );
                  const notesMeta = hasNotes
                    ? {
                        hasFile: true,
                        pages: Number(lecture.notes.pages) || 0,
                        bytes: Number(lecture.notes.bytes) || 0,
                        format: lecture.notes.format || "pdf",
                        fileName: lecture.notes.fileName || "",
                        updatedAt: lecture.notes.uploadedAt || lecture.notes.updatedAt || "",
                      }
                    : buildEmptyLectureNotes();
                  const durationSeconds = toPositiveNumber(lecture.video?.duration);
                  return {
                    lectureId,
                    moduleId,
                    sectionId,
                    title: lecture.title || "Lecture",
                    duration:
                      lecture.duration ||
                      (durationSeconds ? formatLectureDurationLabel(durationSeconds) : ""),
                    durationSeconds,
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
                    notes: notesMeta,
                  };
                })
              : [],
            assignments: normalizeAssignmentUploads(section.assignments, `Assignment ${sectionIndex + 1}`),
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
  const { token, loading: authLoading, user: authUser } = useAuth();
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
  const availableNotes = useMemo(() => {
    const collected = [];
    modules.forEach((module, moduleIdx) => {
      const moduleId = module.moduleId || module.id || `module-${moduleIdx + 1}`;
      const moduleTitle = module.title || module.moduleLabel || `Module ${moduleIdx + 1}`;
      const weeklyStructure = Array.isArray(module.weeklyStructure) ? module.weeklyStructure : [];
      weeklyStructure.forEach((week, weekIdx) => {
        const sectionId = week.sectionId || week.id || `${moduleId}-section-${weekIdx + 1}`;
        const weekTitle = week.title || `Week ${weekIdx + 1}`;
        const lectures = Array.isArray(week.lectures) ? week.lectures : [];
        lectures.forEach((lecture, lectureIdx) => {
          if (!lecture?.notes?.hasFile) {
            return;
          }
          const lectureId = lecture.lectureId || lecture.id || `${sectionId}-lecture-${lectureIdx + 1}`;
          collected.push({
            lectureId,
            lectureTitle: lecture.title || `Lecture ${lectureIdx + 1}`,
            moduleId,
            moduleTitle,
            sectionId,
            weekTitle,
            notesMeta: lecture.notes,
            videoUrl: lecture.videoUrl || "",
            poster: lecture.poster || "",
          });
        });
      });
    });
    return collected;
  }, [modules]);
  const moduleSelectorRef = useRef(null);
  const [progressState, setProgressState] = useState({ loading: false, data: {} });
  const [currentLectureMeta, setCurrentLectureMeta] = useState(null);
  const [resumePositionSeconds, setResumePositionSeconds] = useState(0);
  const playerContainerRef = useRef(null);
  const [notesState, setNotesState] = useState({ status: "idle", lectureId: null, pages: [], pageCount: 0, error: null });
  const [notesReloadToken, setNotesReloadToken] = useState(0);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const notesTarget = currentLectureMeta?.hasNotes ? currentLectureMeta : null;
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
    // Allow live embed route to bypass canonical slug enforcement
    if (sectionSlugParam === "live") {
      return;
    }
    const expectedSlug =
      sectionFromUrl === DEFAULT_SECTION_ID
        ? ""
        : SECTION_SLUG_BY_ID[sectionFromUrl] || SECTION_SLUG_BY_ID[DEFAULT_SECTION_ID];
    const normalizedSlug = sectionSlugParam ? sectionSlugParam.toLowerCase() : "";
    const hasValidSlug = Boolean(normalizedSlug && SECTION_ID_BY_SLUG[normalizedSlug]);
    const targetPath = expectedSlug
      ? `/${programme}/${course}/home/${expectedSlug}`
      : `/${programme}/${course}/home`;

    if ((expectedSlug === "" && normalizedSlug === "course-info") || sectionSlugParam !== expectedSlug) {
      navigate(targetPath, {
        replace: !sectionSlugParam || !hasValidSlug || normalizedSlug === "course-info",
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
    if (!notesModalOpen || !notesTarget?.hasNotes || !notesTarget?.lectureId) {
      setNotesState({ status: "idle", lectureId: null, pages: [], pageCount: 0, error: null });
      return;
    }
    if (!programme || !course) {
      setNotesState({ status: "idle", lectureId: null, pages: [], pageCount: 0, error: null });
      return;
    }
    if (!token) {
      setNotesState({
        status: "error",
        lectureId: notesTarget.lectureId,
        pages: [],
        pageCount: 0,
        error: "Sign in to view lecture notes.",
      });
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const loadNotes = async () => {
      setNotesState({
        status: "loading",
        lectureId: currentLectureMeta.lectureId,
        pages: [],
        pageCount: 0,
        error: null,
      });
      try {
        const endpoint = `${API_BASE_URL}/courses/${encodeURIComponent(programme)}/${encodeURIComponent(
          course
        )}/lectures/${encodeURIComponent(notesTarget.lectureId)}/notes`;
        const headers = new Headers();
        headers.set("Authorization", `Bearer ${token}`);
        const response = await fetch(endpoint, {
          headers,
          credentials: "include",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Unable to load lecture notes");
        }
        const buffer = await response.arrayBuffer();
        const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;
        const renderedPages = [];
        for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
          const page = await pdf.getPage(pageIndex);
          const viewport = page.getViewport({ scale: 1.1 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");
          await page.render({ canvasContext: context, viewport }).promise;
          renderedPages.push(canvas.toDataURL("image/png"));
        }
        if (!cancelled) {
          setNotesState({
            status: "ready",
            lectureId: notesTarget.lectureId,
            pages: renderedPages,
            pageCount: pdf.numPages,
            error: null,
          });
        }
      } catch (error) {
        if (cancelled || error?.name === "AbortError") {
          return;
        }
        setNotesState({
          status: "error",
          lectureId: notesTarget.lectureId,
          pages: [],
          pageCount: 0,
          error: error?.message || "Unable to load lecture notes",
        });
      }
    };
    loadNotes();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    programme,
    course,
    token,
    notesTarget?.lectureId,
    notesTarget?.hasNotes,
    notesReloadToken,
    notesModalOpen,
  ]);

  useEffect(() => {
    if (notesModalOpen && !notesTarget?.hasNotes) {
      setNotesModalOpen(false);
      setNotesState({ status: "idle", lectureId: null, pages: [], pageCount: 0, error: null });
    }
  }, [notesModalOpen, notesTarget?.hasNotes]);

  useEffect(() => {
    if (!notesModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setNotesModalOpen(false);
        setNotesState({ status: "idle", lectureId: null, pages: [], pageCount: 0, error: null });
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notesModalOpen]);







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
  const [liveSessionState, setLiveSessionState] = useState({ checking: false, session: null, error: null });
  const courseLookupKeys = useMemo(() => {
    const keys = [];
    if (state.course?.slug) {
      keys.push(state.course.slug);
    }
    if (state.course?.id) {
      keys.push(state.course.id);
    }
    if (state.course?._id) {
      keys.push(state.course._id);
    }
    if (course) {
      keys.push(course);
    }
    return [...new Set(keys.filter(Boolean).map((key) => String(key).trim()))];
  }, [state.course?.slug, state.course?.id, state.course?._id, course]);
  const isLiveSection = sectionSlugParam === "live";
  const liveSessionIdFromRoute = isLiveSection ? sectionDetailParam : null;
  const liveInstructorVideoRef = useRef(null);
  const liveInstructorPreviewVideoRef = useRef(null);
  const liveLocalVideoRef = useRef(null);
  const [selfViewPrimary, setSelfViewPrimary] = useState(false);
  const [pinnedRemoteId, setPinnedRemoteId] = useState(null);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [livePasscode, setLivePasscode] = useState("");
  const [passcodeAttempted, setPasscodeAttempted] = useState(false);
  const [embedChatInput, setEmbedChatInput] = useState("");
  const {
    session: embeddedLiveSession,
    stageStatus: embeddedStageStatus,
    stageError: embeddedStageError,
    instructorStream,
    localStream,
    joinClass,
    toggleMediaTrack,
    leaveSession: leaveEmbeddedSession,
    localMediaState,
    startScreenShare,
    stopScreenShare,
    screenShareActive,
    instructorIsScreen,
    participantShareAllowed,
    participantMediaAllowed,
    chatMessages: embedChatMessages,
    sendChatMessage: sendEmbedChatMessage,
    sendReaction: sendEmbedReaction,
    sendHandRaise: sendEmbedHandRaise,
    participantId: embedParticipantId,
    spotlightParticipantId: embedSpotlightId,
  } = useLiveStudentSession(liveSessionIdFromRoute || undefined);

  const hasActiveLocalVideo = useMemo(() => {
    if (!localStream) {
      return false;
    }
    const videoTracks = localStream.getVideoTracks ? localStream.getVideoTracks() : [];
    return videoTracks.some((track) => track.enabled && track.readyState !== "ended");
  }, [localStream, localMediaState?.video]);

  useEffect(() => {
    if (liveInstructorVideoRef.current) {
      liveInstructorVideoRef.current.srcObject = instructorStream || null;
    }
    if (liveInstructorPreviewVideoRef.current) {
      liveInstructorPreviewVideoRef.current.srcObject = instructorStream || null;
    }
  }, [instructorStream]);

  useEffect(() => {
    if (liveLocalVideoRef.current) {
      liveLocalVideoRef.current.srcObject = localStream || null;
    }
  }, [localStream]);

  useEffect(() => {
    // Reset side panels and passcode when entering a new/matching live session
    setShowParticipantsPanel(false);
    setShowChatPanel(false);
    setSelfViewPrimary(false);
    setPasscodeAttempted(false);
    if (liveSessionIdFromRoute) {
      const cached = localStorage.getItem(`live-passcode-${liveSessionIdFromRoute}`) || "";
      setLivePasscode(cached);
    } else {
      setLivePasscode("");
    }
  }, [liveSessionIdFromRoute]);
  const handleSectionChange = (nextSectionId) => {
    const normalizedSection =
      NAV_SECTIONS.find((section) => section.id === nextSectionId)?.id || DEFAULT_SECTION_ID;
    const slug =
      normalizedSection === DEFAULT_SECTION_ID
        ? ""
        : SECTION_SLUG_BY_ID[normalizedSection] || SECTION_SLUG_BY_ID[DEFAULT_SECTION_ID];
    setActiveSection(normalizedSection);
    const path = slug ? `/${programme}/${course}/home/${slug}` : `/${programme}/${course}/home`;
    navigate(path);
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
  const checkActiveLiveSession = useCallback(async () => {
    if (!isEnrolled || !token || courseLookupKeys.length === 0) {
      setLiveSessionState({ checking: false, session: null, error: null });
      return;
    }

    setLiveSessionState((prev) => ({ ...prev, checking: true }));
    for (const key of courseLookupKeys) {
      try {
        const response = await fetchActiveLiveSessionForCourse(key, { token });
        if (response?.session) {
          setLiveSessionState({ checking: false, session: response.session, error: null });
          return;
        }
        continue;
      } catch (error) {
        if (error?.status === 404) {
          continue;
        }
        setLiveSessionState({
          checking: false,
          session: null,
          error: error?.message || "Unable to check live class status.",
        });
        return;
      }
    }
    setLiveSessionState({ checking: false, session: null, error: null });
  }, [courseLookupKeys, isEnrolled, token]);

  useEffect(() => {
    if (!isEnrolled || !token || !course) {
      setLiveSessionState({ checking: false, session: null, error: null });
      return;
    }

    let isMounted = true;
    const poll = async () => {
      if (!isMounted) {
        return;
      }
      await checkActiveLiveSession();
    };

    poll();
    const intervalId = setInterval(poll, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [checkActiveLiveSession, courseLookupKeys, isEnrolled, token]);

  useEffect(() => {
    if (!isLiveSection || !liveSessionIdFromRoute || !isEnrolled || !token) {
      return;
    }
    // Auto-join when no passcode is required, or when a cached passcode exists.
    if (embeddedStageStatus === "idle") {
      const displayName =
        state.course?.studentName ||
        authUser?.personalDetails?.studentName ||
        [authUser?.firstName, authUser?.lastName].filter(Boolean).join(" ") ||
        authUser?.email;
      if (!embeddedLiveSession?.requiresPasscode) {
        joinClass({ displayName });
      } else if (embeddedLiveSession?.requiresPasscode && livePasscode) {
        setPasscodeAttempted(true);
        joinClass({ displayName, passcode: livePasscode });
      }
    }
  }, [
    embeddedStageStatus,
    isEnrolled,
    isLiveSection,
    joinClass,
    liveSessionIdFromRoute,
    embeddedLiveSession?.requiresPasscode,
    livePasscode,
    authUser?.email,
    authUser?.firstName,
    authUser?.lastName,
    authUser?.personalDetails?.studentName,
    state.course?.studentName,
    token,
  ]);
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

  const scrollToPlayer = () => {
    if (typeof window === "undefined" || !playerContainerRef.current) {
      return;
    }
    const rect = playerContainerRef.current.getBoundingClientRect();
    const offset = rect.top + window.scrollY - 90; // offset for sticky header
    window.scrollTo({ top: offset, behavior: "smooth" });
  };

  const handleLecturePlay = (lecture, meta = {}) => {
    if (!lecture?.videoUrl) {
      return;
    }
    if (notesModalOpen) {
      setNotesModalOpen(false);
      setNotesState({ status: "idle", lectureId: null, pages: [], pageCount: 0, error: null });
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
      hasNotes: Boolean(lecture.notes?.hasFile),
      notesMeta: lecture.notes || null,
    });
    const lectureProgress = lectureId ? progressState.data[lectureId] : null;
    const isCompleted =
      Boolean(lectureProgress?.completedAt) ||
      (lectureProgress?.completionRatio || 0) >= VIDEO_COMPLETION_THRESHOLD;
    const resumeSeconds = isCompleted ? 0 : lectureProgress?.lastPositionSeconds || 0;
    setResumePositionSeconds(resumeSeconds);
    // Always attempt to start playback when a lecture is explicitly selected.
    setVideoAutoPlayToken((token) => token + 1);
    scrollToPlayer();
  };
  const handleNotesRetry = () => setNotesReloadToken((value) => value + 1);
  const openNotesModal = (metaOverride) => {
    const meta = metaOverride || notesTarget;
    if (!meta?.hasNotes || !meta?.lectureId) {
      return;
    }
    const endpoint = `${API_BASE_URL}/courses/${encodeURIComponent(programme)}/${encodeURIComponent(
      course
    )}/lectures/${encodeURIComponent(meta.lectureId)}/notes`;
    window.open(endpoint, "_blank", "noopener,noreferrer");
  };
  const closeNotesModal = () => {
    setNotesModalOpen(false);
    setNotesState({ status: "idle", lectureId: null, pages: [], pageCount: 0, error: null });
  };
  const handlePlayerClose = () => {
    setActiveVideo(null);
    setCurrentLectureMeta(null);
    setResumePositionSeconds(0);
    setNotesModalOpen(false);
    setNotesState({ status: "idle", lectureId: null, pages: [], pageCount: 0, error: null });
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
      const normalizedItems = Array.isArray(items)
        ? items
            .map((item, idx) => {
              if (!item) {
                return null;
              }
              if (typeof item === "string") {
                const trimmed = item.trim();
                if (!trimmed) {
                  return null;
                }
                return { key: `${title}-${idx}`, label: trimmed, url: "" };
              }
              if (typeof item === "object") {
                const label = String(
                  item.label || item.title || item.name || item.text || item.description || ""
                ).trim();
                const url = String(item.url || item.href || item.link || item.file || "").trim();
                if (!label && !url) {
                  return null;
                }
                return { key: item.key || `${title}-${idx}`, label: label || url, url };
              }
              return null;
            })
            .filter(Boolean)
        : [];
      if (!normalizedItems.length) {
        return null;
      }
      return (
        <div className='course-module-week__group'>
          <p className='course-module-week__group-title'>{title}</p>
          <ul className='course-module-week__list course-module-week__list--bullets'>
            {normalizedItems.map(({ key, label, url }) => (
              <li key={key}>
                <i className={`ph-bold ${iconClass} text-main-500`} />
                {url ? (
                  <a
                    href={url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='course-module-week__bullet-link'
                  >
                    {label}
                  </a>
                ) : (
                  <span>{label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    };
    const normalizeWeekNotes = (noteItems = []) => {
      if (!Array.isArray(noteItems)) {
        return [];
      }
      return noteItems
        .map((raw, idx) => {
          if (!raw) {
            return null;
          }
          if (typeof raw === "string") {
            const trimmed = raw.trim();
            if (!trimmed) {
              return null;
            }
            const urlMatch = trimmed.match(/https?:\/\/\S+/i);
            const url = urlMatch ? urlMatch[0] : "";
            const label = urlMatch
              ? trimmed.replace(urlMatch[0], "").trim() || `Class notes ${idx + 1}`
              : trimmed;
            return { label, url };
          }
          if (typeof raw === "object") {
            const label = String(raw.label || raw.title || raw.name || raw.text || "").trim();
            const url = String(raw.url || raw.href || raw.link || raw.file || "").trim();
            const description = String(raw.description || raw.summary || "").trim();
            return {
              label: label || description || `Class notes ${idx + 1}`,
              url,
              description,
            };
          }
          return null;
        })
        .filter(Boolean);
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
              {weeklyStructure.map((week, weekIdx) => {
                const weekNotes = normalizeWeekNotes(week.notes);
                return (
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
                          const durationLabel = getLectureDurationLabel(lecture, lectureProgress);
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
                                {durationLabel ? (
                                  <span className='course-module-week__badge'>{durationLabel}</span>
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
                  {weekNotes.length ? (
                    <div className='course-module-week__notes'>
                      <div className='course-module-week__notes-header'>
                        <div className='course-module-week__notes-icon' aria-hidden='true'>
                          <i className='ph-bold ph-notebook' />
                        </div>
                        <div>
                          <p className='course-module-week__notes-title'>Class notes</p>
                          <p className='course-module-week__notes-text'>
                            Download the notes shared for these classes or keep them handy while you learn.
                          </p>
                        </div>
                      </div>
                      <div className='course-module-week__notes-links'>
                        {weekNotes.map((note, noteIdx) => {
                          const key = `module-${safeIndex}-week-${weekIdx}-note-${noteIdx}`;
                          if (note.url) {
                            return (
                              <a
                                key={key}
                                href={note.url}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='course-module-week__note-chip'
                              >
                                <i className='ph-bold ph-arrow-square-out' aria-hidden='true' />
                                <span>{note.label}</span>
                              </a>
                            );
                          }
                          return (
                            <span key={key} className='course-module-week__note-chip is-static'>
                              <i className='ph-bold ph-note' aria-hidden='true' />
                              <span>{note.label}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
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
            {availableNotes.length ? (
              <div className='d-flex flex-column gap-3'>
                {availableNotes.map((note) => (
                  <div
                    key={note.lectureId}
                    className='border rounded-4 p-16 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-12'
                  >
                    <div>
                      <p className='course-home-panel__eyebrow mb-4'>
                        {note.moduleTitle} · {note.weekTitle}
                      </p>
                      <h4 className='mb-4'>{note.lectureTitle}</h4>
                      <p className='text-neutral-600 mb-0 small'>
                        {note.notesMeta?.pages ? `${note.notesMeta.pages} pages` : "Lecture notes available"}
                      </p>
                    </div>
                    <div className='d-flex align-items-center gap-2 flex-wrap'>
                      {note.notesMeta?.pages ? (
                        <span className='badge bg-light text-dark'>{note.notesMeta.pages} pages</span>
                      ) : null}
                      <button
                        type='button'
                        className='btn btn-sm btn-outline-primary'
                        onClick={() =>
                          openNotesModal({
                            lectureId: note.lectureId,
                            moduleId: note.moduleId,
                            sectionId: note.sectionId,
                            lectureTitle: note.lectureTitle,
                            moduleTitle: note.moduleTitle,
                            weekTitle: note.weekTitle,
                            videoUrl: note.videoUrl,
                            hasNotes: true,
                            notesMeta: note.notesMeta,
                          })
                        }
                      >
                        View notes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='course-home-empty text-center'>
                <NotesIllustration />
                <p className='text-neutral-700 fw-semibold mb-8'>
                  You have not added any notes yet.
                </p>
                <p className='text-neutral-600 mb-0'>
                  Notes can be created from video pages and will appear here automatically.
                </p>
              </div>
            )}
          </div>
        );
      case "assessments":
        return (
          <AssessmentPanel
            courseSlug={course}
            programmeSlug={programme}
            courseName={prettyCourseName}
            modules={modules}
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

const liveStatusText = useMemo(() => {
  if (embeddedStageStatus === "live") {
    return "Connected";
  }
  if (embeddedStageStatus === "waiting-room") {
    return "Waiting for host";
  }
  if (embeddedStageStatus === "joining" || embeddedStageStatus === "connecting") {
      return "Connecting…";
    }
    if (embeddedStageStatus === "error") {
      return "Connection error";
    }
    return "Not connected";
  }, [embeddedStageStatus]);

  const handleLeaveLiveView = () => {
    leaveEmbeddedSession();
    navigate(`/${programme}/${course}/home`);
  };

  const startClass = useCallback(async () => {
    if (!token) {
      setPasscodeAttempted(true);
      return;
    }
    const displayName =
      state.course?.studentName ||
      authUser?.personalDetails?.studentName ||
      [authUser?.firstName, authUser?.lastName].filter(Boolean).join(" ") ||
      authUser?.email;
    if (liveSessionIdFromRoute) {
      localStorage.setItem(`live-passcode-${liveSessionIdFromRoute}`, livePasscode || "");
    }
    setPasscodeAttempted(true);
    await joinClass({ displayName, passcode: livePasscode || undefined });
  }, [
    authUser?.email,
    authUser?.firstName,
    authUser?.lastName,
    authUser?.personalDetails?.studentName,
    joinClass,
    livePasscode,
    liveSessionIdFromRoute,
    state.course?.studentName,
    token,
  ]);

  const renderHeroMedia = () => {
    if (isLiveSection && liveSessionIdFromRoute && isEnrolled) {
      const connected = embeddedStageStatus === "live";
      const audioAllowed =
        embeddedLiveSession?.allowStudentAudio !== false && participantMediaAllowed?.audio !== false;
      const videoAllowed =
        embeddedLiveSession?.allowStudentVideo !== false && participantMediaAllowed?.video !== false;
      const screenShareAllowed =
        embeddedLiveSession?.allowStudentScreenShare !== false && participantShareAllowed !== false;
      const participantList = (() => {
        const rawList = Array.isArray(embeddedLiveSession?.participants)
          ? embeddedLiveSession.participants.filter((participant) => participant.connected)
          : [];
        const seen = new Set();
        return rawList.filter((participant) => {
          const key = `${participant.role}-${participant.displayName || participant.id}`;
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
      })();
      const hasLocalVideo = hasActiveLocalVideo;
      const hasInstructorVideo = Boolean(instructorStream);
      const showSelfPrimary = selfViewPrimary && hasLocalVideo;
      const mainVideoLabel = showSelfPrimary
        ? "You"
        : hasInstructorVideo
        ? instructorIsScreen
          ? "Screen share"
          : "Instructor"
        : null;
      return (
        <div className='course-home-video mb-20 live-embed-card' ref={playerContainerRef}>
          <div className='d-flex align-items-center justify-content-between flex-wrap gap-2 mb-12'>
            <div>
              <p className='course-home-panel__eyebrow mb-4 text-danger-600'>Live classroom</p>
              <h3 className='course-home-panel__title mb-0'>
                {embeddedLiveSession?.courseName || prettyCourseName || "Live class"}{" "}
                <span className={`badge ms-2 ${connected ? "bg-success" : "bg-secondary"}`}>
                  {liveStatusText}
                </span>
              </h3>
              <p className='text-neutral-600 mb-0 small'>Session ID: {liveSessionIdFromRoute}</p>
            </div>
            <div />
          </div>
          {embeddedStageError && (!embeddedLiveSession?.requiresPasscode || passcodeAttempted) ? (
            <div className='alert alert-danger mb-3'>{embeddedStageError}</div>
          ) : null}
          {embeddedLiveSession?.requiresPasscode ? (
            <div className='mb-3 d-flex flex-column flex-sm-row align-items-sm-end gap-2'>
              <div className='flex-grow-1'>
                <label className='course-home-panel__eyebrow mb-2'>Passcode</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='Enter passcode shared by your instructor'
                  value={livePasscode}
                  onChange={(e) => setLivePasscode(e.target.value)}
                  disabled={embeddedStageStatus === "live"}
                />
              </div>
              <button
                type='button'
                className='btn btn-primary'
                onClick={startClass}
                disabled={embeddedStageStatus === "live" || !livePasscode}
              >
                {embeddedStageStatus === "joining" || embeddedStageStatus === "connecting"
                  ? "Joining…"
                  : "Join with passcode"}
              </button>
            </div>
          ) : null}
          <div className={`live-embed-grid ${showParticipantsPanel || showChatPanel ? "with-aside" : "single"}`}>
            <div className='live-embed-main'>
              {mainVideoLabel ? <div className='live-embed-main__label'>{mainVideoLabel}</div> : null}
              {showSelfPrimary && hasLocalVideo ? (
                <video
                  ref={liveLocalVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`live-video ${screenShareActive ? "live-video--no-mirror" : "live-video--self"}`}
                />
              ) : hasInstructorVideo ? (
                <video
                  ref={liveInstructorVideoRef}
                  autoPlay
                  playsInline
                  className={`live-video ${instructorIsScreen ? "live-video--no-mirror" : "live-video--instructor"}`}
                />
              ) : (
                <div className='live-embed-placeholder'>
                  <p className='text-neutral-700 mb-2'>
                    {connected ? "Waiting for instructor video..." : "Connecting to live class..."}
                  </p>
                  <p className='text-neutral-500 small mb-0'>
                    Check camera/mic permissions if it takes longer than expected.
                  </p>
                </div>
              )}
            {showSelfPrimary ? (
                hasInstructorVideo ? (
                  <div className='live-embed-pip live-embed-pip--instructor'>
                    <div className='live-embed-pip__label'>{instructorIsScreen ? "Screen share" : "Instructor"}</div>
                    <video
                      ref={liveInstructorPreviewVideoRef}
                      autoPlay
                      playsInline
                      className={`live-video ${instructorIsScreen ? "live-video--no-mirror" : "live-video--instructor"}`}
                    />
                    <button
                      type='button'
                      className='live-embed-pip__action'
                      onClick={() => setSelfViewPrimary(false)}
                      title='Maximize instructor video'
                    >
                      Maximize
                    </button>
                  </div>
                ) : null
              ) : hasLocalVideo ? (
                <div className='live-embed-pip live-embed-pip--self'>
                  <div className='live-embed-pip__label'>Me</div>
                  <video
                    ref={liveLocalVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`live-video ${screenShareActive ? "live-video--no-mirror" : "live-video--self"}`}
                  />
                  <button
                    type='button'
                    className='live-embed-pip__action'
                    onClick={() => setSelfViewPrimary(true)}
                    title='Maximize your video'
                  >
                    Maximize
                  </button>
                </div>
              ) : null}
            </div>
            {showParticipantsPanel || showChatPanel ? (
              <div className='live-embed-side'>
                {showParticipantsPanel ? (
                  <div className='live-embed-sidecard'>
                    <div className='d-flex align-items-center justify-content-between mb-2'>
                      <span className='course-home-panel__eyebrow mb-0'>Participants</span>
                      <button
                        type='button'
                        className='btn btn-sm btn-outline-primary'
                        onClick={() => setShowParticipantsPanel(false)}
                      >
                        Hide
                      </button>
                    </div>
                    <ul className='live-embed-participants'>
                      {participantList.length === 0 ? (
                        <li className='text-neutral-400 small'>No one connected yet.</li>
                      ) : (
                        participantList.map((p) => {
                          const name = p.role === "instructor" ? "Instructor" : p.displayName || "Participant";
                          return (
                            <li key={p.id} className={p.connected ? "is-online" : ""}>
                              <span className='dot' />
                              <span className='name'>{name}</span>
                              <span className='role'>{p.role === "instructor" ? "Host" : "Attendee"}</span>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>
                ) : null}
                {showChatPanel ? (
                  <div className='live-embed-sidecard'>
                    <div className='d-flex align-items-center justify-content-between mb-2'>
                      <span className='course-home-panel__eyebrow mb-0'>Chat</span>
                      <button
                        type='button'
                        className='btn btn-sm btn-outline-primary'
                        onClick={() => setShowChatPanel(false)}
                      >
                        Hide
                      </button>
                    </div>
                    <div className='live-embed-chat'>
                      <div className='live-embed-chat__messages'>
                        {embedChatMessages?.length ? (
                          embedChatMessages.map((msg, idx) => {
                            const isSelf = embedParticipantId && msg.from && msg.from === embedParticipantId;
                            const baseName =
                              msg.senderRole === "instructor" ? "Instructor" : msg.displayName || "Participant";
                            const name = isSelf ? `${baseName} (You)` : baseName;
                            return (
                              <div key={`${msg.timestamp}-${idx}`} className='live-embed-chat__message'>
                                <strong>{name}:</strong> {msg.text}
                              </div>
                            );
                          })
                        ) : (
                          <p className='text-neutral-500 small mb-2'>No messages yet.</p>
                        )}
                      </div>
                      <div className='d-flex gap-2 mt-2 flex-wrap'>
                        <input
                          type='text'
                          className='form-control form-control-sm flex-grow-1'
                          placeholder='Type a message'
                          value={embedChatInput}
                          onChange={(e) => setEmbedChatInput(e.target.value)}
                        />
                        <button
                          type='button'
                          className='btn btn-sm btn-primary'
                          disabled={!embedChatInput.trim()}
                          onClick={() => {
                            sendEmbedChatMessage(embedChatInput);
                            setEmbedChatInput("");
                          }}
                        >
                          Send
                        </button>
                        <button
                          type='button'
                          className='btn btn-sm btn-outline-secondary'
                          title='Raise hand'
                          onClick={() => sendEmbedHandRaise()}
                        >
                          ✋
                        </button>
                        <div className='d-flex gap-1'>
                          <button type='button' className='btn btn-xs btn-outline-secondary' onClick={() => sendEmbedReaction("👍")}>
                            👍
                          </button>
                          <button type='button' className='btn btn-xs btn-outline-secondary' onClick={() => sendEmbedReaction("🎉")}>
                            🎉
                          </button>
                          <button type='button' className='btn btn-xs btn-outline-secondary' onClick={() => sendEmbedReaction("🙌")}>
                            🙌
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className='live-embed-toolbar'>
            <button
              type='button'
              className={`toolbar-btn ${!audioAllowed || !localMediaState.audio ? "is-off" : ""}`}
              onClick={() => toggleMediaTrack("audio", !localMediaState.audio)}
              disabled={!audioAllowed}
              title={audioAllowed ? (localMediaState.audio ? "Mute" : "Unmute") : "Audio blocked"}
            >
              <i className={`ri-${localMediaState.audio ? "mic-line" : "mic-off-line"}`} />
            </button>
            <button
              type='button'
              className={`toolbar-btn ${!videoAllowed || !localMediaState.video ? "is-off" : ""}`}
              onClick={() => toggleMediaTrack("video", !localMediaState.video)}
              disabled={!videoAllowed}
              title={videoAllowed ? (localMediaState.video ? "Stop video" : "Start video") : "Video blocked"}
            >
              <i className={`ri-video-line ${!videoAllowed || !localMediaState.video ? "blocked" : ""}`} />
            </button>
            <button
              type='button'
              className={`toolbar-btn ${!screenShareAllowed ? "is-off" : ""}`}
              onClick={() => (screenShareActive ? stopScreenShare() : startScreenShare())}
              disabled={!screenShareAllowed || embeddedStageStatus !== "live"}
              title={
                !screenShareAllowed
                  ? "Screen share blocked by instructor"
                  : screenShareActive
                  ? "Stop share"
                  : "Share screen"
              }
            >
              <i className={`ri-computer-line${!screenShareAllowed ? ' blocked' : ''}`} />
            </button>
            <button
              type='button'
              className='toolbar-btn'
              onClick={() => setShowParticipantsPanel((prev) => !prev)}
              title={showParticipantsPanel ? "Hide participants" : "Participants"}
            >
              <i className='ri-user-3-line' />
            </button>
            <button
              type='button'
              className='toolbar-btn'
              onClick={() => setShowChatPanel((prev) => !prev)}
              title={showChatPanel ? "Hide chat" : "Chat"}
            >
              <i className='ri-chat-3-line' />
            </button>
            <button
              type='button'
              className='toolbar-btn'
              onClick={() => alert("Reactions coming soon")}
              title='Reactions'
            >
              <i className='ri-emotion-line' />
            </button>
            <button type='button' className='toolbar-btn leave-btn' onClick={handleLeaveLiveView}>
              <i className='ri-logout-box-r-line' title='Leave' />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className='course-home-video mb-20' ref={playerContainerRef}>
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
    );
  };

  const renderSidebar = () => (
    <div className='course-home-tabs d-flex align-items-center justify-content-between gap-12 flex-wrap'>
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
      {isEnrolled && liveSessionState.session?.isLive && liveSessionState.session?.isJoinable ? (
        <button
          type='button'
          className='btn btn-main rounded-pill course-live-cta'
          onClick={() =>
            navigate(`/${programme}/${course}/home/live/${liveSessionState.session.id}`, {
              replace: false,
            })
          }
        >
          Join live class
        </button>
      ) : null}
    </div>
  );

  const renderNotesModal = () => {
    if (!notesModalOpen || !notesTarget?.hasNotes) {
      return null;
    }
    const noteMeta = notesTarget.notesMeta || buildEmptyLectureNotes();
    const summaryParts = [];
    if (noteMeta.fileName) {
      summaryParts.push(noteMeta.fileName);
    }
    if (noteMeta.pages) {
      summaryParts.push(`${noteMeta.pages} pages`);
    }
    if (noteMeta.bytes) {
      const readable = formatFileSize(noteMeta.bytes);
      if (readable) {
        summaryParts.push(readable);
      }
    }
    const summary = summaryParts.join(" • ");
    let content = null;
    if (notesState.status === "loading") {
      content = (
        <div className='course-notes-viewer course-notes-viewer--loading'>
          <div className='d-flex align-items-center gap-2'>
            <span className='spinner-border spinner-border-sm text-main-500' role='status' aria-hidden='true' />
            <span>Preparing secure preview…</span>
          </div>
        </div>
      );
    } else if (notesState.status === "error") {
      content = (
        <div className='course-notes-viewer'>
          <p className='text-danger mb-12'>{notesState.error || "Unable to load notes."}</p>
          <button type='button' className='btn btn-sm btn-outline-primary' onClick={handleNotesRetry}>
            Try again
          </button>
        </div>
      );
    } else if (notesState.status === "ready" && notesState.pages.length) {
      content = (
        <div className='course-notes-viewer'>
          {notesState.pages.map((src, index) => (
            <div className='course-notes-page' key={`${notesState.lectureId}-${index}`}>
              <img src={src} alt={`Lecture notes page ${index + 1}`} loading='lazy' />
            </div>
          ))}
        </div>
      );
    } else {
      content = (
        <div className='course-notes-viewer course-notes-viewer--loading'>
          <div className='d-flex align-items-center gap-2'>
            <span className='spinner-border spinner-border-sm text-main-500' role='status' aria-hidden='true' />
            <span>Preparing secure preview…</span>
          </div>
        </div>
      );
    }

    return (
      <div className='course-notes-modal' role='dialog' aria-modal='true' aria-label='Lecture notes viewer'>
        <div className='course-notes-modal__backdrop' onClick={closeNotesModal} />
        <div className='course-notes-modal__body'>
          <div className='course-notes-modal__header'>
            <div>
              <p className='course-home-panel__eyebrow mb-8'>Lecture Notes</p>
              <h4 className='course-home-panel__title mb-4'>{notesTarget.lectureTitle || "Lecture"}</h4>
              {summary ? <p className='text-neutral-600 mb-0 small'>{summary}</p> : null}
            </div>
            <div className='d-flex align-items-center gap-2'>
              <span className='course-notes-protection-badge' aria-label='Protected notes'>
                Protected
              </span>
              <button type='button' className='course-notes-modal__close' onClick={closeNotesModal} aria-label='Close notes viewer'>
                ×
              </button>
            </div>
          </div>
          <div className='course-notes-modal__content'>{content}</div>
        </div>
      </div>
    );
  };

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
          {renderHeroMedia()}
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

