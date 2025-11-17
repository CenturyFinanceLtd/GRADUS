import { useEffect, useState } from 'react';
import fallbackPartners from '@shared/placementPartners.json';
import { fetchPartnerLogos } from '../services/partnerService';
import { normalizePartnerLogos } from '../utils/partners';

const fallbackNormalized = normalizePartnerLogos(fallbackPartners);

const usePartnerLogos = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const items = await fetchPartnerLogos();
        if (cancelled) return;
        const normalized = normalizePartnerLogos(items);
        if (normalized.length) {
          setPartners(normalized);
          setUsedFallback(false);
        } else {
          setPartners(fallbackNormalized);
          setUsedFallback(true);
        }
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setPartners(fallbackNormalized);
        setUsedFallback(true);
        setError(e?.message || 'Failed to load partners; showing fallback data.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { partners, loading, error, usedFallback };
};

export default usePartnerLogos;
