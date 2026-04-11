"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";

type TagRow = { id: string; brand_id: string; name: string; color: string };

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

export type ContentView = "kanban" | "calendar" | "table";

export function useContentHub() {
  // Data
  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [activeBrand, setActiveBrand] = useState<string>("all");
  const [posts, setPosts] = useState<PostConfig[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);

  // View
  const [view, setView] = useState<ContentView>("kanban");
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  // Filters
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterContentType, setFilterContentType] = useState("");
  const [filterServiceArea, setFilterServiceArea] = useState("");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Detail panel
  const [detailPost, setDetailPost] = useState<PostConfig | null>(null);

  // Messages
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Load brands
  useEffect(() => {
    api("/api/brands").then((b: BrandConfig[]) => {
      setBrands(Array.isArray(b) ? b : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Load posts
  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeBrand !== "all") params.set("brand", activeBrand);
      if (filterStatus.length) params.set("status", filterStatus.join(","));
      if (filterContentType) params.set("content_type", filterContentType);
      if (filterServiceArea) params.set("service_area", filterServiceArea);
      if (filterTags.length) params.set("tag_ids", filterTags.join(","));
      if (searchQuery) params.set("search", searchQuery);
      params.set("sort", sortBy);
      params.set("order", sortOrder);

      const data = await api(`/api/posts?${params}`);
      const loadedPosts: PostConfig[] = data.posts || [];
      setPosts(loadedPosts);

      // Load thumbnails
      const ids = loadedPosts.map((p) => p.id).filter(Boolean);
      if (ids.length > 0) {
        try {
          const thumbs = await api(`/api/posts/images?post_ids=${ids.join(",")}`);
          setThumbnails(thumbs && typeof thumbs === "object" ? thumbs : {});
        } catch { setThumbnails({}); }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load posts");
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [activeBrand, filterStatus, filterContentType, filterServiceArea, filterTags, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    if (!loading) loadPosts();
  }, [loadPosts, loading]);

  // Load tags
  useEffect(() => {
    if (activeBrand && activeBrand !== "all") {
      api(`/api/tags?brand=${activeBrand}`).then((t) => setTags(Array.isArray(t) ? t : [])).catch(() => setTags([]));
    } else {
      setTags([]);
    }
  }, [activeBrand]);

  // Derived data
  const displayPosts = useMemo(() => posts.filter((p) => p.status !== "trashed"), [posts]);

  const postsByStatus = useMemo(() => {
    const map: Record<string, PostConfig[]> = {};
    for (const p of displayPosts) {
      (map[p.status] ||= []).push(p);
    }
    return map;
  }, [displayPosts]);

  const postsByDate = useMemo(() => {
    return displayPosts.reduce((acc, p) => {
      if (p.scheduled_date) (acc[p.scheduled_date] ||= []).push(p);
      return acc;
    }, {} as Record<string, PostConfig[]>);
  }, [displayPosts]);

  const unscheduledPosts = useMemo(() => displayPosts.filter((p) => !p.scheduled_date), [displayPosts]);

  const activeFilterCount = [filterStatus.length > 0, !!filterContentType, !!filterServiceArea, filterTags.length > 0].filter(Boolean).length;

  // Actions
  const handleAction = async (action: string, postId: string, extra?: Record<string, unknown>) => {
    setActionMsg(null);
    try {
      if (action === "trash") {
        await api("/api/posts", { action: "trash", post_id: postId });
        setActionMsg("Moved to trash");
      } else if (action === "duplicate") {
        await api("/api/posts", { action: "duplicate", post_id: postId });
        setActionMsg("Duplicated");
      } else if (action === "update") {
        await api("/api/posts", { action: "update", post_id: postId, updates: extra });
      }
      await loadPosts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  };

  const handleBulkAction = async (action: string, value?: string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      if (action === "status" && value) {
        await api("/api/posts", { action: "bulk_status", post_ids: ids, status: value });
      } else if (action === "delete") {
        await api("/api/posts", { action: "bulk_delete", post_ids: ids });
      } else if (action === "tag" && value) {
        await api("/api/tags", { action: "bulk_add", post_ids: ids, tag_id: value });
      }
      setSelected(new Set());
      await loadPosts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bulk action failed");
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleSelectAll = () => {
    if (selected.size === displayPosts.length) setSelected(new Set());
    else setSelected(new Set(displayPosts.map((p) => p.id)));
  };

  return {
    // Data
    brands, activeBrand, setActiveBrand,
    posts, displayPosts, postsByStatus, postsByDate, unscheduledPosts,
    tags, thumbnails, loading, postsLoading,
    // View
    view, setView, calYear, setCalYear, calMonth, setCalMonth,
    // Filters
    filterStatus, setFilterStatus, filterContentType, setFilterContentType,
    filterServiceArea, setFilterServiceArea, filterTags, setFilterTags,
    searchQuery, setSearchQuery, sortBy, setSortBy, sortOrder, setSortOrder,
    showFilters, setShowFilters, activeFilterCount,
    // Selection
    selected, setSelected, toggleSelect, toggleSelectAll,
    // Detail
    detailPost, setDetailPost,
    // Messages
    error, setError, actionMsg, setActionMsg,
    // Actions
    handleAction, handleBulkAction, loadPosts,
  };
}
