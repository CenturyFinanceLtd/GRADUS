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

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await listBanners();
        if (!isMounted) return;
        setError(null);
        const normalized = (Array.isArray(data) ? data : [])
          .filter((item) => item?.imageUrl)
          .map((item, idx) => ({
            id: item.id || item._id || `banner-${idx}`,
            imageUrl: item.imageUrl,
            title: item.title || "Gradus banner",
          }));
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

  if (!banners.length) {
    return (
      <section className='banner banner--rounded banner--gutters position-relative overflow-hidden d-flex align-items-center justify-content-center' style={{ minHeight: 240 }}>
        <div className='text-center px-3'>
          <p className='text-lg fw-semibold mb-8'>No banners available</p>
          <p className='text-sm text-neutral-600 mb-0'>
            {error ? error : "Upload a banner from the admin panel to populate this section."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className='banner banner--rounded banner--gutters position-relative overflow-hidden'>
      <Slider {...sliderSettings} className='only-image-slider'>
        {banners.map((item) => (
          <div key={item.id} className='banner-image-slide'>
            <img src={item.imageUrl} alt={item.title || 'Gradus banner'} className='banner-img-only' loading='lazy' />
          </div>
        ))}
      </Slider>
    </section>
  );
};

export default BannerOne;
