"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeBrand = searchParams.get("brand") || "all";
  const filterStatus = useMemo(() => searchParams.get("status")?.split(",").filter(Boolean) || [], [searchParams]);
  const filterContentType = searchParams.get("content_type") || "";
  const filterServiceArea = searchParams.get("service_area") || "";
  const filterTags = useMemo(() => searchParams.get("tags")?.split(",").filter(Boolean) || [], [searchParams]);
  const searchQuery = searchParams.get("q") || "";
  const sortBy = searchParams.get("sort") || "created_at";
  const sortOrder = (searchParams.get("order") || "desc") as "asc" | "desc";
  const view = (searchParams.get("view") || "kanban") as ContentView;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const setActiveBrand = useCallback((v: string) => updateParams({ brand: v === "all" ? null : v }), [updateParams]);
  const setFilterStatus = useCallback((v: string[]) => updateParams({ status: v.length ? v.join(",") : null }), [updateParams]);
  const setFilterContentType = useCallback((v: string) => updateParams({ content_type: v || null }), [updateParams]);
  const setFilterServiceArea = useCallback((v: string) => updateParams({ service_area: v || null }), [updateParams]);
  const setFilterTags = useCallback((v: string[]) => updateParams({ tags: v.length ? v.join(",") : null }), [updateParams]);
  const setSearchQuery = useCallback((v: string) => updateParams({ q: v || null }), [updateParams]);
  const setSortBy = useCallback((v: string) => updateParams({ sort: v === "created_at" ? null : v }), [updateParams]);
  const setSortOrder = useCallback((v: "asc" | "desc") => updateParams({ order: v === "desc" ? null : v }), [updateParams]);
  const setView = useCallback((v: ContentView) => updateParams({ view: v === "kanban" ? null : v }), [updateParams]);

  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [posts, setPosts] = useState<PostConfig[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    api("/api/brands").then((b: BrandConfig[]) => {
      setBrands(Array.isArray(b) ? b : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

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

  useEffect(() => {
    if (activeBrand && activeBrand !== "all") {
      api(`/api/tags?brand=${activeBrand}`).then((t) => setTags(Array.isArray(t) ? t : [])).catch(() => setTags([]));
    } else {
      setTags([]);
    }
  }, [activeBrand]);

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

  // `update` takes the optimistic fast path: mutate local posts immediately so
  // the kanban card moves on the next frame, then fire the PATCH in the
  // background. On failure we snap back. Trash/duplicate still do a full
  // refetch because they change which posts exist, not just one field.
  const handleAction = useCallback(async (action: string, postId: string, extra?: Record<string, unknown>) => {
    setActionMsg(null);

    if (action === "update" && extra) {
      let prev: PostConfig[] = [];
      setPosts((pp) => {
        prev = pp;
        return pp.map((p) => p.id === postId ? { ...p, ...(extra as Partial<PostConfig>) } : p);
      });
      try {
        await api("/api/posts", { action: "update", post_id: postId, updates: extra });
      } catch (e: unknown) {
        setPosts(prev);
        setError(e instanceof Error ? e.message : "Không cập nhật được");
      }
      return;
    }

    try {
      if (action === "trash") {
        await api("/api/posts", { action: "trash", post_id: postId });
        setActionMsg("Moved to trash");
      } else if (action === "duplicate") {
        await api("/api/posts", { action: "duplicate", post_id: postId });
        setActionMsg("Duplicated");
      }
      await loadPosts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  }, [loadPosts]);

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
    brands, activeBrand, setActiveBrand,
    posts, displayPosts, postsByStatus, postsByDate, unscheduledPosts,
    tags, thumbnails, loading, postsLoading,
    view, setView, calYear, setCalYear, calMonth, setCalMonth,
    filterStatus, setFilterStatus, filterContentType, setFilterContentType,
    filterServiceArea, setFilterServiceArea, filterTags, setFilterTags,
    searchQuery, setSearchQuery, sortBy, setSortBy, sortOrder, setSortOrder,
    showFilters, setShowFilters, activeFilterCount,
    selected, setSelected, toggleSelect, toggleSelectAll,
    error, setError, actionMsg, setActionMsg,
    handleAction, handleBulkAction,
    loadPosts,
  };
}
