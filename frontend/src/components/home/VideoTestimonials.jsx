import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Slider from "react-slick";
import { listTestimonials } from "../../services/testimonialService";

const cardStyles = {
  wrapper: {
    position: "relative",
    borderRadius: 28,
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(16,24,40,0.08)",
    background: "#fff",
    margin: "0 auto",
  },
  thumb: {
    display: "block",
    width: "100%",
    height: 0,
    paddingBottom: "56.25%",
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "brightness(0.95)",
  },
};

const VideoTestimonials = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [pendingPlayId, setPendingPlayId] = useState(null);
  const videoRefs = useRef({});
  const containerRef = useRef(null);

  const normalizeKey = useCallback((value) => (value == null ? null : String(value)), []);

  const isClonedSlide = (node) =>
    Boolean(node?.closest(".slick-slide")?.classList?.contains("slick-cloned"));

  const cleanVideoRefs = useCallback(() => {
    const store = videoRefs.current;
    Object.keys(store).forEach((id) => {
      const bucket = store[id];
      if (!bucket || !(bucket instanceof Set)) {
        delete store[id];
        return;
      }
      [...bucket].forEach((node) => {
        if (!node || !node.isConnected) {
          bucket.delete(node);
        }
      });
      if (!bucket.size) {
        delete store[id];
      }
    });
  }, []);

  const pauseBucket = useCallback((bucket, resetTime = false) => {
    if (!bucket) return;
    bucket.forEach((node) => {
      try {
        node.pause();
        if (resetTime) {
          node.currentTime = 0;
        }
      } catch (e) {
        /* ignore */
      }
    });
  }, []);

  const pauseByKey = useCallback(
    (key, resetTime = false) => {
      if (!key) return;
      cleanVideoRefs();
      const bucket = videoRefs.current[key];
      pauseBucket(bucket, resetTime);
    },
    [cleanVideoRefs, pauseBucket]
  );

  const pauseAllExcept = useCallback(
    (keyToKeep = null) => {
      cleanVideoRefs();
      Object.entries(videoRefs.current).forEach(([id, bucket]) => {
        if (keyToKeep && id === keyToKeep) return;
        pauseBucket(bucket, true);
      });
    },
    [cleanVideoRefs, pauseBucket]
  );

  const getPrimaryVideoNode = useCallback(
    (rawKey) => {
      const key = normalizeKey(rawKey);
      if (!key) return null;
      const bucket = videoRefs.current[key];
      if (!bucket) return null;
      for (const node of bucket) {
        if (node && !isClonedSlide(node)) {
          return node;
        }
      }
      return bucket.values().next().value || null;
    },
    [normalizeKey]
  );

  const handleVideoRef = useCallback(
    (rawKey, node) => {
      const key = normalizeKey(rawKey);
      if (!key) return;
      const store = videoRefs.current;
      if (node) {
        if (!store[key]) {
          store[key] = new Set();
        }
        store[key].add(node);
        const isClone = isClonedSlide(node);
        if (!isClone && pendingPlayId === key) {
          node
            .play()
            .catch(() => {
              /* ignore */
            })
            .finally(() => setPendingPlayId(null));
        }
      } else {
        cleanVideoRefs();
      }
    },
    [cleanVideoRefs, normalizeKey, pendingPlayId]
  );

  // Fetch testimonials from backend (Cloudinary-backed)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await listTestimonials();
        if (isMounted) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (isMounted) {
          setItems([]);
          setError(e?.message || "Unable to load testimonials.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const keyToKeep = normalizeKey(activeId);
    pauseAllExcept(keyToKeep);
  }, [activeId, normalizeKey, pauseAllExcept]);

  useEffect(
    () => () => {
      pauseAllExcept(null);
    },
    [pauseAllExcept]
  );

  useEffect(() => {
    const handleClickAway = (e) => {
      const root = containerRef.current;
      if (!root || root.contains(e.target)) return;
      setActiveId(null);
    };
    document.addEventListener("pointerdown", handleClickAway);
    return () => document.removeEventListener("pointerdown", handleClickAway);
  }, []);

  const togglePlayback = (rawKey) => {
    const key = normalizeKey(rawKey);
    if (!key) return;
    cleanVideoRefs();
    if (activeId !== key) {
      pauseAllExcept(null);
      setPendingPlayId(key); // request play once video mounts
      setActiveId(key);
      return;
    }
    // If the card is already active, stop playback and revert to the poster state
    pauseByKey(key, true);
    setPendingPlayId(null);
    setActiveId(null);
  };

  const ArrowBtn = ({ className, style, onClick }) => {
    const isPrev = className?.includes("prev");
    return (
      <button
        type="button"
        className={className}
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: 9999,
          background: "hsl(var(--main))",
          color: "hsl(var(--white))",
          boxShadow: "0 4px 14px rgba(0,0,0,.15)",
          border: 0,
        }}
        onClick={onClick}
        aria-label={isPrev ? "Previous" : "Next"}
      >
        {isPrev ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </button>
    );
  };

  const sliderSettings = {
    slidesToShow: 4,
    slidesToScroll: 1,
    arrows: true,
    prevArrow: <ArrowBtn />,
    nextArrow: <ArrowBtn />,
    dots: false,
    autoplay: false,
    infinite: true,
    speed: 500,
    responsive: [
      { breakpoint: 1399, settings: { slidesToShow: 4 } },
      { breakpoint: 1200, settings: { slidesToShow: 3 } },
      { breakpoint: 992, settings: { slidesToShow: 2, infinite: true } },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1.12, // keep a modest peek of the next card
          variableWidth: false,
          centerMode: false,
          centerPadding: "0px",
          swipeToSlide: true,
          arrows: false,
          infinite: true,
        },
      },
      {
        breakpoint: 576,
        settings: {
          slidesToShow: 1.12, // keep a modest peek of the next card
          variableWidth: false,
          centerMode: false,
          centerPadding: "0px",
          swipeToSlide: true,
          arrows: false,
          infinite: true,
        },
      },
    ],
  };

  const showSkeleton = loading || error || !items.length;
  const skeletonCards = useMemo(() => new Array(4).fill(null), []);
  const skeletonStyle = {
    background: "linear-gradient(90deg, #f1f4f9 25%, #e6ebf2 50%, #f1f4f9 75%)",
    backgroundSize: "200% 100%",
    animation: "video-skeleton 1.4s ease-in-out infinite",
  };
  const skeletonKeyframes = `
    @keyframes video-skeleton {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  const mobileHeroStyles = `
    @media (max-width: 575.98px) {
      .video-testimonials-section {
        background: linear-gradient(180deg, #e6f2f8 0%, #eef5fb 55%, #f7fbff 100%);
        padding-top: 48px;
        padding-bottom: 48px;
      }
      .video-testimonials-section .container {
        max-width: none;
        padding-inline: 0;
      }
      .video-testimonials-section .row {
        margin: 0;
      }
      .video-testimonials-section .row > div {
        padding-inline: 20px;
      }
      .video-reels-slider .slick-list {
        overflow: visible;
      }
      .video-reels-slider .slick-slide {
        transition: transform 0.25s ease, opacity 0.25s ease;
      }
      .video-reels-slider .slick-slide > div {
        display: flex;
        justify-content: center;
        padding-inline: 0;
      }
      .video-testimonial-card {
        max-width: 320px;
        width: 86vw;
        margin: 0 auto 8px;
        border-radius: 28px;
        box-shadow: 0 18px 42px rgba(0, 0, 0, 0.25);
        overflow: hidden;
      }
      .video-testimonial-card > div {
        border-radius: 28px;
      }
      .video-testimonial-card::before {
        content: "";
        position: absolute;
        inset: -16%;
        background: radial-gradient(circle at 50% 20%, rgba(0, 150, 199, 0.35), rgba(0, 0, 0, 0.15));
        filter: blur(26px);
        z-index: -1;
        border-radius: 32px;
      }
    }
  `;

  return (
    <section className="video-testimonials-section py-64" ref={containerRef}>
      <style>{skeletonKeyframes + mobileHeroStyles}</style>
      <div className="container">
        <div className="row justify-content-center text-center mb-24">
          <div className="col-xl-7 col-lg-8">
            <h2 className="mb-0 text-neutral-900">Hear From Our Students</h2>
          </div>
        </div>

        <div style={{ minHeight: 420 }}>
          {showSkeleton ? (
            <div className="video-reels-slider" style={{ display: "flex", gap: 24 }}>
              {skeletonCards.map((_, idx) => (
                <div className="px-12 flex-grow-1" key={`video-skeleton-${idx}`}>
                  <div className="video-testimonial-card" style={{ ...cardStyles.wrapper, height: "100%" }}>
                    <div className="video-testimonial-frame video-testimonial-skeleton">
                      <div style={{ ...skeletonStyle, position: "absolute", inset: 0, borderRadius: 24 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Slider {...sliderSettings} className="video-reels-slider">
              {items.map((item, idx) => {
                const thumb = item.thumbnailUrl || undefined;
                const key = normalizeKey(item.id ?? idx);
                const altText = item.name ? `${item.name}'s testimonial` : "Student testimonial";
                const isActive = activeId === key;
                return (
                  <div className="px-12" key={key}>
                    <div style={{ ...cardStyles.wrapper }} className="video-testimonial-card">
                      <div className="video-testimonial-frame">
                        {isActive ? (
                          <video
                            ref={(node) => handleVideoRef(key, node)}
                            playsInline
                            controls
                            preload="metadata"
                            poster={thumb}
                            src={item.playbackUrl}
                            crossOrigin="anonymous"
                            onPause={() => pauseByKey(key)}
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlayback(key);
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
                        ) : (
                          <>
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={altText}
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  backgroundColor: "#0b1120",
                                }}
                                loading="lazy"
                              />
                            ) : (
                              <div
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  background: "#0b1120",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#fff",
                                  fontSize: 14,
                                  letterSpacing: 0.2,
                                }}
                                aria-hidden="true"
                              />
                            )}
                            <button
                              type="button"
                              aria-label="Play testimonial"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePlayback(key);
                              }}
                              style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: 0,
                                background: "transparent",
                                cursor: "pointer",
                              }}
                            >
                              <span
                                style={{
                                  width: 64,
                                  height: 64,
                                  borderRadius: "50%",
                                  background: "rgba(0,0,0,0.6)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxShadow: "0 8px 22px rgba(0,0,0,0.25)",
                                }}
                              >
                                <svg
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M8.5 6.75L17 12L8.5 17.25V6.75Z"
                                    fill="#fff"
                                    stroke="#fff"
                                    strokeWidth="1.2"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </Slider>
          )}
        </div>
      </div>
    </section>
  );
};

export default VideoTestimonials;
