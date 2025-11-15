import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Slider from "react-slick";
import { listBanners } from "../services/bannerService";

const sliderSettings = {
  slidesToShow: 1,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 3500,
  speed: 600,
  arrows: false,
  dots: true,
  pauseOnHover: true,
  infinite: true,
};

const isExternalUrl = (url = "") => /^https?:\/\//i.test(url);

const BannerOne = () => {
  const [banners, setBanners] = useState([]);
  const [error, setError] = useState(null);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(max-width: 991.98px)").matches;
  });
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await listBanners();
        if (!isMounted) return;
        setError(null);
        const normalized = (Array.isArray(data) ? data : [])
          .filter((item) => item?.imageUrl || item?.desktopImageUrl || item?.mobileImageUrl)
          .map((item, idx) => {
            const desktopImageUrl = item.desktopImageUrl || item.imageUrl || item.mobileImageUrl;
            const mobileImageUrl = item.mobileImageUrl || desktopImageUrl;
            if (!desktopImageUrl && !mobileImageUrl) {
              return null;
            }
            const ctaLabel = (item.ctaLabel || "").trim();
            const ctaUrl = (item.ctaUrl || "").trim();
            return {
              id: item.id || item._id || `banner-${idx}`,
              title: item.title || "Gradus banner",
              desktopImageUrl,
              mobileImageUrl,
              ctaLabel,
              ctaUrl,
            };
          })
          .filter(Boolean);
        setBanners(normalized);
      } catch (err) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn("[banners] failed to load remote banners", err);
        }
        setError(err?.message || "Failed to load banners");
        setBanners([]);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return undefined;
    }
    const mediaQuery = window.matchMedia("(max-width: 991.98px)");
    const handleChange = (event) => setIsMobileViewport(event.matches);
    // Ensure initial sync in case default state was stale
    handleChange(mediaQuery);
    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const baseSectionClass =
    "banner banner--rounded banner--full-bleed position-relative overflow-hidden";
  const minHeightDesktop = 420;
  const minHeightMobile = 260;

  const renderSlider = (slides = [], variant = "desktop") => {
    if (!slides.length) {
      return null;
    }
    const resolvedSlides = slides
      .map((item) => {
        const src =
          variant === "mobile" ? item.mobileImageUrl : item.desktopImageUrl;
        if (!src) {
          return null;
        }
        return {
          id: item.id,
          title: item.title,
          src,
          ctaLabel: item.ctaLabel,
          ctaUrl: item.ctaUrl,
        };
      })
      .filter(Boolean);

    if (!resolvedSlides.length) {
      return null;
    }
    const visibilityClass = variant === "mobile" ? "d-lg-none" : "d-none d-lg-block";
    const sectionClassName = `${baseSectionClass} ${visibilityClass} banner--${variant}`.trim();
    const minHeight = variant === "mobile" ? minHeightMobile : minHeightDesktop;

    return (
      <section
        className={sectionClassName}
        data-variant={`${variant}-banner`}
        style={{ minHeight }}
      >
        {!heroReady ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(120deg, #f4f7fb, #e9eef5, #f4f7fb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7280",
              fontWeight: 600,
              zIndex: 2,
            }}
          >
            Loading banner…
          </div>
        ) : null}
        <style>{`
          [data-variant="${variant}-banner"] .slick-list { padding-bottom: 0 !important; }
        `}</style>
        <Slider {...sliderSettings} className='only-image-slider'>
          {resolvedSlides.map((item) => {
            const image = (
              <img
                src={item.src}
                alt={item.title || "Gradus banner"}
                className='banner-img-only'
                loading='lazy'
                onLoad={() => setHeroReady(true)}
              />
            );
            const linkLabel = item.ctaLabel || item.title || "Gradus banner CTA";

            if (!item.ctaUrl) {
              return (
                <div key={`${variant}-${item.id}`} className='banner-image-slide'>
                  {image}
                </div>
              );
            }

            const linkProps = {
              className: "banner-slide-link",
              "aria-label": linkLabel,
            };

            return (
              <div key={`${variant}-${item.id}`} className='banner-image-slide'>
                {isExternalUrl(item.ctaUrl) ? (
                  <a
                    href={item.ctaUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    {...linkProps}
                  >
                    {image}
                  </a>
                ) : (
                  <Link to={item.ctaUrl} {...linkProps}>
                    {image}
                  </Link>
                )}
              </div>
            );
          })}
        </Slider>
      </section>
    );
  };

  if (!banners.length) {
    return (
      <section className={`${baseSectionClass} d-flex align-items-center justify-content-center`} style={{ minHeight: 240 }}>
        <div className='text-center px-3'>
          <p className='text-lg fw-semibold mb-8'>No banners available</p>
          <p className='text-sm text-neutral-600 mb-0'>
            {error ? error : "Upload a banner from the admin panel to populate this section."}
          </p>
        </div>
      </section>
    );
  }

  const desktopSlides = banners.filter((item) => Boolean(item.desktopImageUrl));
  const mobileSlides = banners.filter((item) => Boolean(item.mobileImageUrl));

  return (
    <>
      {!isMobileViewport && renderSlider(desktopSlides, "desktop")}
      {isMobileViewport && renderSlider(mobileSlides, "mobile")}
    </>
  );
};

export default BannerOne;
