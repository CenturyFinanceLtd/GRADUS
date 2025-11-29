import { useEffect, useState } from "react";
import { matchPath, useLocation } from "react-router-dom";
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

const humanizeSlug = (value = "") =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const blogMetaResolver = ({ params }) => {
  const titleSegment = humanizeSlug(params?.slug || "");
  return {
    title: titleSegment ? `${titleSegment} | Gradus Blog` : "Gradus Blog Article",
    description: titleSegment
      ? `Explore ${titleSegment} on the Gradus blog for expert opinions and practical tips.`
      : "Read Gradus India's latest blog article covering education, careers, and learning strategies.",
    keywords: `${titleSegment}, Gradus blog, Gradus article`,
  };
};

const DYNAMIC_META_RESOLVERS = [
  {
    pattern: "/blog/:slug",
    resolve: blogMetaResolver,
  },
  {
    pattern: "/blogs/:slug",
    resolve: blogMetaResolver,
  },
  {
    pattern: "/events/:slug",
    resolve: ({ params }) => {
      const label = humanizeSlug(params?.slug || "");
      return {
        title: label ? `${label} | Gradus Event` : "Gradus Event",
        description: label
          ? `Get the agenda, speakers, and highlights for the ${label} event hosted by Gradus India.`
          : "Explore the details of this Gradus India event including agenda, speakers, and registration.",
        keywords: `${label}, Gradus events, Gradus webinars`,
      };
    },
  },
  {
    pattern: "/event-details/:slug?",
    resolve: ({ params }) => {
      const label = humanizeSlug(params?.slug || "Gradus Event");
      return {
        title: `${label} | Gradus Event`,
        description: `Discover how to participate in ${label} and connect with Gradus mentors and peers.`,
        keywords: `${label}, Gradus events`,
      };
    },
  },
  {
    pattern: "/:programme/:course",
    resolve: ({ params }) => {
      const programme = humanizeSlug(params?.programme || "Gradus");
      const course = humanizeSlug(params?.course || "Course");
      return {
        title: `${course} | ${programme} | Gradus`,
        description: `Learn more about the ${course} programme offered through ${programme} at Gradus India.`,
        keywords: `${course}, ${programme}, Gradus courses`,
      };
    },
  },
  {
    pattern: "/:programme/:course/home/:section?/:subSection?",
    resolve: ({ params }) => {
      const course = humanizeSlug(params?.course || "Course");
      const section = humanizeSlug(params?.section || "Overview");
      return {
        title: `${course} | ${section} | Gradus`,
        description: `Continue your ${course} journey inside Gradus Home. You're viewing the ${section} section.`,
        keywords: `${course}, Gradus dashboard, ${section}`,
        robots: "noindex, nofollow",
      };
    },
  },
];

const findMetaEntry = (pathname, metaMap) => {
  const direct = metaMap[pathname];
  if (direct) {
    return { entry: direct, params: {} };
  }

  const dynamicMatches = Object.entries(metaMap)
    .filter(([pattern]) => pattern.includes(":") || pattern.includes("*"))
    .sort(([patternA], [patternB]) => patternA.length - patternB.length);

  for (const [pattern, entry] of dynamicMatches) {
    const match = matchPath({ path: pattern, end: true }, pathname);
    if (match) {
      return { entry, params: match.params || {} };
    }
  }

  for (const resolver of DYNAMIC_META_RESOLVERS) {
    const match = matchPath({ path: resolver.pattern, end: true }, pathname);
    if (match) {
      return {
        entry: resolver.resolve,
        params: match.params || {},
      };
    }
  }

  return null;
};

const resolveMeta = (location, metaMap) => {
  const fallback = metaMap.__default || DEFAULT_META;
  const found = findMetaEntry(location.pathname, metaMap);
  const entry = found?.entry ?? fallback;
  const context = { location, params: found?.params || {} };
  const meta = typeof entry === "function" ? entry(context) : entry;

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
