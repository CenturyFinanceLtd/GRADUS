import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { listExpertVideos } from "../../services/expertVideoService";

const ExpertVideos = () => {
  const [videos, setVideos] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [direction, setDirection] = useState("next");
  const videoRef = useRef(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const { ref: viewRef, inView } = useInView({ threshold: 0.35 });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await listExpertVideos();
        if (!isMounted) return;
        setVideos(Array.isArray(data) ? data : []);
        setIndex(0);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "Unable to load expert videos right now.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const count = videos.length;
  const currentVideo = count ? videos[index] : null;
  const prevVideo = count > 1 ? videos[(index - 1 + count) % count] : null;
  const nextVideo = count > 1 ? videos[(index + 1) % count] : null;
  const canNavigate = count > 1;

  const goPrev = () => {
    if (!canNavigate) return;
    setDirection("prev");
    setIndex((idx) => (idx - 1 + count) % count);
  };

  const goNext = () => {
    if (!canNavigate) return;
    setDirection("next");
    setIndex((idx) => (idx + 1) % count);
  };

  const goToIndex = (targetIdx) => {
    if (!canNavigate || targetIdx === index) return;
    setDirection(targetIdx > index ? "next" : "prev");
    setIndex(targetIdx);
  };

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    setVideoLoaded(false);
    const playSafe = async () => {
      try {
        if (!el.muted) {
          el.muted = true; // ensure autoplay allowed; user can unmute manually
        }
        el.currentTime = 0;
        if (inView) {
          await el.play();
        } else {
          el.pause();
        }
      } catch (err) {
        // autoplay might be blocked; ignore
      }
    };
    playSafe();
  }, [index, currentVideo?.playbackUrl, inView]);

  return (
    <section className="expert-videos-section py-64" ref={viewRef}>
      <div className="container">
        <div className="expert-videos-header text-center mb-32">
          <p className="expert-videos-eyebrow">
            What <span>Expert&apos;s</span> Say?
          </p>
        </div>

        <div className="expert-videos-stage" aria-live="polite">
          <div className="expert-video-stack">
            {prevVideo ? (
              <div
                className="expert-video-card is-prev"
                style={{
                  backgroundImage: prevVideo.thumbnailUrl ? `url(${prevVideo.thumbnailUrl})` : undefined,
                }}
                aria-hidden="true"
              />
            ) : null}

            <div className="expert-video-card is-current">
              <div style={{ position: "relative", minHeight: 400 }}>
                {(loading || (!videoLoaded && currentVideo)) ? (
                  <div className="expert-video-skeleton" aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 1 }} />
                ) : null}
                {loading ? null : currentVideo ? (
                  <video
                    key={currentVideo.id || index}
                    src={currentVideo.playbackUrl}
                    poster={currentVideo.thumbnailUrl || undefined}
                    controls
                    playsInline
                    autoPlay
                    muted
                    className={`expert-video-player animate-${direction}`}
                    ref={videoRef}
                    onLoadedData={() => setVideoLoaded(true)}
                    style={{ position: "relative", zIndex: 2 }}
                  />
                ) : (
                  <div className="expert-video-empty">
                    <p>{error || "Expert videos will appear here soon."}</p>
                  </div>
                )}
              </div>
            </div>

            {nextVideo ? (
              <div
                className="expert-video-card is-next"
                style={{
                  backgroundImage: nextVideo.thumbnailUrl ? `url(${nextVideo.thumbnailUrl})` : undefined,
                }}
                aria-hidden="true"
              />
            ) : null}
            {canNavigate ? (
              <div className="expert-video-nav is-floating">
                <button type="button" onClick={goPrev} aria-label="Previous expert video">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button type="button" onClick={goNext} aria-label="Next expert video">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {canNavigate ? (
          <div className="expert-video-indicators" role="tablist" aria-label="Expert video carousel">
            {videos.map((video, idx) => (
              <button
                key={video.id || idx}
                type="button"
                className={`expert-indicator${idx === index ? " is-active" : ""}`}
                aria-label={`Show expert video ${video.title || idx + 1}`}
                aria-pressed={idx === index}
                onClick={() => goToIndex(idx)}
              />
            ))}
          </div>
        ) : null}

        {error && !loading ? <p className="text-center text-danger mt-16">{error}</p> : null}
      </div>
    </section>
  );
};

export default ExpertVideos;
