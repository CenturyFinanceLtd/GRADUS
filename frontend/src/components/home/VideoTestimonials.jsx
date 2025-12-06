import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, A11y } from "swiper/modules";
import { listTestimonials } from "../../services/testimonialService";
import "swiper/css";
import "swiper/css/navigation";

const sliderSettings = {
  modules: [Navigation, A11y],
  slidesPerView: "auto",
  spaceBetween: 24,
  navigation: true,
  loop: true,
  breakpoints: {
    0: { slidesPerView: "auto", spaceBetween: 14, navigation: false, centeredSlides: true },
    576: { slidesPerView: "auto", spaceBetween: 16, navigation: false, centeredSlides: false },
    768: { slidesPerView: "auto", spaceBetween: 18, navigation: false },
    992: { slidesPerView: "auto", spaceBetween: 22, navigation: true },
    1200: { slidesPerView: "auto", spaceBetween: 24, navigation: true },
  },
};

const shimmerKeyframes = `
  @keyframes video-testimonial-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

const VideoTestimonials = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const videoRefs = useRef({});
  const containerRef = useRef(null);

  const registerVideo = useCallback((key, node) => {
    if (!key) return;
    const slide = node?.closest(".swiper-slide");
    if (slide?.classList?.contains("swiper-slide-duplicate")) return;
    if (node) {
      videoRefs.current[key] = node;
    } else {
      delete videoRefs.current[key];
    }
  }, []);

  const stopAll = useCallback(() => {
    Object.values(videoRefs.current).forEach((video) => {
      try {
        video.pause();
        video.currentTime = 0;
      } catch (_) {
        /* ignore */
      }
    });
    setActiveId(null);
  }, []);

  const togglePlayback = useCallback(
    (key) => {
      const video = videoRefs.current[key];
      if (!video) return;
      if (activeId === key && !video.paused) {
        video.pause();
        setActiveId(null);
        return;
      }
      stopAll();
      const playPromise = video.play();
      if (playPromise?.then) {
        playPromise.then(() => setActiveId(key)).catch(() => {
          /* autoplay may be blocked */
        });
      } else {
        setActiveId(key);
      }
    },
    [activeId, stopAll]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await listTestimonials();
        if (mounted) {
          setItems(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setItems([]);
          setError(err?.message || "Unable to load testimonials.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current || containerRef.current.contains(event.target)) return;
      stopAll();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [stopAll]);

  const skeletonCards = useMemo(() => new Array(4).fill(null), []);
  const skeletonStyle = useMemo(
    () => ({
      width: "100%",
      height: "100%",
      borderRadius: 28,
      background: "linear-gradient(120deg, #eef2f6 0%, #dae2ec 50%, #eef2f6 100%)",
      backgroundSize: "200% 100%",
      animation: "video-testimonial-shimmer 1.5s ease-in-out infinite",
    }),
    []
  );
  const playButtonStyle = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: 0,
    background: "linear-gradient(180deg, rgba(3,7,18,0) 35%, rgba(3,7,18,0.65) 100%)",
    cursor: "pointer",
  };
  const playIconStyle = {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "rgba(0,0,0,0.65)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 22px rgba(0,0,0,0.25)",
  };
  const showSkeleton = loading || error || !items.length;

  return (
    <section className="video-testimonials-section py-64" ref={containerRef}>
      <style>{shimmerKeyframes}</style>
      <div className="container">
        <div className="row justify-content-center text-center mb-24">
          <div className="col-xl-7 col-lg-8">
            <h2 className="mb-0 l1-head text-neutral-900">Hear From Our Students</h2>
          </div>
        </div>

        <div className="video-testimonials-slider-wrap">
          {showSkeleton ? (
            <div className="video-reels-slider" style={{ display: "flex", gap: 24 }}>
              {skeletonCards.map((_, idx) => (
                <div className="px-12 flex-grow-1" key={`testimonial-skeleton-${idx}`}>
                  <div className="video-testimonial-card">
                    <div className="video-testimonial-frame video-testimonial-skeleton" style={skeletonStyle} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Swiper
              {...sliderSettings}
              className="video-reels-slider video-reels-swiper"
              onSlideChange={stopAll}
            >
              {items.map((item, idx) => {
                const key = String(item.id ?? idx);
                const isActive = activeId === key;
                const poster = item.thumbnailUrl || undefined;
                const altText = item.name ? `${item.name}'s testimonial` : "Student testimonial";
                return (
                  <SwiperSlide key={key} className="video-reel-slide">
                    <div className="px-12">
                      <div className="video-testimonial-card">
                        <div className="video-testimonial-frame">
                          <video
                            ref={(node) => registerVideo(key, node)}
                            playsInline
                            preload="metadata"
                            poster={poster}
                            controls={isActive}
                            src={item.playbackUrl}
                            onEnded={stopAll}
                            onPause={(event) => {
                              if (event.target.paused && activeId === key) setActiveId(null);
                            }}
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              backgroundColor: "#0b1120",
                            }}
                          />
                          {!isActive ? (
                            <button
                              type="button"
                              aria-label={`Play ${altText}`}
                              onClick={() => togglePlayback(key)}
                              style={playButtonStyle}
                            >
                              <span style={playIconStyle}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M9 7L16 12L9 17V7Z" fill="#fff" stroke="#fff" strokeWidth="1.1" strokeLinejoin="round" />
                                </svg>
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Pause ${altText}`}
                              onClick={() => togglePlayback(key)}
                              style={{
                                position: "absolute",
                                inset: 0,
                                border: 0,
                                background: "transparent",
                                cursor: "pointer",
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          )}
        </div>
      </div>
    </section>
  );
};

export default VideoTestimonials;
