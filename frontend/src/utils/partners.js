export const trimValue = (value) => (typeof value === 'string' ? value.trim() : '');

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
