import { useEffect, useState } from "react";
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

const BannerOne = () => {
  const [banners, setBanners] = useState([]);
  const [error, setError] = useState(null);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(max-width: 991.98px)").matches;
  });

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
            return {
              id: item.id || item._id || `banner-${idx}`,
              title: item.title || "Gradus banner",
              desktopImageUrl,
              mobileImageUrl,
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
    "banner banner--rounded banner--gutters position-relative overflow-hidden";

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
        return { id: item.id, title: item.title, src };
      })
      .filter(Boolean);

    if (!resolvedSlides.length) {
      return null;
    }
    const visibilityClass = variant === "mobile" ? "d-lg-none" : "d-none d-lg-block";
    const sectionClassName = `${baseSectionClass} ${visibilityClass} banner--${variant}`.trim();

    return (
      <section className={sectionClassName} data-variant={`${variant}-banner`}>
        <Slider {...sliderSettings} className='only-image-slider'>
          {resolvedSlides.map((item) => (
            <div key={`${variant}-${item.id}`} className='banner-image-slide'>
              <img src={item.src} alt={item.title || 'Gradus banner'} className='banner-img-only' loading='lazy' />
            </div>
          ))}
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
