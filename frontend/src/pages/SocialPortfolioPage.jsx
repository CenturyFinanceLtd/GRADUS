import Preloader from "../helper/Preloader";
import Animation from "../helper/Animation";
import React from "react";
import "../styles/social-portfolio.css";

const SocialPortfolioPage = () => {
  const siteUrl = "https://gradusindia.in/";
  const siteHost = new URL(siteUrl).hostname;

  const socialLinks = [
    {
      name: "Website",
      handle: siteHost,
      url: siteUrl,
      imgSrc: "/favicon.ico",
      color: "#0EA5E9",
    },
    {
      name: "WhatsApp",
      handle: "+91 8448429040",
      url: "https://wa.me/918448429040",
      icon: "ph ph-whatsapp-logo",
      color: "#25D366",
    },
    {
      name: "Facebook",
      handle: "Gradus India",
      url: "https://www.facebook.com/profile.php?id=61583093960559&sk=about",
      icon: "ph ph-facebook-logo",
      color: "#1877F2",
    },
    {
      name: "Instagram",
      handle: "@gradusindiaofficial",
      url: "https://www.instagram.com/gradusindiaofficial?igsh=MWdhdjJhZWp6NDI1aA==",
      icon: "ph ph-instagram-logo",
      color: "#E4405F",
    },
    {
      name: "Reddit",
      handle: "u/GradusIndia",
      url: "https://www.reddit.com/user/GradusIndia/",
      icon: "ph ph-reddit-logo",
      color: "#FF4500",
    },
    {
      name: "Quora",
      handle: "Marketing Team",
      url: "https://www.quora.com/profile/Marketing-Team-615",
      imgSrc: "/assets/icons/quora.svg",
      color: "#B92B27",
    },
    {
      name: "Discord",
      handle: "Community Channel",
      url: "https://discord.com/channels/1432018650558238884/1432019463347114035",
      icon: "ph ph-discord-logo",
      color: "#5865F2",
    },
  ];

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard?.writeText(text);
      alert("Link copied to clipboard");
    } catch (e) {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      alert("Link copied to clipboard");
    }
  };

  const sharePage = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Gradus India | Social Portfolio",
          text: "Connect with Gradus India across platforms",
          url,
        });
      } catch (_) {}
    } else {
      handleCopy(url);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Gradus India",
    url: typeof window !== "undefined" ? window.location.origin : "https://gradus.example",
    sameAs: socialLinks.map((s) => s.url),
  };

  return (
    <>
      <Preloader />
      <Animation />

      {/* Linktree-like bare layout */}
      <main className='sp-viewport'>
        <div className='sp-container'>
          <header className='sp-profile' aria-label='Profile header'>
            <img
              src='/assets/images/logo/logo.png'
              alt='Gradus India logo'
              className='sp-avatar'
              width={88}
              height={88}
              loading='eager'
            />
            <p className='sp-tagline'>One page to connect with Gradus India</p>

            <div className='sp-actions'>
              <button className='sp-btn-primary' onClick={sharePage}>
                <i className='ph ph-share-network' /> Share Page
              </button>
              <button className='sp-btn-outline' onClick={() => handleCopy(window.location.href)}>
                <i className='ph ph-copy-simple' /> Copy Link
              </button>
            </div>
          </header>

          <section className='sp-links' aria-label='Quick Links'>
            {socialLinks.map((s) => (
              <a
                key={s.name}
                className='sp-link'
                href={s.url}
                target='_blank'
                rel='noopener noreferrer nofollow'
                style={{ ['--accent']: s.color }}
              >
                <span className='sp-link__icon' aria-hidden='true'>
                  {s.imgSrc ? (
                    <img src={s.imgSrc} alt={`${s.name} icon`} />
                  ) : (
                    <i className={s.icon} />
                  )}
                </span>
                <span className='sp-link__content'>
                  <span className='sp-link__title'>{s.name}</span>
                  <span className='sp-link__subtitle'>{s.handle}</span>
                </span>
              </a>
            ))}
          </section>

          {null}
        </div>
      </main>

      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
};

export default SocialPortfolioPage;
