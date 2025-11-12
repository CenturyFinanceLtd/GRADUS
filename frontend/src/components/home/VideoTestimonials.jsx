import { useState, useMemo, useEffect } from "react";
import ModalVideo from "react-modal-video";
import Slider from "react-slick";
import { listTestimonials } from "../../services/testimonialService";

const cardStyles = {
  wrapper: {
    position: "relative",
    borderRadius: 16,
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
  },
  playWrap: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: 72,
    height: 72,
    borderRadius: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(2px)",
    background: "linear-gradient(180deg, rgba(255,255,255,.75), rgba(0,0,0,.25))",
    boxShadow: "0 2px 10px rgba(0,0,0,.12), inset 0 0 0 1px rgba(255,255,255,.6)",
  },
  playIcon: {
    width: 0,
    height: 0,
    borderTop: "12px solid transparent",
    borderBottom: "12px solid transparent",
    borderLeft: "18px solid rgba(20,31,54,0.9)",
    marginLeft: 4,
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
    autoplay: true,
    infinite: true,
    speed: 500,
    responsive: [
      { breakpoint: 1399, settings: { slidesToShow: 4 } },
      { breakpoint: 1200, settings: { slidesToShow: 3 } },
      { breakpoint: 992, settings: { slidesToShow: 2 } },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1.5,
          centerMode: true,
          centerPadding: "16px",
          swipeToSlide: true,
        },
      },
    ],
  };

  return (
    <section className="py-64">
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
            return (
              <div className="px-12" key={item.id + idx}>
                <div style={cardStyles.wrapper}>
                  <button
                    type="button"
                    aria-label={disablePlayback ? "Playback disabled" : "Play testimonial"}
                    onClick={disablePlayback ? undefined : () => openVideo(item.playbackUrl)}
                    aria-disabled={disablePlayback}
                    tabIndex={disablePlayback ? -1 : 0}
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 2,
                      cursor: disablePlayback ? "not-allowed" : "pointer",
                      pointerEvents: disablePlayback ? "none" : "auto",
                      background: "transparent",
                      border: 0,
                    }}
                  />
                  <div
                    style={{
                      ...cardStyles.thumb,
                      // 9:16 vertical reels
                      paddingBottom: "177.78%",
                      backgroundColor: thumb ? "#000" : "#000",
                      backgroundImage: showBlackPlaceholders || !thumb ? "none" : `url('${thumb}')`,
                    }}
                  />
                  {showBlackPlaceholders ? null : (
                    <div style={cardStyles.playWrap}>
                      <div style={cardStyles.playIcon} />
                    </div>
                  )}
                </div>
                <div className="d-flex align-items-center gap-12 mt-12">
                  <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 9999, background: "#000" }} />
                  <div>
                    <div className="text-md fw-semibold text-neutral-900">{item.name}</div>
                    <div className="text-sm text-neutral-600">{item.role}</div>
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
          }}
        >
          <div style={{ width: "min(480px, 92vw)", borderRadius: 12, overflow: "hidden", background: "#000" }}>
            <video src={videoSrc} controls autoPlay playsInline style={{ width: "100%", height: "auto" }} />
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default VideoTestimonials;
