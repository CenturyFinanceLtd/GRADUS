import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { DEFAULT_META, PAGE_META } from "../seo/pageMeta.js";
import { fetchPublicPageMeta } from "../services/pageMetaService.js";

const ensureMetaTag = (name) => {
  let tag = document.head.querySelector('meta[name="' + name + '"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  return tag;
};

const buildInitialMap = () => ({
  __default: DEFAULT_META,
  ...PAGE_META,
});

const buildMapFromResponse = ({ defaultMeta, items }) => {
  const fallback = {
    title: defaultMeta?.title || DEFAULT_META.title,
    description: defaultMeta?.description || DEFAULT_META.description,
    keywords: defaultMeta?.keywords || DEFAULT_META.keywords,
    robots: defaultMeta?.robots || DEFAULT_META.robots,
  };
  const map = { __default: fallback };
  (items || []).forEach((item) => {
    if (!item?.path) {
      return;
    }
    map[item.path] = {
      title: item.title ?? null,
      description: item.description ?? null,
      keywords: item.keywords ?? null,
      robots: item.robots ?? null,
    };
  });
  return map;
};

const resolveMeta = (location, metaMap) => {
  const fallback = metaMap.__default || DEFAULT_META;
  const entry = metaMap[location.pathname] ?? fallback;
  const meta = typeof entry === "function" ? entry(location) : entry;

  return {
    title: meta?.title ?? fallback.title ?? DEFAULT_META.title,
    description: meta?.description ?? fallback.description ?? DEFAULT_META.description,
    keywords: meta?.keywords ?? fallback.keywords ?? DEFAULT_META.keywords,
    robots: meta?.robots ?? fallback.robots ?? DEFAULT_META.robots,
  };
};

const MetaManager = () => {
  const location = useLocation();
  const [metaMap, setMetaMap] = useState(buildInitialMap);

  useEffect(() => {
    let cancelled = false;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;

    const load = async () => {
      try {
        const response = await fetchPublicPageMeta({ signal: controller?.signal });
        if (cancelled || !response) {
          return;
        }
        const incoming = buildMapFromResponse(response);
        setMetaMap((current) => ({ ...current, ...incoming }));
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
        console.warn("[meta] Failed to load page metadata from API. Using bundled defaults.", error);
      }
    };

    load();
    return () => {
      cancelled = true;
      if (controller) {
        controller.abort();
      }
    };
  }, []);

  useEffect(() => {
    const { title, description, keywords, robots } = resolveMeta(location, metaMap);

    if (title) {
      document.title = title;
    }

    const applyMeta = (name, content) => {
      const tag = ensureMetaTag(name);
      tag.setAttribute("content", content ?? "");
    };

    applyMeta("description", description);
    applyMeta("keywords", keywords);
    applyMeta("robots", robots);
  }, [location, metaMap]);

  return null;
};

export default MetaManager;
