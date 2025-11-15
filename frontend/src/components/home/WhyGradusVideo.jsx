import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { fetchWhyGradusVideo } from "../../services/whyGradusVideoService";

const WhyGradusVideo = () => {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef(null);
  const { ref: viewRef, inView } = useInView({ threshold: 0.35 });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await fetchWhyGradusVideo();
        if (isMounted) setItem(data);
      } catch {
        if (isMounted) setItem(null);
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

  const videoSrc = item?.secureUrl;
  const poster = item?.thumbnailUrl;
  const title = item?.title;
  const subtitle = item?.subtitle;
  const description = item?.description;
  const ctaLabel = item?.ctaLabel;
  const ctaHref = item?.ctaHref;
  const pillLabel = subtitle || "Why Gradus";

  return (
    <section className="why-gradus-video-section py-64" ref={viewRef}>
      <div className="container">

        <div className="row gy-4 align-items-center">
          <div className="col-lg-5">
            <div className="mb-16">
              <div className="why-gradus-pill">{pillLabel}</div>
            </div>
            {title ? <h3 className="why-gradus-title mt-12">{title}</h3> : null}
            {description ? <p className="why-gradus-desc mt-12">{description}</p> : null}
            {ctaLabel && ctaHref ? (
              <a className="why-gradus-cta mt-12 d-inline-flex align-items-center gap-8" href={ctaHref}>
                {ctaLabel} <i className="ph-bold ph-arrow-up-right" aria-hidden="true" />
              </a>
            ) : null}
          </div>
          <div className="col-lg-7">
            <div className="why-gradus-video-frame">
              <div style={{ position: "relative", minHeight: 360 }}>
                {(loading || (!videoLoaded && videoSrc)) ? (
                  <div
                    className="why-gradus-skeleton"
                    style={{ position: "absolute", inset: 0, zIndex: 1 }}
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
                    onLoadedData={() => setVideoLoaded(true)}
                    style={{ position: "relative", zIndex: 2 }}
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
