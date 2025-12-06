import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Slider from "react-slick";
import { listTestimonials } from "../../services/testimonialService";

const isClonedSlide = (node) => Boolean(node?.closest(".slick-slide")?.classList?.contains("slick-cloned"));
const normalizeKey = (value) => (value == null ? null : String(value));

const VideoTestimonials = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const videoMap = useRef({});
  const suppressPauseRef = useRef(false);
  const containerRef = useRef(null);

  const pauseAll = useCallback(() => {
    suppressPauseRef.current = true;
    const trackedNodes = Object.values(videoMap.current);
    const domNodes =
      typeof document !== "undefined"
        ? Array.from(document.querySelectorAll(".video-testimonial-frame video"))
        : [];
    [...trackedNodes, ...domNodes].forEach((node) => {
      if (!node) return;
      try {
        node.pause();
        node.currentTime = 0;
      } catch (_) {
        /* ignore */
      }
    });
    setTimeout(() => {
      suppressPauseRef.current = false;
    }, 0);
  }, []);

  const registerVideo = useCallback((rawKey, node) => {
    const key = normalizeKey(rawKey);
    if (!key) return;
    if (node && !isClonedSlide(node)) {
      videoMap.current[key] = node;
    } else if (!node) {
      delete videoMap.current[key];
    }
  }, []);

  const handleCardToggle = (rawKey, evt) => {
    const key = normalizeKey(rawKey);
    if (!key) return;
    const fallbackNode =
      evt?.currentTarget?.closest(".video-testimonial-frame")?.querySelector("video") || null;
    const node = videoMap.current[key] || fallbackNode;
    if (activeId === key) {
      if (node) {
        try {
          node.pause();
        } catch (_) {
          /* ignore */
        }
      }
      setActiveId(null);
      return;
    }
    pauseAll();
    setActiveId(key);
    if (node) {
      const playPromise = node.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          /* autoplay might still be blocked */
        });
      }
    }
  };

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

  const handleBeforeChange = useCallback(() => {
    pauseAll();
    setActiveId(null);
  }, [pauseAll]);

  useEffect(() => {
    const handleClickAway = (e) => {
      const root = containerRef.current;
      if (!root || root.contains(e.target)) return;
      pauseAll();
      setActiveId(null);
    };
    document.addEventListener("pointerdown", handleClickAway);
    return () => document.removeEventListener("pointerdown", handleClickAway);
  }, [pauseAll]);

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
    speed: 360,
    cssEase: "ease-out",
    swipe: true,
    swipeToSlide: true,
    touchMove: true,
    draggable: true,
    edgeFriction: 0.08,
    touchThreshold: 6,
    waitForAnimate: false,
    beforeChange: handleBeforeChange,
    responsive: [
      { breakpoint: 1399, settings: { slidesToShow: 4 } },
      { breakpoint: 1200, settings: { slidesToShow: 3 } },
      { breakpoint: 992, settings: { slidesToShow: 2, infinite: true } },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1.2,
          variableWidth: false,
          centerMode: false,
          centerPadding: "0px",
          swipe: true,
          swipeToSlide: true,
          touchMove: true,
          draggable: true,
          edgeFriction: 0.08,
          touchThreshold: 6,
          arrows: false,
          infinite: true,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 576,
        settings: {
          slidesToShow: 1.2,
          variableWidth: false,
          centerMode: false,
          centerPadding: "0px",
          swipe: true,
          swipeToSlide: true,
          touchMove: true,
          draggable: true,
          edgeFriction: 0.08,
          touchThreshold: 6,
          arrows: false,
          infinite: true,
          slidesToScroll: 1,
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

  const cardStyles = useMemo(
    () => ({
      wrapper: {
        position: "relative",
        borderRadius: 28,
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(16,24,40,0.08)",
        background: "#fff",
        margin: "0 auto",
      },
    }),
    []
  );

  const autoPlayActiveVideo = useCallback((key) => {
    if (!key) return undefined;
    const node = videoMap.current[key];
    if (!node) return undefined;
    let cancelled = false;

    const tryPlay = () => {
      if (cancelled || !node) return;
      const promise = node.play();
      if (promise?.catch) {
        promise.catch(() => {
          /* autoplay might still be blocked */
        });
      }
    };

    if (node.readyState >= 2) {
      tryPlay();
      return () => {
        cancelled = true;
      };
    }

    const handleLoaded = () => {
      node.removeEventListener("loadeddata", handleLoaded);
      tryPlay();
    };
    node.addEventListener("loadeddata", handleLoaded);

    return () => {
      cancelled = true;
      node.removeEventListener("loadeddata", handleLoaded);
    };
  }, []);

  useEffect(() => {
    if (!activeId) return undefined;
    return autoPlayActiveVideo(activeId);
  }, [activeId, autoPlayActiveVideo]);

  return (
    <section className="video-testimonials-section py-64" ref={containerRef}>
      <style>{skeletonKeyframes}</style>
      <div className="container">
        <div className="row justify-content-center text-center mb-24">
          <div className="col-xl-7 col-lg-8">
            <h2 className="mb-0 l1-head text-neutral-900">Hear From Our Students</h2>
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
                      <div
                        className="video-testimonial-frame"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleCardToggle(key, e)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleCardToggle(key, e);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <video
                          ref={(node) => registerVideo(key, node)}
                          playsInline
                          controls={isActive}
                          preload="metadata"
                          poster={thumb}
                          src={item.playbackUrl}
                          crossOrigin="anonymous"
                          onEnded={() => setActiveId(null)}
                          onPause={() => {
                            if (suppressPauseRef.current) return;
                            if (activeId === key) setActiveId(null);
                          }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            backgroundColor: "#0b1120",
                            pointerEvents: isActive ? "auto" : "none",
                          }}
                          aria-label={altText}
                        />
                        {!isActive ? (
                          <button
                            type="button"
                            aria-label="Play testimonial"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardToggle(key, e);
                            }}
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: 0,
                              background: "linear-gradient(180deg, rgba(3,7,18,0) 35%, rgba(3,7,18,0.65) 100%)",
                              cursor: "pointer",
                              color: "#fff",
                            }}
                          >
                            <span
                              style={{
                                width: 64,
                                height: 64,
                                borderRadius: "50%",
                                background: "rgba(0,0,0,0.65)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 8px 22px rgba(0,0,0,0.25)",
                              }}
                            >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 7L16 12L9 17V7Z" fill="#fff" stroke="#fff" strokeWidth="1.1" strokeLinejoin="round" />
                              </svg>
                            </span>
                          </button>
                        ) : null}
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
