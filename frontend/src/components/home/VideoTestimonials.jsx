import { useState, useEffect, useRef } from "react";
import Slider from "react-slick";
import { listTestimonials } from "../../services/testimonialService";

const cardStyles = {
  wrapper: {
    position: "relative",
    borderRadius: 28,
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(16,24,40,0.08)",
    background: "#fff",
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
  const [isOpen, setIsOpen] = useState(false);
  const [videoSrc, setVideoSrc] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const videoRefs = useRef({});

  // Fetch testimonials from backend (Cloudinary-backed)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await listTestimonials();
        if (isMounted) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (isMounted) setItems([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const disablePlayback = false;

  const startHoverPlayback = (id, src) => {
    const videoEl = videoRefs.current[id];
    if (!videoEl) return;
    // Always load the src to ensure playback starts
    if (videoEl.src !== src) {
      videoEl.src = src;
      videoEl.load();
    }
    // Begin muted to satisfy browser autoplay and then unmute if allowed
    videoEl.muted = true;
    videoEl.currentTime = 0;
    videoEl.style.opacity = '1';
    const playPromise = videoEl.play();
    if (playPromise?.then) {
      playPromise
        .then(() => {
          videoEl.muted = false;
          videoEl.volume = 1;
        })
        .catch(() => {
          // If audible autoplay is blocked, keep it muted
          videoEl.muted = true;
          videoEl.play().catch(() => {});
        });
    }
  };

  const stopHoverPlayback = (id) => {
    const videoEl = videoRefs.current[id];
    if (!videoEl) return;
    videoEl.pause();
    videoEl.currentTime = 0;
    videoEl.muted = false;
    videoEl.style.opacity = '0';
  };

  const openVideo = (src) => {
    // Stop any inline hovers so audio doesn't continue behind the modal
    Object.keys(videoRefs.current).forEach((id) => stopHoverPlayback(id));
    setVideoSrc(src);
    setIsOpen(true);
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
          slidesToShow: 1,
          centerMode: true,
          centerPadding: "48px",
          swipeToSlide: true,
          arrows: false,
          infinite: true,
        },
      },
      {
        breakpoint: 576,
        settings: {
          slidesToShow: 1,
          centerMode: true,
          centerPadding: "34px",
          swipeToSlide: true,
          arrows: false,
          infinite: true,
        },
      },
    ],
  };

  return (
    <section className="video-testimonials-section py-64">
      <div className="container">
        <div className="row justify-content-center text-center mb-24">
          <div className="col-xl-7 col-lg-8">
            
            <h2 className="mb-0 text-neutral-900">Hear From Our Students</h2>
          </div>
        </div>

        {loading ? null : (
        <Slider {...sliderSettings} className="video-reels-slider">
          {items.map((item, idx) => {
            const thumb = item.thumbnailUrl || undefined;
            const key = item.id || idx;
            return (
              <div className="px-12" key={key}>
                <div
                  style={cardStyles.wrapper}
                  className="video-testimonial-card"
                  onMouseEnter={() => startHoverPlayback(key, item.playbackUrl)}
                  onMouseLeave={() => stopHoverPlayback(key)}
                  onFocus={() => startHoverPlayback(key, item.playbackUrl)}
                  onBlur={() => stopHoverPlayback(key)}
                >
                  <button
                    type="button"
                    aria-label={disablePlayback ? "Playback disabled" : "Play testimonial"}
                    onClick={disablePlayback ? undefined : () => openVideo(item.playbackUrl)}
                    aria-disabled={disablePlayback}
                    tabIndex={disablePlayback ? -1 : 0}
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 3,
                      cursor: disablePlayback ? "not-allowed" : "pointer",
                      pointerEvents: disablePlayback ? "none" : "auto",
                      background: "transparent",
                      border: 0,
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: 0,
                      paddingBottom: "177.78%",
                      backgroundColor: "#0b1120",
                      overflow: "hidden",
                    }}
                  >
                    <video
                      ref={(el) => {
                        if (el) videoRefs.current[key] = el;
                        else delete videoRefs.current[key];
                      }}
                      playsInline
                      muted
                      preload="metadata"
                      poster={thumb}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        backgroundColor: "#0b1120",
                        opacity: 0,
                        transition: "opacity 0.2s ease",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </Slider>
        )}
      </div>

      {/* Simple HTML5 video modal for Cloudinary playback */}
      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "min(480px, 92vw)",
              borderRadius: 16,
              overflow: "hidden",
              background: "#000",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close video"
              onClick={() => setIsOpen(false)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 36,
                height: 36,
                borderRadius: 9999,
                border: "none",
                background: "rgba(15,23,42,0.85)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <video src={videoSrc} controls autoPlay playsInline style={{ width: "100%", height: "auto" }} />
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default VideoTestimonials;
