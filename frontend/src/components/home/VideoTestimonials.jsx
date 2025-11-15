import { useState, useMemo, useEffect } from "react";
import ModalVideo from "react-modal-video";
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
  playWrap: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: 68,
    height: 68,
    borderRadius: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(3px)",
    background: "linear-gradient(180deg, rgba(255,255,255,.75), rgba(0,0,0,.25))",
    boxShadow: "0 12px 24px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.45)",
    zIndex: 2,
    pointerEvents: "none",
  },
  playIcon: {
    width: 0,
    height: 0,
    borderTop: "11px solid transparent",
    borderBottom: "11px solid transparent",
    borderLeft: "17px solid rgba(20,31,54,0.9)",
    marginLeft: 4,
  },
  metaWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    padding: "12px 14px",
    borderRadius: 20,
    background: "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(2,6,23,0.65))",
    color: "#fff",
    display: "flex",
    gap: 12,
    alignItems: "center",
    boxShadow: "0 15px 35px rgba(0,0,0,0.35)",
    backdropFilter: "blur(8px)",
    zIndex: 1,
    pointerEvents: "none",
  },
  metaAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    flexShrink: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundColor: "#0f172a",
    border: "2px solid rgba(255,255,255,0.4)",
  },
  metaName: {
    margin: 0,
    fontWeight: 600,
    fontSize: "1rem",
    color: "#fff",
  },
  metaRole: {
    margin: 0,
    fontSize: "0.85rem",
    color: "rgba(255,255,255,0.75)",
  },
};

const VideoTestimonials = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [videoSrc, setVideoSrc] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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
  const showBlackPlaceholders = false;

  const openVideo = (src) => {
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
            <a href="#video-testimonials" className="text-main fw-medium d-inline-block mb-8">
              Curious how people are using Gradus?
            </a>
            <h2 className="mb-0 text-neutral-900">Hear what our customers are saying</h2>
          </div>
        </div>

        {loading ? null : (
        <Slider {...sliderSettings} className="video-reels-slider">
          {items.map((item, idx) => {
            const thumb = item.thumbnailUrl || undefined;
            const avatarSrc = item.avatarUrl || thumb;
            const displayName = item.name || "Gradus Learner";
            const displayRole = item.role || "Gradus Community";
            return (
              <div className="px-12" key={item.id + idx}>
                <div style={cardStyles.wrapper} className="video-testimonial-card">
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
                      ...cardStyles.thumb,
                      paddingBottom: "177.78%",
                      backgroundColor: "#0b1120",
                      backgroundImage: showBlackPlaceholders || !thumb ? "none" : `url('${thumb}')`,
                    }}
                  />
                  {showBlackPlaceholders ? null : (
                    <div style={cardStyles.playWrap}>
                      <div style={cardStyles.playIcon} />
                    </div>
                  )}
                  <div style={cardStyles.metaWrap}>
                    <div
                      style={{
                        ...cardStyles.metaAvatar,
                        backgroundImage: avatarSrc ? `url('${avatarSrc}')` : undefined,
                      }}
                      aria-hidden="true"
                    />
                    <div>
                      <p style={cardStyles.metaName} className="mb-0">
                        {displayName}
                      </p>
                      <p style={cardStyles.metaRole} className="mb-0">
                        {displayRole}
                      </p>
                    </div>
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
