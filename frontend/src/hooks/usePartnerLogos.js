import { useEffect, useState } from 'react';
import { fetchPartnerLogos } from '../services/partnerService';
import { normalizePartnerLogos } from '../utils/partners';

const usePartnerLogos = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false); // retained for compatibility with callers

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const items = await fetchPartnerLogos();
        if (cancelled) return;
        const normalized = normalizePartnerLogos(items);
        setPartners(normalized);
        setUsedFallback(false);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setPartners([]);
        setUsedFallback(false);
        setError(e?.message || 'Failed to load partners.');
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
