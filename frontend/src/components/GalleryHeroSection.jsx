import { useState, useEffect } from "react";
import { Autoplay, Navigation, Pagination, EffectCoverflow } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-coverflow";
import apiClient from "../services/apiClient";

const GalleryHeroSection = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await apiClient.get('/gallery?category=Team');
        setItems(data.items || []);
      } catch (error) {
        console.error("Failed to fetch gallery hero items", error);
        // Fallback or empty
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  // Use fetched items or placeholders if empty and not loading? 
  // For demo, if empty we might want to keep placeholders, but I'll stick to real data 
  // and maybe minimal fallback if absolutely nothing.
  const displayItems = items.length > 0 ? items : [];

  // If we have very few items, duplicate them to make the slider work better
  const finalItems = displayItems.length > 0 && displayItems.length < 5
    ? [...displayItems, ...displayItems, ...displayItems].slice(0, 6)
    : displayItems;

  if (loading) return <div className="py-80 text-center">Loading...</div>;
  if (finalItems.length === 0) return null; // Or render empty state

  return (
    <section className="gallery-hero py-80 overflow-hidden">
      <div className="container">
        <div className="section-heading text-center mb-60">
          <h2 className="mb-24">We are the Gradus</h2>
          <p className="text-neutral-500 text-lg">
            Meet our masterminds who contribute their mind to Gradus
          </p>
        </div>

        <div className="gallery-hero-slider">
          <Swiper
            modules={[Navigation, Pagination, Autoplay, EffectCoverflow]}
            effect={'coverflow'}
            grabCursor={true}
            centeredSlides={true}
            loop={true}
            slidesPerView={'auto'}
            coverflowEffect={{
              rotate: 0,
              stretch: 0,
              depth: 100,
              modifier: 2.5,
              slideShadows: false,
            }}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
            }}
            pagination={{ clickable: true }}
            navigation={true}
            breakpoints={{
              768: {
                slidesPerView: 2,
              },
              1200: {
                slidesPerView: 2.5,
              }
            }}
            className="rounded-16 gallery-swiper"
          >
            {finalItems.map((item, index) => (
              <SwiperSlide key={`${item._id}-${index}`} className="swiper-slide-custom" style={{ width: '85%', maxWidth: '600px' }}>
                <div className="gallery-hero-item w-100 position-relative">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-100 h-100 object-fit-cover rounded-16"
                    style={{ height: '500px' }}
                    onError={(e) => {
                      e.target.src = "https://placehold.co/800x500?text=Gradus+Team";
                    }}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
};

export default GalleryHeroSection;
