import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DEFAULT_META, PAGE_META } from "../seo/pageMeta.js";

const ensureMetaTag = (name) => {
  let tag = document.head.querySelector('meta[name="' + name + '"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  return tag;
};

const resolveMeta = (location) => {
  const entry = PAGE_META[location.pathname] ?? DEFAULT_META;
  const meta = typeof entry === "function" ? entry(location) : entry;

  return {
    title: meta.title ?? DEFAULT_META.title,
    description: meta.description ?? DEFAULT_META.description,
    keywords: meta.keywords ?? DEFAULT_META.keywords,
    robots: meta.robots ?? DEFAULT_META.robots,
  };
};

const MetaManager = () => {
  const location = useLocation();

  useEffect(() => {
    const { title, description, keywords, robots } = resolveMeta(location);

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
  }, [location]);

  return null;
};

export default MetaManager;
