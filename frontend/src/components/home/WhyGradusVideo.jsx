import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { fetchWhyGradusVideo } from "../../services/whyGradusVideoService";

const WhyGradusVideo = () => {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoAspect, setVideoAspect] = useState(null);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const { ref: viewRef, inView } = useInView({ threshold: 0.35 });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await fetchWhyGradusVideo();
        if (isMounted) {
          setItem(data);
          setError(null);
        }
      } catch (e) {
        if (isMounted) {
          setItem(null);
          setError(e?.message || "Unable to load video.");
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
    const el = videoRef.current;
    if (!el || loading) return;
    setVideoLoaded(false);
    const playSafe = async () => {
      try {
        el.muted = true;
        el.currentTime = 0;
        if (inView) {
          await el.play();
        } else {
          el.pause();
        }
      } catch {
        // ignore autoplay block
      }
    };
    playSafe();
  }, [item, loading, inView]);

  const handleEnded = () => {
    const el = videoRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  };

  const handleMetadata = () => {
    const el = videoRef.current;
    if (!el) return;
    const { videoWidth, videoHeight } = el;
    if (videoWidth > 0 && videoHeight > 0) {
      setVideoAspect(videoWidth / videoHeight);
    }
  };

  const videoSrc = item?.secureUrl;
  const poster = item?.thumbnailUrl;
  const title = item?.title;
  const subtitle = item?.subtitle;
  const description = item?.description;
  const ctaLabel = item?.ctaLabel;
  const ctaHref = item?.ctaHref;
  const pillLabel = subtitle || "Why Gradus";
  const showSkeleton = loading && !videoSrc;
  const contentSkeleton = loading && !item;
  const skeletonKeyframes = `
    @keyframes why-gradus-skel {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  const skeletonStyle = {
    background: "linear-gradient(90deg, #f1f4f9 25%, #e6ebf2 50%, #f1f4f9 75%)",
    backgroundSize: "200% 100%",
    animation: "why-gradus-skel 1.3s ease-in-out infinite",
    borderRadius: 12,
  };

  return (
    <section className="why-gradus-video-section py-64" ref={viewRef}>
      <style>{skeletonKeyframes}</style>
      <div className="container">

        <div className="row gy-4 align-items-center" style={{ minHeight: 420 }}>
          <div className="col-lg-5">
            <div className="mb-16">
              <div className="why-gradus-pill">{pillLabel}</div>
            </div>
            {contentSkeleton ? (
              <>
                <div style={{ ...skeletonStyle, height: 24, width: "85%", marginBottom: 12 }} />
                <div style={{ ...skeletonStyle, height: 24, width: "70%", marginBottom: 12 }} />
                <div style={{ ...skeletonStyle, height: 16, width: "95%", marginBottom: 8 }} />
                <div style={{ ...skeletonStyle, height: 16, width: "92%", marginBottom: 8 }} />
                <div style={{ ...skeletonStyle, height: 16, width: "80%", marginBottom: 8 }} />
                <div style={{ ...skeletonStyle, height: 16, width: "65%", marginBottom: 8 }} />
                <div style={{ ...skeletonStyle, height: 16, width: "72%", marginBottom: 8 }} />
              </>
            ) : (
              <>
                {title ? <h3 className="why-gradus-title mt-12">{title}</h3> : null}
                {description ? <p className="why-gradus-desc mt-12">{description}</p> : null}
                {ctaLabel && ctaHref ? (
                  <a className="why-gradus-cta mt-12 d-inline-flex align-items-center gap-8" href={ctaHref}>
                    {ctaLabel} <i className="ph-bold ph-arrow-up-right" aria-hidden="true" />
                  </a>
                ) : null}
              </>
            )}
          </div>
          <div className="col-lg-7">
            <div className="why-gradus-video-frame">
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: videoAspect || 16 / 9,
                }}
              >
                {showSkeleton ? (
                  <div
                    className="why-gradus-skeleton"
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 1,
                      borderRadius: 16,
                      ...skeletonStyle,
                    }}
                  />
                ) : null}
                {videoSrc ? (
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    poster={poster || undefined}
                    controls
                    playsInline
                    muted
                    onEnded={handleEnded}
                    onLoadedMetadata={handleMetadata}
                    onLoadedData={() => setVideoLoaded(true)}
                    style={{
                      position: "relative",
                      zIndex: 2,
                      display: videoLoaded ? "block" : "none",
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyGradusVideo;
