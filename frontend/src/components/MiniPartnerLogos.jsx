import partners from "@shared/placementPartners.json";
import {
  createPartnerCatalogLookup,
  derivePartnerDisplayName,
  hydratePartnerDetails,
  resolvePartnerWebsite,
  sanitizePartnerKey,
} from "../utils/partners";

/*
  Compact, non-slider row of partner logos for tight spaces
  Props:
    - count: number of logos to show (default 6)
    - className: optional classes to append to the wrapper div
    - size: pixel size for logos (default 48) to match w-48/h-48 utilities
    - programFilter: string | string[] filter by partner.programs (optional)
*/
const MiniPartnerLogos = ({ count = 6, className = "", size = 48, programFilter }) => {
  const catalogLookup = createPartnerCatalogLookup(partners);

  const filterByProgram = (p) => {
    if (!programFilter) return true;
    const programs = Array.isArray(p?.programs) ? p.programs : [];
    const filters = Array.isArray(programFilter) ? programFilter : [programFilter];
    return filters.some((f) => programs.includes(f));
  };

  const logoItems = partners
    .filter(filterByProgram)
    .map((partner, index) => {
      const hydrated = hydratePartnerDetails(partner, catalogLookup);
      const logo = typeof hydrated?.logo === "string" ? hydrated.logo.trim() : "";
      if (!logo) return null;

      const href = resolvePartnerWebsite(hydrated?.website);
      const displayName =
        derivePartnerDisplayName(hydrated) ||
        derivePartnerDisplayName(partner) ||
        hydrated?.name ||
        partner?.name ||
        "";

      const keyBase =
        sanitizePartnerKey(displayName) ||
        sanitizePartnerKey(hydrated?.name) ||
        sanitizePartnerKey(partner?.name) ||
        `partner-${index}`;

      return {
        key: `${keyBase}-${index}`,
        href: href || "",
        logo,
        displayName,
      };
    })
    .filter(Boolean)
    .slice(0, Math.max(0, Number(count) || 6));

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

