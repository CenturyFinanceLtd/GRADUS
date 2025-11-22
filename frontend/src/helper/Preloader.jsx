import { useEffect, useState } from "react";

const getInitialState = () => {
  if (typeof window === "undefined") return false;
  try {
    return !window.sessionStorage.getItem("preloaderSeen");
  } catch {
    return true;
  }
};

const Preloader = () => {
  const [active, setActive] = useState(getInitialState);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => {
      setActive(false);
      try {
        window.sessionStorage.setItem("preloaderSeen", "1");
      } catch {
        // ignore storage failures
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!active) return null;

  return (
    <div className='preloader' aria-hidden='true'>
      <div className='preloader__spinner' role='presentation' />
    </div>
  );
};

export default Preloader;
