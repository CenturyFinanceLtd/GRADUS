export const trimValue = (value) => (typeof value === 'string' ? value.trim() : '');

export const sanitizePartnerKey = (value) => {
  if (!value) {
    return '';
  }

  return value
    .toString()
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/@/g, '')
    .replace(/[^a-z0-9]+/g, '');
};

const buildCandidateKeysFromValue = (value) => {
  if (!value) {
    return [];
  }

  return (Array.isArray(value) ? value : [value])
    .filter(Boolean)
    .flatMap((entry) => {
      const candidate = entry.toString();
      const sanitizedFull = sanitizePartnerKey(candidate);
      const keys = sanitizedFull ? [sanitizedFull] : [];

      candidate
        .split(/[/|,&]/)
        .map((segment) => sanitizePartnerKey(segment))
        .filter(Boolean)
        .forEach((key) => {
          if (!keys.includes(key)) {
            keys.push(key);
          }
        });

      return keys;
    });
};

const extractHostname = (value) => {
  if (!value) {
    return '';
  }

  try {
    const candidate = /^https?:/i.test(value) ? value : `https://${value}`;
    return new URL(candidate).hostname.replace(/^www\./i, '');
  } catch {
    return value.toString().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  }
};

export const createPartnerCatalogLookup = (partnersCatalog = []) => {
  const lookup = new Map();

  partnersCatalog.forEach((partner) => {
    const keys = new Set([
      ...buildCandidateKeysFromValue(partner?.name),
      ...buildCandidateKeysFromValue(Array.isArray(partner?.aliases) ? partner.aliases : []),
    ]);

    if (partner?.website) {
      const hostname = extractHostname(partner.website);
      buildCandidateKeysFromValue(hostname).forEach((key) => keys.add(key));
    }

    keys.forEach((key) => {
      if (key && !lookup.has(key)) {
        lookup.set(key, partner);
      }
    });
  });

  return lookup;
};

export const hydratePartnerDetails = (partner, catalogLookup) => {
  if (!partner) {
    return partner;
  }

  const candidateKeys = new Set([
    ...buildCandidateKeysFromValue(partner.name),
    ...buildCandidateKeysFromValue(extractHostname(partner.website)),
  ]);

  let matchedPartner = null;
  for (const key of candidateKeys) {
    if (key && catalogLookup?.has(key)) {
      matchedPartner = catalogLookup.get(key);
      break;
    }
  }

  if (!matchedPartner && partner.name) {
    const fallbackKey = sanitizePartnerKey(partner.name);
    if (catalogLookup?.has(fallbackKey)) {
      matchedPartner = catalogLookup.get(fallbackKey);
    }
  }

  if (matchedPartner) {
    return {
      ...partner,
      name: matchedPartner.name || partner.name || '',
      logo: partner.logo || matchedPartner.logo || '',
      website: partner.website || matchedPartner.website || '',
    };
  }

  return partner;
};

export const normalizePartnerEntries = (partners) => {
  if (!Array.isArray(partners)) {
    return [];
  }

  return partners
    .map((partner) => {
      if (!partner) {
        return null;
      }

      if (typeof partner === 'string') {
        const name = trimValue(partner);
        return name ? { name, logo: '', website: '' } : null;
      }

      if (typeof partner === 'object') {
        const name = trimValue(partner?.name || partner?.title || partner?.label);
        const logo = trimValue(partner?.logo || partner?.logoUrl || partner?.image);
        const website = trimValue(partner?.website || partner?.url || partner?.link);

        if (!name && !logo && !website) {
          return null;
        }

        return { name, logo, website };
      }

      return null;
    })
    .filter((partner) => partner && (partner.name || partner.logo || partner.website));
};

export const resolvePartnerWebsite = (value) => {
  const trimmed = trimValue(value);

  if (!trimmed) {
    return '';
  }

  if (/^(https?:\/\/|mailto:)/i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

export const derivePartnerDisplayName = (partner) => {
  if (!partner) {
    return '';
  }

  const name = trimValue(partner?.name);
  if (name) {
    return name;
  }

  const websiteHref = resolvePartnerWebsite(partner?.website);

  if (websiteHref) {
    try {
      const url = new URL(websiteHref);
      return url.hostname.replace(/^www\./i, '');
    } catch {
      return partner?.website || websiteHref;
    }
  }

  return '';
};

export const normalizePrograms = (value) => {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : String(value || '').split(',');
  return arr
    .map((entry) => trimValue(entry))
    .filter(Boolean);
};

export const normalizePartnerLogos = (partners) => {
  if (!Array.isArray(partners)) {
    return [];
  }

  return partners
    .map((partner) => {
      if (!partner) return null;

      const name = trimValue(partner?.name || partner?.title || partner?.label);
      const logo = trimValue(partner?.logo || partner?.logoUrl || partner?.image || partner?.imageUrl);
      const website = trimValue(partner?.website || partner?.url || partner?.link);
      const programs = normalizePrograms(partner?.programs);
      const order = typeof partner?.order !== 'undefined' ? Number(partner.order) || 0 : 0;
      const active = typeof partner?.active === 'undefined' ? true : Boolean(partner.active);

      if (!name && !logo && !website) {
        return null;
      }

      return { name, logo, website, programs, order, active };
    })
    .filter(Boolean);
};

export const buildPartnerDisplayItems = (partners, catalogSource = []) => {
  const normalizedPartners = normalizePartnerLogos(partners);
  const lookupSource = catalogSource.length ? normalizePartnerLogos(catalogSource) : normalizedPartners;
  const catalogLookup = createPartnerCatalogLookup(lookupSource);

  return normalizedPartners
    .map((partner, index) => {
      const hydrated = hydratePartnerDetails(partner, catalogLookup);
      const logo = trimValue(hydrated?.logo);

      if (!logo) {
        return null;
      }

      const href = resolvePartnerWebsite(hydrated?.website);
      const displayName =
        derivePartnerDisplayName(hydrated) ||
        derivePartnerDisplayName(partner) ||
        hydrated?.name ||
        partner?.name ||
        '';

      const keyBase =
        sanitizePartnerKey(displayName) ||
        sanitizePartnerKey(hydrated?.name) ||
        sanitizePartnerKey(partner?.name) ||
        `partner-${index}`;

      return {
        key: `${keyBase}-${index}`,
        href: href || '',
        logo,
        displayName,
        programs: Array.isArray(hydrated?.programs) ? hydrated.programs : partner.programs || [],
        order: typeof hydrated?.order !== 'undefined' ? hydrated.order : partner.order || 0,
        active: typeof hydrated?.active !== 'undefined' ? hydrated.active : partner.active ?? true,
      };
    })
    .filter(Boolean);
};
