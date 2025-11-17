import { useMemo } from "react";
import usePartnerLogos from "../hooks/usePartnerLogos";
import { buildPartnerDisplayItems } from "../utils/partners";

/*
  Compact, non-slider row of partner logos for tight spaces
  Props:
    - count: number of logos to show (default 6)
    - className: optional classes to append to the wrapper div
    - size: pixel size for logos (default 48) to match w-48/h-48 utilities
    - programFilter: string | string[] filter by partner.programs (optional)
*/
const MiniPartnerLogos = ({ count = 6, className = "", size = 48, programFilter }) => {
  const { partners } = usePartnerLogos();

  const logoItems = useMemo(() => {
    const filters = Array.isArray(programFilter) ? programFilter : programFilter ? [programFilter] : [];
    const items = buildPartnerDisplayItems(partners).filter((item) => {
      if (!filters.length) return true;
      const programs = Array.isArray(item?.programs) ? item.programs : [];
      return filters.some((f) => programs.includes(f));
    });

    return items.slice(0, Math.max(0, Number(count) || 6));
  }, [partners, programFilter, count]);

  if (!logoItems.length) {
    return null;
  }

  const sizeClass = `w-${size} h-${size}`;

  return (
    <div className={`enrolled-students mt-12 ${className}`.trim()}>
      {logoItems.map(({ key, href, logo, displayName }) => {
        const Element = href ? "a" : "div";
        const elementProps = href
          ? {
              href,
              target: "_blank",
              rel: "noopener noreferrer",
            }
          : {};

        return (
          <Element {...elementProps} key={key}>
            <img
              src={logo}
              alt={displayName || "Partner logo"}
              className={`${sizeClass} rounded-circle`}
              style={{ objectFit: "contain", background: "#fff" }}
            />
          </Element>
        );
      })}
    </div>
  );
};

export default MiniPartnerLogos;
