/* eslint-disable react-hooks/refs */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/immutability */
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Globe,
  FileText,
  Shuffle,
  Code,
  Users,
  CheckCircle,
  AlertCircle,
  Loader,
  Sparkles,
  Plus,
  Trash,
  Eye,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Code2,
  Upload,
  Maximize2,
  Minimize2,
  FileUp,
  Wand2,
} from "lucide-react";
import BlogAIWizard, { BlogAIWizardResult } from "@/components/BlogAIWizard";
import BlogEditor from "@/components/BlogEditor";
import ImportDocumentModal, {
  ImportDocumentResult,
} from "@/components/ImportDocumentModal";
import ModifyHtmlModal from "@/components/ModifyHtmlModal";
import { slugify } from "@/lib/slugify";

interface SiteStats {
  id: string;
  name: string;
  baseUrl: string;
  counts: {
    seoConfigs: number;
    blogs: number;
    redirects: number;
    leads: number;
  };
  pixels: {
    ga4: boolean;
    meta: boolean;
  };
}

interface SeoConfig {
  path: string;
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  schemaMarkup: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  featuredImage: string;
  published: boolean;
  category: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  seoOgImage: string;
  template?: string;
  publishedAt: string;
}

interface RedirectRule {
  id: string;
  sourcePath: string;
  destinationPath: string;
  statusCode: number;
}

interface TrackerConfig {
  googleAnalyticsId: string;
  metaPixelId: string;
  searchConsoleTag: string;
  headerScripts: string;
  footerScripts: string;
}

interface Lead {
  id: string;
  formName: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  siteId: string;
  createdAt: string;
}

export default function Dashboard() {
  // Navigation & Site Select State
  const [activeTab, setActiveTab] = useState<
    "overview" | "metadata" | "blogs" | "redirects" | "trackers" | "leads"
  >("overview");
  const [selectedSite, setSelectedSite] = useState<string>("gotolatest");

  // Dashboard Metrics State
  const [siteStatsList, setSiteStatsList] = useState<SiteStats[]>([]);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // SEO Meta Form State
  const [metadataRoutePath, setMetadataRoutePath] = useState<string>("/");
  const [metaForm, setMetaForm] = useState<Partial<SeoConfig>>({
    path: "/",
    title: "",
    description: "",
    canonicalUrl: "",
    robots: "index, follow",
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "",
    twitterDescription: "",
    twitterImage: "",
    schemaMarkup: "",
  });
  const [loadingMeta, setLoadingMeta] = useState<boolean>(false);
  const [metaMessage, setMetaMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Blogs CMS State
  const [blogList, setBlogList] = useState<BlogPost[]>([]);
  const [loadingBlogs, setLoadingBlogs] = useState<boolean>(false);
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
  const [blogForm, setBlogForm] = useState<Partial<BlogPost>>({
    title: "",
    slug: "",
    summary: "",
    content: "",
    featuredImage: "",
    published: false,
    category: "",
    tags: "",
    seoTitle: "",
    seoDescription: "",
    seoOgImage: "",
    template: "",
  });
  const [blogMessage, setBlogMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showAiWizard, setShowAiWizard] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showModifyModal, setShowModifyModal] = useState<boolean>(false);
  // Bumped whenever blogForm.content is replaced wholesale (new post, AI
  // generation, document import, selecting a different post, or switching
  // back from Raw HTML mode) — remounts BlogEditor via `key` so it loads the
  // new content cleanly instead of fighting live typing with a sync effect.
  const [formLoadId, setFormLoadId] = useState<number>(0);
  // Quick Compose: plain text + image uploads -> blog HTML
  const [quickText, setQuickText] = useState<string>("");
  const [quickImages, setQuickImages] = useState<File[]>([]);
  const [quickConverting, setQuickConverting] = useState<boolean>(false);
  const [contentViewMode, setContentViewMode] = useState<"raw" | "preview">(
    "raw",
  );
  const [blogFormDirty, setBlogFormDirty] = useState<boolean>(false);

  // Manual slug flag
  const slugManuallyEditedRef = useRef<boolean>(false);

  // Live preview iframe (src/app/preview/blog/page.tsx)
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Redirects State
  const [redirectList, setRedirectList] = useState<RedirectRule[]>([]);
  const [loadingRedirects, setLoadingRedirects] = useState<boolean>(false);
  const [redirectForm, setRedirectForm] = useState({
    sourcePath: "",
    destinationPath: "",
    statusCode: 301,
  });
  const [redirectMessage, setRedirectMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Tracker State
  const [trackerForm, setTrackerForm] = useState<TrackerConfig>({
    googleAnalyticsId: "",
    metaPixelId: "",
    searchConsoleTag: "",
    headerScripts: "",
    footerScripts: "",
  });
  const [loadingTracker, setLoadingTracker] = useState<boolean>(false);
  const [trackerMessage, setTrackerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Leads CRM State
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState<boolean>(false);
  const [leadsFilter, setLeadsFilter] = useState<string>("all");

  // Performance State: { [siteId]: { mobile: number | null, desktop: number | null, loading: boolean, simulated: boolean } }
  const [perfScores, setPerfScores] = useState<
    Record<
      string,
      {
        mobile: number | null;
        desktop: number | null;
        loading: boolean;
        simulated: boolean;
      }
    >
  >({
    gotolatest: {
      mobile: null,
      desktop: null,
      loading: false,
      simulated: false,
    },
    hehe: { mobile: null, desktop: null, loading: false, simulated: false },
    sunnest: { mobile: null, desktop: null, loading: false, simulated: false },
  });

  const runPerformanceAudit = async (siteId: string, url: string) => {
    setPerfScores((prev) => ({
      ...prev,
      [siteId]: { ...prev[siteId], loading: true },
    }));

    try {
      const res = await fetch(
        `/api/performance?url=${encodeURIComponent(url)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setPerfScores((prev) => ({
          ...prev,
          [siteId]: {
            mobile: data.mobile,
            desktop: data.desktop,
            loading: false,
            simulated: data.simulated,
          },
        }));
      } else {
        alert("Failed to audit website performance. Ensure the URL is valid.");
        setPerfScores((prev) => ({
          ...prev,
          [siteId]: { ...prev[siteId], loading: false },
        }));
      }
    } catch (err) {
      console.error(err);
      alert("Network error while running performance audit.");
      setPerfScores((prev) => ({
        ...prev,
        [siteId]: { ...prev[siteId], loading: false },
      }));
    }
  };

  // Trigger loading stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch site-specific data when site or tab changes
  useEffect(() => {
    if (activeTab === "metadata") {
      fetchMetadata(metadataRoutePath);
    } else if (activeTab === "blogs") {
      fetchBlogs(false);
    } else if (activeTab === "redirects") {
      fetchRedirects();
    } else if (activeTab === "trackers") {
      fetchTrackerConfig();
    } else if (activeTab === "leads") {
      fetchLeads();
    }
  }, [selectedSite, activeTab]);

  // Warn on browser reload/close if there is unsaved work
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (blogFormDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Discard them?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [blogFormDirty]);

  // Push the current draft to the live preview iframe. Debounced on content
  // since Tiptap's onUpdate fires per keystroke; title changes are cheap
  // enough to post immediately.
  useEffect(() => {
    const post = () => {
      previewIframeRef.current?.contentWindow?.postMessage(
        {
          type: "BLOG_PREVIEW_UPDATE",
          title: blogForm.title || "",
          html: blogForm.content || "",
          siteId: selectedSite,
        },
        window.location.origin,
      );
    };
    const timer = setTimeout(post, 300);
    return () => clearTimeout(timer);
  }, [blogForm.content, blogForm.title, selectedSite]);

  // Fetch Global Stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setSiteStatsList(data.stats);
      }
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch Metadata for route path
  const fetchMetadata = async (path: string) => {
    setLoadingMeta(true);
    setMetaMessage(null);
    try {
      const res = await fetch(
        `/api/seo-config?siteId=${selectedSite}&path=${path}`,
      );
      if (res.ok) {
        const data = await res.json();
        setMetaForm({
          path: path,
          title: data.title || "",
          description: data.description || "",
          canonicalUrl: data.canonicalUrl || "",
          robots: data.robots || "index, follow",
          ogTitle: data.ogTitle || "",
          ogDescription: data.ogDescription || "",
          ogImage: data.ogImage || "",
          ogType: data.ogType || "website",
          twitterCard: data.twitterCard || "summary_large_image",
          twitterTitle: data.twitterTitle || "",
          twitterDescription: data.twitterDescription || "",
          twitterImage: data.twitterImage || "",
          schemaMarkup: data.schemaMarkup || "",
        });
      }
    } catch (err) {
      console.error("Failed to load meta:", err);
    } finally {
      setLoadingMeta(false);
    }
  };

  // Fetch Blogs
  const fetchBlogs = async (shouldResetForm = false) => {
    setLoadingBlogs(true);
    setBlogMessage(null);
    if (shouldResetForm) {
      setSelectedBlog(null);
      resetBlogForm();
    }
    try {
      const res = await fetch(
        `/api/blogs?siteId=${selectedSite}&publishedOnly=false`,
      );
      if (res.ok) {
        const data = await res.json();
        setBlogList(data.blogs);
      }
    } catch (err) {
      console.error("Failed to load blogs:", err);
    } finally {
      setLoadingBlogs(false);
    }
  };

  // Fetch Redirects
  const fetchRedirects = async () => {
    setLoadingRedirects(true);
    setRedirectMessage(null);
    try {
      const res = await fetch(`/api/redirects?siteId=${selectedSite}`);
      if (res.ok) {
        const data = await res.json();
        setRedirectList(data);
      }
    } catch (err) {
      console.error("Failed to load redirects:", err);
    } finally {
      setLoadingRedirects(false);
    }
  };

  // Fetch Tracker Config
  const fetchTrackerConfig = async () => {
    setLoadingTracker(true);
    setTrackerMessage(null);
    try {
      const res = await fetch(`/api/tracker-config?siteId=${selectedSite}`);
      if (res.ok) {
        const data = await res.json();
        setTrackerForm({
          googleAnalyticsId: data.googleAnalyticsId || "",
          metaPixelId: data.metaPixelId || "",
          searchConsoleTag: data.searchConsoleTag || "",
          headerScripts: data.headerScripts || "",
          footerScripts: data.footerScripts || "",
        });
      } else {
        setTrackerForm({
          googleAnalyticsId: "",
          metaPixelId: "",
          searchConsoleTag: "",
          headerScripts: "",
          footerScripts: "",
        });
      }
    } catch (err) {
      console.error("Failed to load tracker config:", err);
    } finally {
      setLoadingTracker(false);
    }
  };

  // Fetch Leads
  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const query = leadsFilter === "all" ? "" : `?siteId=${leadsFilter}`;
      const res = await fetch(`/api/leads${query}`);
      if (res.ok) {
        const data = await res.json();
        setLeadsList(data.leads);
      }
    } catch (err) {
      console.error("Failed to load leads:", err);
    } finally {
      setLoadingLeads(false);
    }
  };

  // Handle SEO Meta Submit
  const handleMetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingMeta(true);
    setMetaMessage(null);
    try {
      const res = await fetch("/api/seo-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: selectedSite,
          ...metaForm,
        }),
      });

      if (res.ok) {
        setMetaMessage({
          type: "success",
          text: "On-Page SEO Configuration updated successfully!",
        });
        fetchStats(); // Update dashboard counts
      } else {
        const err = await res.json();
        setMetaMessage({
          type: "error",
          text: err.error || "Failed to update SEO config.",
        });
      }
    } catch (err) {
      setMetaMessage({ type: "error", text: "Network connection failed." });
    } finally {
      setLoadingMeta(false);
    }
  };

  // Handle Blog Submit (Create or Update)
  const handleBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlogMessage(null);

    // Imported DOCX/PDF content is already sanitized server-side at import
    // time (see sanitizeHtml.ts). AI-generated content includes its own
    // self-contained <style> block (blogTemplates.ts) that a generic
    // allowlist would strip, so this save path is left as-is.
    const sanitizedContent = blogForm.content || "";

    if (!sanitizedContent || !sanitizedContent.trim()) {
      setBlogMessage({
        type: "error",
        text: "Content cannot be empty.",
      });
      return;
    }

    setLoadingBlogs(true);
    try {
      const method = selectedBlog ? "PUT" : "POST";
      const endpoint = selectedBlog
        ? `/api/blogs/${selectedBlog.slug}`
        : "/api/blogs";

      const payload = {
        siteId: selectedSite,
        ...blogForm,
        content: sanitizedContent, // Use cleaned content
      };

      const res = await fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedBlog = await res.json();
        setBlogMessage({
          type: "success",
          text: selectedBlog
            ? "Blog article updated successfully!"
            : "Blog article published successfully!",
        });
        setBlogFormDirty(false); // Clean flag!
        setSelectedBlog(savedBlog);
        setBlogForm({
          title: savedBlog.title || "",
          slug: savedBlog.slug || "",
          summary: savedBlog.summary || "",
          content: sanitizedContent,
          featuredImage: savedBlog.featuredImage || "",
          published: savedBlog.published || false,
          category: savedBlog.category || "",
          tags: savedBlog.tags || "",
          seoTitle: savedBlog.seoTitle || "",
          seoDescription: savedBlog.seoDescription || "",
          seoOgImage: savedBlog.seoOgImage || "",
          template: savedBlog.template || "",
        });
        slugManuallyEditedRef.current = false;

        fetchBlogs(false); // Reload list without clearing form
        fetchStats(); // Update stats
      } else {
        const err = await res.json();
        setBlogMessage({
          type: "error",
          text: err.error || "Failed to save blog post.",
        });
      }
    } catch (err) {
      setBlogMessage({ type: "error", text: "Network connection failed." });
    } finally {
      setLoadingBlogs(false);
    }
  };

  // Handle Blog Delete
  const handleBlogDelete = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;
    setLoadingBlogs(true);
    try {
      const res = await fetch(`/api/blogs/${slug}?siteId=${selectedSite}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setBlogMessage({
          type: "success",
          text: "Blog post deleted successfully.",
        });
        if (selectedBlog && selectedBlog.slug === slug) {
          setSelectedBlog(null);
          resetBlogForm();
        }
        fetchBlogs(false);
        fetchStats();
      } else {
        const err = await res.json();
        setBlogMessage({
          type: "error",
          text: err.error || "Failed to delete blog post.",
        });
      }
    } catch (err) {
      setBlogMessage({ type: "error", text: "Failed to delete blog." });
    } finally {
      setLoadingBlogs(false);
    }
  };

  // Handle Redirect Submit
  const handleRedirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingRedirects(true);
    setRedirectMessage(null);
    try {
      const res = await fetch("/api/redirects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: selectedSite,
          ...redirectForm,
        }),
      });

      if (res.ok) {
        setRedirectMessage({ type: "success", text: "Redirect rule added!" });
        setRedirectForm({
          sourcePath: "",
          destinationPath: "",
          statusCode: 301,
        });
        fetchRedirects();
        fetchStats();
      } else {
        const err = await res.json();
        setRedirectMessage({
          type: "error",
          text: err.error || "Failed to save redirect rule.",
        });
      }
    } catch (err) {
      setRedirectMessage({ type: "error", text: "Network connection failed." });
    } finally {
      setLoadingRedirects(false);
    }
  };

  // Handle Redirect Delete
  const handleRedirectDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/redirects?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRedirectMessage({ type: "success", text: "Redirect rule removed." });
        fetchRedirects();
        fetchStats();
      }
    } catch (err) {
      setRedirectMessage({
        type: "error",
        text: "Failed to delete redirect rule.",
      });
    }
  };

  // Handle Tracker Submit
  const handleTrackerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingTracker(true);
    setTrackerMessage(null);
    try {
      const res = await fetch("/api/tracker-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: selectedSite,
          ...trackerForm,
        }),
      });

      if (res.ok) {
        setTrackerMessage({
          type: "success",
          text: "Pixel and Script headers updated!",
        });
        fetchStats(); // Update pixel indicator light on dashboard
      } else {
        setTrackerMessage({
          type: "error",
          text: "Failed to update script headers.",
        });
      }
    } catch (err) {
      setTrackerMessage({ type: "error", text: "Network connection failed." });
    } finally {
      setLoadingTracker(false);
    }
  };

  // Trigger Gemini AI SEO Assist
  const runAiAssist = async (type: "meta" | "outline") => {
    if (!aiPrompt) {
      setAiError("Please enter a topic or keyword in the AI Prompt field.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          type: type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiResult({ type, data });
      } else {
        const err = await res.json();
        setAiError(err.error || "AI generation failed.");
      }
    } catch (err) {
      setAiError("Failed to communicate with AI endpoint.");
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-generate slug from blog title
  const handleBlogTitleChange = (title: string) => {
    setBlogForm((prev) => {
      if (slugManuallyEditedRef.current) {
        return { ...prev, title };
      }
      return { ...prev, title, slug: slugify(title) };
    });
    setBlogFormDirty(true);
  };

  // Helper to update blog form and mark dirty
  const updateBlogForm = (fields: Partial<BlogPost>) => {
    setBlogForm((prev) => ({
      ...prev,
      ...fields,
    }));
    setBlogFormDirty(true);
  };

  // Helper to prompt on unsaved changes
  const confirmDiscardIfDirty = (action: () => void) => {
    if (blogFormDirty) {
      if (!window.confirm("You have unsaved changes. Discard them?")) {
        return;
      }
    }
    action();
  };

  // Site change selector handler
  const handleSiteChange = (siteId: string) => {
    confirmDiscardIfDirty(() => {
      setSelectedSite(siteId);
      setSelectedBlog(null);
      resetBlogForm();
    });
  };

  const handleTabChange = (
    tabName:
      | "overview"
      | "metadata"
      | "blogs"
      | "redirects"
      | "trackers"
      | "leads",
  ) => {
    if (activeTab === "blogs") {
      confirmDiscardIfDirty(() => setActiveTab(tabName));
    } else {
      setActiveTab(tabName);
    }
  };

  // Apply AI Meta Tags to Blog Form
  const applyAiMetaToBlog = () => {
    if (aiResult?.type === "meta" && aiResult?.data) {
      setBlogForm((prev) => ({
        ...prev,
        seoTitle: aiResult.data.title,
        seoDescription: aiResult.data.description,
      }));
      setBlogFormDirty(true);
    }
  };

  const resetBlogForm = () => {
    setBlogForm({
      title: "",
      slug: "",
      summary: "",
      content: "",
      featuredImage: "",
      published: false,
      category: "",
      tags: "",
      seoTitle: "",
      seoDescription: "",
      seoOgImage: "",
      template: "",
    });
    setBlogFormDirty(false);
    slugManuallyEditedRef.current = false;
    setContentViewMode("raw");
    setFormLoadId((id) => id + 1);
  };

  // Apply AI-generated blog (from the wizard) to the editor form
  const handleAiBlogGenerated = (result: BlogAIWizardResult) => {
    confirmDiscardIfDirty(() => {
      setSelectedBlog(null);
      setBlogForm({
        title: result.title || "",
        slug: result.slug || "",
        summary: result.summary || "",
        content: result.content || "",
        featuredImage: result.featuredImage || "",
        published: false,
        category: result.category || "",
        tags: result.tags || "",
        seoTitle: result.seoTitle || "",
        seoDescription: result.seoDescription || "",
        seoOgImage: "",
        template: result.template,
      });
      setBlogFormDirty(false);
      slugManuallyEditedRef.current = false;
      setContentViewMode("preview");
      setFormLoadId((id) => id + 1);
      setShowAiWizard(false);
      setBlogMessage({
        type: "success",
        text: result.imageSuggestion
          ? `Draft generated! Suggested image search: "${result.imageSuggestion.query}" (alt text: "${result.imageSuggestion.alt}") — paste a URL into Featured Image above.`
          : "Draft generated! Review and edit below, then publish whenever you're ready.",
      });
    });
  };

  // Apply an imported DOCX/PDF document's converted content to the editor form
  const handleDocumentImported = (result: ImportDocumentResult) => {
    confirmDiscardIfDirty(() => {
      setSelectedBlog(null);
      setBlogForm({
        title: result.title || "",
        slug: slugify(result.title || ""),
        summary: "",
        content: result.html || "",
        featuredImage: "",
        published: false,
        category: "",
        tags: "",
        seoTitle: "",
        seoDescription: "",
        seoOgImage: "",
        template: "",
      });
      setBlogFormDirty(true);
      slugManuallyEditedRef.current = false;
      setContentViewMode("preview");
      setFormLoadId((id) => id + 1);
      setShowImportModal(false);
      setBlogMessage({
        type: "success",
        text:
          result.warnings.length > 0
            ? `Document imported! ${result.warnings.join(" ")} Review below, then publish whenever you're ready.`
            : "Document imported! Review below, then publish whenever you're ready.",
      });
    });
  };

  // Quick Compose: converts plain text + uploaded images straight into blog
  // HTML and drops it into the content field (content only — title/slug/etc
  // are left as-is, unlike the AI/import flows which replace the whole form).
  const handleQuickCompose = async () => {
    if (!quickText.trim()) return;
    setQuickConverting(true);
    setBlogMessage(null);
    try {
      const formData = new FormData();
      formData.append("text", quickText);
      formData.append("siteId", selectedSite || "general");
      quickImages.forEach((file) => formData.append("images", file));

      const res = await fetch("/api/blogs/import-text", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        setBlogMessage({
          type: "error",
          text: json.error || "Failed to convert text to HTML.",
        });
        return;
      }

      updateBlogForm({ content: json.html });
      setContentViewMode("preview");
      setFormLoadId((id) => id + 1);
      setQuickText("");
      setQuickImages([]);
      setBlogMessage({
        type: "success",
        text: "Converted! Review the formatted content below, then publish whenever you're ready.",
      });
    } catch (err) {
      setBlogMessage({
        type: "error",
        text: "Network error while converting.",
      });
    } finally {
      setQuickConverting(false);
    }
  };

  // Apply the AI-restyled HTML from ModifyHtmlModal back into the Raw HTML box.
  const handleHtmlModified = (html: string) => {
    updateBlogForm({ content: html });
    setContentViewMode("preview");
    setFormLoadId((id) => id + 1);
    setShowModifyModal(false);
    setBlogMessage({
      type: "success",
      text: "Look & feel updated! Review the content below, then publish whenever you're ready.",
    });
  };

  const selectBlogForEdit = (blog: BlogPost) => {
    confirmDiscardIfDirty(() => {
      setSelectedBlog(blog);
      setBlogForm({
        title: blog.title || "",
        slug: blog.slug || "",
        summary: blog.summary || "",
        content: blog.content || "",
        featuredImage: blog.featuredImage || "",
        published: blog.published || false,
        category: blog.category || "",
        tags: blog.tags || "",
        seoTitle: blog.seoTitle || "",
        seoDescription: blog.seoDescription || "",
        seoOgImage: blog.seoOgImage || "",
        template: blog.template || "",
      });
      setBlogFormDirty(false);
      slugManuallyEditedRef.current = false;
      setContentViewMode("raw");
      setFormLoadId((id) => id + 1);
      setAiPrompt(blog.title || "");
    });
  };
  return (
    <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0">
        {/* LOGO BOX */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center glow-indigo">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              Antigravity
            </h1>
            <p className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase">
              SEO Command Center
            </p>
          </div>
        </div>

        {/* WEBSITE GLOBAL SELECTOR */}
        <div className="p-4 border-b border-slate-850">
          <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5 px-1">
            Selected Site
          </label>
          <div className="relative">
            <select
              value={selectedSite}
              onChange={(e) => handleSiteChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm font-semibold rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none transition-colors"
            >
              <option value="gotolatest">🌐 GoToLatest (Next.js)</option>
              <option value="hehe">🎙️ Raipur Podcast (Vite+React)</option>
              <option value="sunnest">🏠 Sunnest (Next.js)</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              <ChevronRight className="h-4 w-4 rotate-90" />
            </div>
          </div>
        </div>

        {/* TABS SELECT NAVIGATION */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
          <button
            onClick={() => handleTabChange("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
              activeTab === "overview"
                ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500 font-bold"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5" />
            Command Overview
          </button>

          <button
            onClick={() => handleTabChange("metadata")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
              activeTab === "metadata"
                ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500 font-bold"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
          >
            <Globe className="h-4.5 w-4.5" />
            Page Metadata
          </button>

          <button
            onClick={() => handleTabChange("blogs")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
              activeTab === "blogs"
                ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500 font-bold"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
          >
            <FileText className="h-4.5 w-4.5" />
            Blogs CMS
          </button>

          <button
            onClick={() => handleTabChange("redirects")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
              activeTab === "redirects"
                ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500 font-bold"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
          >
            <Shuffle className="h-4.5 w-4.5" />
            SEO Redirects
          </button>

          <button
            onClick={() => handleTabChange("trackers")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
              activeTab === "trackers"
                ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500 font-bold"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
          >
            <Code className="h-4.5 w-4.5" />
            Tracker Tags
          </button>

          <button
            onClick={() => handleTabChange("leads")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
              activeTab === "leads"
                ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500 font-bold"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
          >
            <Users className="h-4.5 w-4.5" />
            CRM Leads Inbox
          </button>
        </nav>

        {/* SYSTEM STATUS */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            SEO Hub Connected
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT DISPLAY AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* HEADER BAR */}
        <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h2 className="font-extrabold text-xl tracking-tight capitalize text-white flex items-center gap-2">
              {activeTab === "overview" && "Marketing Overview"}
              {activeTab === "metadata" && "Route SEO configuration"}
              {activeTab === "blogs" && "Central content manager (CMS)"}
              {activeTab === "redirects" && "301 / 302 Path Redirection Engine"}
              {activeTab === "trackers" && "Tracking pixels & Tag injections"}
              {activeTab === "leads" && "Micro-CRM Lead capture records"}
            </h2>
          </div>

          {/* Refresh metrics */}
          <button
            onClick={() => {
              fetchStats();
              if (activeTab === "leads") fetchLeads();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-850 hover:border-slate-700 bg-slate-950 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload Data
          </button>
        </header>

        {/* WORKSPACE TAB VIEWS */}
        <div className="flex-1 p-6">
          {/* 1. OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* TOP BRAND STATS ROW */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {loadingStats ? (
                  <div className="col-span-3 h-64 flex items-center justify-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <Loader className="h-8 w-8 animate-spin mr-3 text-indigo-500" />
                    Loading central indexes...
                  </div>
                ) : (
                  siteStatsList.map((site) => {
                    const scores = perfScores[site.id];
                    const hasScores =
                      scores &&
                      scores.mobile !== null &&
                      scores.desktop !== null &&
                      !scores.loading;
                    return (
                      <div
                        key={site.id}
                        className="glass-panel rounded-2xl p-6 glow-card flex flex-col justify-between h-[310px]"
                      >
                        <div>
                          {/* Title Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-lg text-white tracking-tight">
                                {site.name}
                              </h3>
                              <a
                                href={site.baseUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-indigo-400 flex items-center gap-1 hover:underline mt-0.5"
                              >
                                {site.baseUrl}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>

                            {/* Active Indicators */}
                            <div className="flex gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${site.pixels.ga4 ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-500"}`}
                              >
                                GA4
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${site.pixels.meta ? "bg-purple-500/15 text-purple-400" : "bg-slate-800 text-slate-500"}`}
                              >
                                PIXEL
                              </span>
                            </div>
                          </div>

                          {/* Counts Metrics Grid */}
                          <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-850">
                              <div className="text-xs text-slate-400 font-medium">
                                SEO Pages
                              </div>
                              <div className="text-xl font-extrabold text-white mt-0.5">
                                {site.counts.seoConfigs}
                              </div>
                            </div>
                            <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-850">
                              <div className="text-xs text-slate-400 font-medium">
                                CMS Blogs
                              </div>
                              <div className="text-xl font-extrabold text-white mt-0.5">
                                {site.counts.blogs}
                              </div>
                            </div>
                            <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-850">
                              <div className="text-xs text-slate-400 font-medium">
                                Redirects
                              </div>
                              <div className="text-xl font-extrabold text-white mt-0.5">
                                {site.counts.redirects}
                              </div>
                            </div>
                            <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-850">
                              <div className="text-xs text-slate-400 font-medium">
                                CRM Leads
                              </div>
                              <div className="text-xl font-extrabold text-white mt-0.5">
                                {site.counts.leads}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Performance Bar (Lighthouse Audit Score) */}
                        <div className="mt-4 border-t border-slate-800/80 pt-3 flex flex-col gap-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-medium flex items-center gap-1">
                              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                              Performance Score:
                            </span>
                            <div className="flex gap-3 font-extrabold">
                              {scores?.loading ? (
                                <span className="text-indigo-400 animate-pulse">
                                  Auditing...
                                </span>
                              ) : hasScores ? (
                                <>
                                  <span
                                    className={
                                      (scores.mobile ?? 0) >= 90
                                        ? "text-emerald-400"
                                        : (scores.mobile ?? 0) >= 50
                                          ? "text-amber-400"
                                          : "text-red-400"
                                    }
                                  >
                                    Mobile: {scores.mobile}
                                  </span>
                                  <span
                                    className={
                                      (scores.desktop ?? 0) >= 90
                                        ? "text-emerald-400"
                                        : (scores.desktop ?? 0) >= 50
                                          ? "text-amber-400"
                                          : "text-red-400"
                                    }
                                  >
                                    Desktop: {scores.desktop}
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-500">
                                  Not Audited
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={scores?.loading}
                            onClick={() =>
                              runPerformanceAudit(site.id, site.baseUrl)
                            }
                            className="w-full text-center py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-700 text-[10px] font-bold tracking-wider uppercase rounded-lg text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer"
                          >
                            {scores?.loading
                              ? "Analyzing PageSpeed..."
                              : "Run Live Lighthouse Audit"}
                          </button>

                          {scores?.simulated && !scores?.loading && (
                            <div className="text-[9px] text-amber-500 font-medium leading-none text-center">
                              * Localhost bypassed: Serving simulated score.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* QUICK MARKETING BENCHMARKS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Integration Status Info */}
                <div className="glass-panel rounded-2xl p-6 border border-slate-800">
                  <h3 className="font-bold text-white mb-4 text-base flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-indigo-400" />
                    SEO Setup Status
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3.5 bg-slate-950/40 rounded-xl border border-slate-850">
                      <div>
                        <div className="text-sm font-semibold text-slate-200">
                          Next.js Client Module
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          gotolatest, sunnest
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        Compatible
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3.5 bg-slate-950/40 rounded-xl border border-slate-850">
                      <div>
                        <div className="text-sm font-semibold text-slate-200">
                          React Client Header Injection
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          hehe (Raipur Podcast)
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        Pre-rendering Set
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3.5 bg-slate-950/40 rounded-xl border border-slate-850">
                      <div>
                        <div className="text-sm font-semibold text-slate-200">
                          Central SQLite Database
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Prisma ORM
                        </div>
                      </div>
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                        Running Dev
                      </span>
                    </div>
                  </div>
                </div>

                {/* Micro-CRM Quick view */}
                <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white mb-3 text-base flex items-center gap-2">
                      <Users className="h-5 w-5 text-indigo-400" />
                      Digital Marketing Lead Influx
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Leads and customer sign-ups captured from forms on your
                      three sites route here.
                    </p>
                  </div>

                  <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-850 text-center py-6">
                    <h4 className="text-sm text-slate-400 font-semibold uppercase tracking-wider">
                      Total Captured Contacts
                    </h4>
                    <p className="text-4xl font-extrabold text-white mt-1.5">
                      {siteStatsList.reduce(
                        (acc, curr) => acc + curr.counts.leads,
                        0,
                      )}
                    </p>
                    <button
                      onClick={() => setActiveTab("leads")}
                      className="mt-4 text-xs text-indigo-400 font-bold hover:text-indigo-300 hover:underline flex items-center gap-1 mx-auto"
                    >
                      Open Leads Inbox
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. PAGE METADATA TAB */}
          {activeTab === "metadata" && (
            <div className="glass-panel rounded-2xl p-6 border border-slate-800">
              {/* Route Input selector */}
              <div className="flex flex-col md:flex-row md:items-end gap-4 pb-6 mb-6 border-b border-slate-800">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    Edit Route Pathname
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-semibold select-none">
                      /
                    </span>
                    <input
                      type="text"
                      placeholder="about, contact, pricing (leave blank for home page)"
                      value={metadataRoutePath.slice(1)}
                      onChange={(e) => {
                        const pathVal = "/" + e.target.value;
                        setMetadataRoutePath(pathVal);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg pl-6 pr-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fetchMetadata(metadataRoutePath)}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white transition-colors"
                >
                  Load Route Data
                </button>
              </div>

              {metaMessage && (
                <div
                  className={`p-4 mb-6 rounded-xl border flex items-start gap-2.5 text-sm ${
                    metaMessage.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-red-500/10 border-red-500/30 text-red-400"
                  }`}
                >
                  {metaMessage.type === "success" ? (
                    <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  )}
                  {metaMessage.text}
                </div>
              )}

              {loadingMeta ? (
                <div className="h-96 flex items-center justify-center text-slate-400">
                  <Loader className="h-8 w-8 animate-spin mr-3 text-indigo-500" />
                  Loading metadata config...
                </div>
              ) : (
                <form onSubmit={handleMetaSubmit} className="space-y-6">
                  {/* On-Page Meta */}
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-white border-l-3 border-indigo-500 pl-2">
                      A. On-Page Search Tags
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                          Meta Title
                        </label>
                        <input
                          type="text"
                          required
                          value={metaForm.title || ""}
                          onChange={(e) =>
                            setMetaForm((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          placeholder="Maximum 60 characters recommended"
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Characters: {metaForm.title?.length || 0} / 60
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                          Canonical URL Override
                        </label>
                        <input
                          type="text"
                          value={metaForm.canonicalUrl || ""}
                          onChange={(e) =>
                            setMetaForm((prev) => ({
                              ...prev,
                              canonicalUrl: e.target.value,
                            }))
                          }
                          placeholder="e.g. https://yoursite.com/canonical-override"
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                          Meta Description
                        </label>
                        <textarea
                          rows={2}
                          value={metaForm.description || ""}
                          onChange={(e) =>
                            setMetaForm((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Maximum 155 characters recommended"
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Characters: {metaForm.description?.length || 0} / 155
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                          Robots Directive
                        </label>
                        <select
                          value={metaForm.robots || "index, follow"}
                          onChange={(e) =>
                            setMetaForm((prev) => ({
                              ...prev,
                              robots: e.target.value,
                            }))
                          }
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="index, follow">
                            index, follow (Allow Indexing & Links)
                          </option>
                          <option value="noindex, nofollow">
                            noindex, nofollow (Ignore Indexing & Links)
                          </option>
                          <option value="noindex, follow">
                            noindex, follow (Ignore Page, Follow Links)
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Open Graph Tags */}
                  <div className="space-y-4 pt-4 border-t border-slate-800/80">
                    <h3 className="text-base font-bold text-white border-l-3 border-purple-500 pl-2">
                      B. Social Graph Tags (OpenGraph & Twitter)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                          OG Custom Title
                        </label>
                        <input
                          type="text"
                          value={metaForm.ogTitle || ""}
                          onChange={(e) =>
                            setMetaForm((prev) => ({
                              ...prev,
                              ogTitle: e.target.value,
                            }))
                          }
                          placeholder="OG Social Title (Falls back to Meta Title if blank)"
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                          OG Custom Image URL
                        </label>
                        <input
                          type="text"
                          value={metaForm.ogImage || ""}
                          onChange={(e) =>
                            setMetaForm((prev) => ({
                              ...prev,
                              ogImage: e.target.value,
                            }))
                          }
                          placeholder="Image link for social sharing prevews"
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                          OG Custom Description
                        </label>
                        <textarea
                          rows={2}
                          value={metaForm.ogDescription || ""}
                          onChange={(e) =>
                            setMetaForm((prev) => ({
                              ...prev,
                              ogDescription: e.target.value,
                            }))
                          }
                          placeholder="OG Social Description"
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Schema Markup */}
                  <div className="space-y-4 pt-4 border-t border-slate-800/80">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-bold text-white border-l-3 border-emerald-500 pl-2">
                        C. Schema Markup (JSON-LD)
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            if (metaForm.schemaMarkup) {
                              const parsed = JSON.parse(metaForm.schemaMarkup);
                              setMetaForm((prev) => ({
                                ...prev,
                                schemaMarkup: JSON.stringify(parsed, null, 2),
                              }));
                              alert("JSON structure is valid & formatted!");
                            }
                          } catch (err) {
                            alert("Invalid JSON syntax. Please verify.");
                          }
                        }}
                        className="text-xs text-indigo-400 font-bold hover:underline hover:text-indigo-300"
                      >
                        Format & Validate JSON
                      </button>
                    </div>
                    <div>
                      <textarea
                        rows={6}
                        value={metaForm.schemaMarkup || ""}
                        onChange={(e) =>
                          setMetaForm((prev) => ({
                            ...prev,
                            schemaMarkup: e.target.value,
                          }))
                        }
                        placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "..."\n}`}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/85">
                    <button
                      type="submit"
                      disabled={loadingMeta}
                      className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition-colors"
                    >
                      {loadingMeta
                        ? "Saving Configuration..."
                        : "Save Page SEO configuration"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 3. BLOGS CMS TAB */}
          {activeTab === "blogs" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: list of posts */}
              <div className="lg:col-span-4 glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col h-[600px]">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                  <h3 className="font-bold text-white text-sm">
                    Written Articles
                  </h3>
                  <button
                    onClick={() => {
                      confirmDiscardIfDirty(() => {
                        setSelectedBlog(null);
                        resetBlogForm();
                      });
                    }}
                    className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Post
                  </button>
                </div>

                {loadingBlogs ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400">
                    <Loader className="h-6 w-6 animate-spin mr-2 text-indigo-500" />
                    Loading blogs list...
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                    {blogList.length === 0 ? (
                      <div className="text-center text-xs text-slate-500 py-12">
                        No blogs created for this site yet.
                      </div>
                    ) : (
                      blogList.map((blog) => (
                        <div
                          key={blog.id}
                          onClick={() => selectBlogForEdit(blog)}
                          className={`p-3 rounded-xl border cursor-pointer text-left transition-all relative group ${
                            selectedBlog?.id === blog.id
                              ? "bg-indigo-500/10 border-indigo-500 text-white shadow-sm"
                              : "bg-slate-950/40 border-slate-850 text-slate-300 hover:border-slate-700 hover:bg-slate-900/40"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-sm truncate flex-1">
                              {blog.title}
                            </h4>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBlogDelete(blog.slug);
                              }}
                              title="Delete blog post"
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 hover:bg-slate-850 rounded transition-all shrink-0"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400">
                            <span>
                              Slug:{" "}
                              <code className="font-mono text-indigo-400">
                                /{blog.slug}
                              </code>
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded-full font-bold uppercase ${blog.published ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}
                            >
                              {blog.published ? "Live" : "Draft"}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: post writer editor */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                {/* Editor box */}
                <div className="glass-panel rounded-2xl p-6 border border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <h3 className="font-bold text-white text-base border-l-3 border-indigo-500 pl-2">
                      {selectedBlog
                        ? `Editing: ${selectedBlog.title}`
                        : "Draft New Article"}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold px-3.5 py-2 rounded-lg transition-colors"
                      >
                        <FileUp className="h-3.5 w-3.5" />
                        Import Document
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAiWizard(true)}
                        className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-3.5 py-2 rounded-lg transition-colors shadow-md"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate with AI
                      </button>
                    </div>
                  </div>

                  {blogMessage && (
                    <div
                      className={`p-3.5 mb-6 rounded-xl border flex items-start gap-2.5 text-sm ${
                        blogMessage.type === "success"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-red-500/10 border-red-500/30 text-red-400"
                      }`}
                    >
                      {blogMessage.type === "success" ? (
                        <CheckCircle className="h-5 w-5 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 mt-0.5" />
                      )}
                      {blogMessage.text}
                    </div>
                  )}

                  <form onSubmit={handleBlogSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-400 mb-1">
                          Post Title
                        </label>
                        <input
                          type="text"
                          required
                          value={blogForm.title || ""}
                          onChange={(e) =>
                            handleBlogTitleChange(e.target.value)
                          }
                          placeholder="e.g. 10 Local SEO Tips for Business"
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">
                          Slug URL
                        </label>
                        <input
                          type="text"
                          required
                          value={blogForm.slug || ""}
                          onChange={(e) => {
                            updateBlogForm({ slug: e.target.value });
                            slugManuallyEditedRef.current = true;
                          }}
                          placeholder="auto-generated-slug"
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-mono text-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">
                          Category
                        </label>
                        <input
                          type="text"
                          value={blogForm.category || ""}
                          onChange={(e) =>
                            updateBlogForm({ category: e.target.value })
                          }
                          placeholder="e.g. Marketing, Case Studies"
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-400 mb-1">
                          Featured Image URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={blogForm.featuredImage || ""}
                            onChange={(e) =>
                              updateBlogForm({ featuredImage: e.target.value })
                            }
                            placeholder="Image link (Unsplash, Pexels, local assets)"
                            className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                          />
                          <label className="bg-slate-900 border border-slate-800 hover:bg-slate-805 text-slate-200 text-xs px-3.5 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 font-bold transition-all whitespace-nowrap">
                            <Upload className="h-3.5 w-3.5 text-indigo-400" />
                            Upload File
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const formData = new FormData();
                                formData.append("file", file);
                                formData.append(
                                  "siteId",
                                  selectedSite || "general",
                                );
                                try {
                                  const res = await fetch("/api/upload", {
                                    method: "POST",
                                    body: formData,
                                  });
                                  if (res.ok) {
                                    const json = await res.json();
                                    updateBlogForm({ featuredImage: json.url });
                                  } else {
                                    alert("Failed to upload image.");
                                  }
                                } catch (err) {
                                  console.error(err);
                                  alert("Upload error.");
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-400 mb-1">
                          Summary / Teaser
                        </label>
                        <input
                          type="text"
                          value={blogForm.summary || ""}
                          onChange={(e) =>
                            updateBlogForm({ summary: e.target.value })
                          }
                          placeholder="Short summary for archive page list preview"
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-400">
                            Content (HTML)
                          </label>
                          <div className="flex gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => setContentViewMode("raw")}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${
                                contentViewMode === "raw"
                                  ? "bg-indigo-600 text-white"
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              <Code2 className="h-3 w-3" />
                              Raw HTML
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                // Force BlogEditor to remount so it picks up
                                // whatever was typed in the Raw HTML textarea.
                                setFormLoadId((id) => id + 1);
                                setContentViewMode("preview");
                              }}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${
                                contentViewMode === "preview"
                                  ? "bg-indigo-600 text-white"
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              <Eye className="h-3 w-3" />
                              Visual Editor
                            </button>
                          </div>
                        </div>
                        <div
                          className={
                            contentViewMode === "raw" ? "block" : "hidden"
                          }
                        >
                          <div className="flex justify-end mb-1.5">
                            <button
                              type="button"
                              onClick={() => setShowModifyModal(true)}
                              disabled={!blogForm.content?.trim()}
                              className="flex items-center gap-1.5 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              <Wand2 className="h-3 w-3" />
                              Modify with AI
                            </button>
                          </div>
                          <textarea
                            rows={15}
                            required
                            value={blogForm.content || ""}
                            onChange={(e) =>
                              updateBlogForm({ content: e.target.value })
                            }
                            placeholder="Write article details, or click Generate with AI above..."
                            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                        <div
                          className={
                            contentViewMode === "preview" ? "block" : "hidden"
                          }
                        >
                          <BlogEditor
                            key={formLoadId}
                            value={blogForm.content || ""}
                            onChange={(html) =>
                              updateBlogForm({ content: html })
                            }
                            siteId={selectedSite}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Live Preview */}
                    <div className="space-y-3 pt-4 border-t border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Live Preview
                        </h4>
                        <button
                          type="button"
                          onClick={() =>
                            previewIframeRef.current?.requestFullscreen()
                          }
                          className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-indigo-400 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 transition-colors"
                        >
                          <Maximize2 className="h-3 w-3" />
                          Fullscreen
                        </button>
                      </div>
                      <iframe
                        ref={previewIframeRef}
                        src="/preview/blog"
                        title="Live preview"
                        className="w-full h-[420px] rounded-lg border border-slate-800 bg-white"
                        onLoad={() => {
                          previewIframeRef.current?.contentWindow?.postMessage(
                            {
                              type: "BLOG_PREVIEW_UPDATE",
                              title: blogForm.title || "",
                              html: blogForm.content || "",
                              siteId: selectedSite,
                            },
                            window.location.origin,
                          );
                        }}
                      />
                    </div>

                    {/* Quick Compose: Text + Images -> Blog HTML */}
                    <div className="space-y-3 pt-4 border-t border-slate-800/80">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Quick Compose: Text + Images → Blog HTML
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Write or paste your article text, add any images, and
                        we&apos;ll turn it into formatted blog content below —
                        no typing HTML required.
                      </p>
                      <textarea
                        rows={6}
                        value={quickText}
                        onChange={(e) => setQuickText(e.target.value)}
                        placeholder="Write or paste your article text here. Leave a blank line between paragraphs."
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-200 text-xs px-3.5 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 font-bold transition-all">
                          <Upload className="h-3.5 w-3.5 text-indigo-400" />
                          {quickImages.length > 0
                            ? `${quickImages.length} image(s) selected`
                            : "Upload Images"}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) =>
                              setQuickImages(Array.from(e.target.files || []))
                            }
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleQuickCompose}
                          disabled={quickConverting || !quickText.trim()}
                          className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-3.5 py-2 rounded-lg transition-colors"
                        >
                          {quickConverting
                            ? "Converting..."
                            : "Convert to Blog HTML"}
                        </button>
                      </div>
                    </div>

                    {/* SEO Overrides */}
                    <div className="space-y-3 pt-4 border-t border-slate-800/80">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Custom Blog SEO Overrides
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                            Custom Title Tag
                          </label>
                          <input
                            type="text"
                            value={blogForm.seoTitle || ""}
                            onChange={(e) =>
                              updateBlogForm({ seoTitle: e.target.value })
                            }
                            placeholder="Defaults to Post Title if empty"
                            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                            Custom OG Image URL
                          </label>
                          <input
                            type="text"
                            value={blogForm.seoOgImage || ""}
                            onChange={(e) =>
                              updateBlogForm({ seoOgImage: e.target.value })
                            }
                            placeholder="Defaults to Featured Image if empty"
                            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                            Custom Description Tag
                          </label>
                          <input
                            type="text"
                            value={blogForm.seoDescription || ""}
                            onChange={(e) =>
                              updateBlogForm({ seoDescription: e.target.value })
                            }
                            placeholder="Defaults to Summary if empty"
                            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Publish toggle & action buttons */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between pt-4 border-t border-slate-800/80 gap-4">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={blogForm.published || false}
                          onChange={(e) =>
                            updateBlogForm({ published: e.target.checked })
                          }
                          className="h-4.5 w-4.5 accent-indigo-600 rounded bg-slate-950 border border-slate-800 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="text-sm font-semibold text-slate-200">
                          Publish immediately to website
                        </span>
                      </label>

                      <div className="flex gap-2">
                        {selectedBlog && (
                          <button
                            type="button"
                            onClick={() => handleBlogDelete(selectedBlog.slug)}
                            className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-xs transition-all flex items-center gap-1.5"
                          >
                            <Trash className="h-3.5 w-3.5" />
                            Delete Post
                          </button>
                        )}
                        <button
                          type="submit"
                          className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-colors"
                        >
                          {selectedBlog ? "Update Post" : "Create Post"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Quick meta-tag tool, handy when editing an already-drafted post */}
                <div className="glass-panel rounded-2xl p-6 border border-slate-800 border-l-4 border-l-indigo-500">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-indigo-400" />
                    </div>
                    <h3 className="font-bold text-white text-sm">
                      Quick SEO Meta Tags
                    </h3>
                  </div>

                  <p className="text-xs text-slate-400 mb-4">
                    Need to refresh just the SEO title/description for this
                    post? Enter a keyword or title below.
                  </p>

                  <div className="flex flex-col md:flex-row gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Enter a keyword or title (e.g. Chhattisgarh local business marketing)"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-850 hover:border-slate-750 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => runAiAssist("meta")}
                      disabled={aiLoading}
                      className="px-4 py-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-900 font-bold text-xs text-indigo-400 transition-colors shrink-0"
                    >
                      {aiLoading ? "Thinking..." : "Regenerate Meta Tags"}
                    </button>
                  </div>

                  {aiError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4" />
                      {aiError}
                    </div>
                  )}

                  {aiResult?.type === "meta" && (
                    <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-850 space-y-3">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-800 pb-2">
                        <span className="uppercase tracking-widest font-extrabold text-indigo-400">
                          AI OUTPUT RESULTS
                        </span>
                        <span>Model: Gemini 2.5 Flash</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-[10px] font-semibold text-slate-500 uppercase">
                            Suggested Meta Title
                          </div>
                          <div className="text-xs text-slate-200 font-bold bg-slate-950 px-2.5 py-1.5 rounded-lg mt-0.5 border border-slate-850">
                            {aiResult.data.title}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold text-slate-500 uppercase">
                            Suggested Meta Description
                          </div>
                          <div className="text-xs text-slate-200 bg-slate-950 px-2.5 py-1.5 rounded-lg mt-0.5 border border-slate-850">
                            {aiResult.data.description}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={applyAiMetaToBlog}
                          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 mt-2"
                        >
                          Apply these meta tags to the form above
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showAiWizard && (
            <BlogAIWizard
              siteId={selectedSite}
              onClose={() => setShowAiWizard(false)}
              onGenerated={handleAiBlogGenerated}
            />
          )}

          {showImportModal && (
            <ImportDocumentModal
              siteId={selectedSite}
              onClose={() => setShowImportModal(false)}
              onImported={handleDocumentImported}
            />
          )}

          {showModifyModal && (
            <ModifyHtmlModal
              currentHtml={blogForm.content || ""}
              onClose={() => setShowModifyModal(false)}
              onModified={handleHtmlModified}
            />
          )}

          {/* 4. REDIRECTS TAB */}
          {activeTab === "redirects" && (
            <div className="space-y-6">
              {/* Creator Form */}
              <div className="glass-panel rounded-2xl p-6 border border-slate-800">
                <h3 className="font-bold text-white text-base mb-4 border-l-3 border-indigo-500 pl-2">
                  Create New URL Redirect
                </h3>

                {redirectMessage && (
                  <div
                    className={`p-3 rounded-xl border flex items-start gap-2 text-sm mb-4 ${
                      redirectMessage.type === "success"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-red-500/10 border-red-500/30 text-red-400"
                    }`}
                  >
                    {redirectMessage.type === "success" ? (
                      <CheckCircle className="h-5 w-5 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 mt-0.5" />
                    )}
                    {redirectMessage.text}
                  </div>
                )}

                <form
                  onSubmit={handleRedirectSubmit}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Source URL Path
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. /old-page"
                      value={redirectForm.sourcePath}
                      onChange={(e) =>
                        setRedirectForm((prev) => ({
                          ...prev,
                          sourcePath: e.target.value,
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Destination URL Path
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. /blog/new-page"
                      value={redirectForm.destinationPath}
                      onChange={(e) =>
                        setRedirectForm((prev) => ({
                          ...prev,
                          destinationPath: e.target.value,
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                        Redirect Code
                      </label>
                      <select
                        value={redirectForm.statusCode}
                        onChange={(e) =>
                          setRedirectForm((prev) => ({
                            ...prev,
                            statusCode: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value={301}>301 (Permanent)</option>
                        <option value={302}>302 (Temporary)</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={loadingRedirects}
                      className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shrink-0 h-9.5 align-middle mt-auto"
                    >
                      Add Rule
                    </button>
                  </div>
                </form>
              </div>

              {/* Redirect List Table */}
              <div className="glass-panel rounded-2xl p-6 border border-slate-800">
                <h3 className="font-bold text-white text-base mb-4">
                  Active Redirection Tables
                </h3>

                {loadingRedirects ? (
                  <div className="h-32 flex items-center justify-center text-slate-400">
                    <Loader className="h-6 w-6 animate-spin mr-2 text-indigo-500" />
                    Loading routing rules...
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-850">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-900/80 border-b border-slate-850 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
                        <tr>
                          <th className="p-4">Source Route</th>
                          <th className="p-4">Target Destination</th>
                          <th className="p-4 w-32">Type</th>
                          <th className="p-4 w-24 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 bg-slate-950/20 text-slate-200 font-medium">
                        {redirectList.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="p-8 text-center text-slate-500"
                            >
                              No redirects defined. Add a rule above to prevent
                              crawler 404 penalties.
                            </td>
                          </tr>
                        ) : (
                          redirectList.map((rule) => (
                            <tr key={rule.id} className="hover:bg-slate-900/25">
                              <td className="p-4 font-mono text-indigo-400">
                                {rule.sourcePath}
                              </td>
                              <td className="p-4 font-mono text-slate-400">
                                {rule.destinationPath}
                              </td>
                              <td className="p-4">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full font-bold ${
                                    rule.statusCode === 301
                                      ? "bg-emerald-500/10 text-emerald-400"
                                      : "bg-amber-500/10 text-amber-400"
                                  }`}
                                >
                                  {rule.statusCode}{" "}
                                  {rule.statusCode === 301
                                    ? "Permanent"
                                    : "Temporary"}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRedirectDelete(rule.id)}
                                  className="p-1 rounded hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors"
                                  title="Delete rule"
                                >
                                  <Trash className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. TRACKER CONFIG TAB */}
          {activeTab === "trackers" && (
            <div className="glass-panel rounded-2xl p-6 border border-slate-800">
              <h3 className="font-bold text-white text-base mb-6 border-l-3 border-indigo-500 pl-2">
                Configure Pixel Tracking & Tag Management
              </h3>

              {trackerMessage && (
                <div
                  className={`p-3.5 mb-6 rounded-xl border flex items-start gap-2.5 text-sm ${
                    trackerMessage.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-red-500/10 border-red-500/30 text-red-400"
                  }`}
                >
                  {trackerMessage.type === "success" ? (
                    <CheckCircle className="h-5 w-5 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 mt-0.5" />
                  )}
                  {trackerMessage.text}
                </div>
              )}

              {loadingTracker ? (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  <Loader className="h-8 w-8 animate-spin mr-3 text-indigo-500" />
                  Loading pixel configurations...
                </div>
              ) : (
                <form onSubmit={handleTrackerSubmit} className="space-y-6">
                  {/* Analytic keys */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                        Google Analytics (GA4) Measurement ID
                      </label>
                      <input
                        type="text"
                        value={trackerForm.googleAnalyticsId}
                        onChange={(e) =>
                          setTrackerForm((prev) => ({
                            ...prev,
                            googleAnalyticsId: e.target.value,
                          }))
                        }
                        placeholder="e.g. G-XXXXXXXXXX"
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                        Meta (Facebook) Pixel ID
                      </label>
                      <input
                        type="text"
                        value={trackerForm.metaPixelId}
                        onChange={(e) =>
                          setTrackerForm((prev) => ({
                            ...prev,
                            metaPixelId: e.target.value,
                          }))
                        }
                        placeholder="e.g. 1234567890"
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                        Google Search Console Verification Tag
                      </label>
                      <input
                        type="text"
                        value={trackerForm.searchConsoleTag}
                        onChange={(e) =>
                          setTrackerForm((prev) => ({
                            ...prev,
                            searchConsoleTag: e.target.value,
                          }))
                        }
                        placeholder={`e.g. <meta name="google-site-verification" content="..." />`}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Header scripts insertion */}
                  <div className="space-y-4 pt-4 border-t border-slate-800/80">
                    <h3 className="font-bold text-white text-sm">
                      Custom Code Injection (Enterprise Integration)
                    </h3>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                        Header Scripts (`&lt;head&gt;` insertion)
                      </label>
                      <textarea
                        rows={4}
                        value={trackerForm.headerScripts}
                        onChange={(e) =>
                          setTrackerForm((prev) => ({
                            ...prev,
                            headerScripts: e.target.value,
                          }))
                        }
                        placeholder="<!-- Raw HTML like Hotjar scripts, custom styles, GTM tags -->"
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                        Footer Scripts (end of `&lt;body&gt;` insertion)
                      </label>
                      <textarea
                        rows={4}
                        value={trackerForm.footerScripts}
                        onChange={(e) =>
                          setTrackerForm((prev) => ({
                            ...prev,
                            footerScripts: e.target.value,
                          }))
                        }
                        placeholder="<!-- Raw HTML like chat widgets, helper scripts, analytics plugins -->"
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/85">
                    <button
                      type="submit"
                      disabled={loadingTracker}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-lg shadow-md transition-colors"
                    >
                      {loadingTracker
                        ? "Updating configuration..."
                        : "Update tracking configuration"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 6. LEADS TAB */}
          {activeTab === "leads" && (
            <div className="glass-panel rounded-2xl p-6 border border-slate-800">
              {/* Filter Row */}
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 mb-6 border-b border-slate-800">
                <h3 className="font-bold text-white text-base">
                  Captured Leads & Newsletter Signups
                </h3>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-400 shrink-0">
                    Filter Site:
                  </label>
                  <select
                    value={leadsFilter}
                    onChange={(e) => {
                      setLeadsFilter(e.target.value);
                      // In useEffect this triggers leads reloading
                    }}
                    className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none cursor-pointer"
                  >
                    <option value="all">📁 All Sites Combined</option>
                    <option value="gotolatest">🌐 GoToLatest</option>
                    <option value="hehe">🎙️ Raipur Podcast</option>
                    <option value="sunnest">🏠 Sunnest</option>
                  </select>
                </div>
              </div>

              {loadingLeads ? (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  <Loader className="h-6 w-6 animate-spin mr-2 text-indigo-500" />
                  Retrieving leads inbox...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-850">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900/80 border-b border-slate-850 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
                      <tr>
                        <th className="p-4">Submission Date</th>
                        <th className="p-4">Inquiry Name</th>
                        <th className="p-4">Contact Info</th>
                        <th className="p-4">Message</th>
                        <th className="p-4 w-36 text-center">Channel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 bg-slate-950/20 text-slate-200 font-medium">
                      {leadsList.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-8 text-center text-slate-500"
                          >
                            No leads captured yet. Connect your site's contact
                            forms to POST to `http://localhost:3000/api/leads`
                            to sync entries here.
                          </td>
                        </tr>
                      ) : (
                        leadsList.map((lead) => (
                          <tr key={lead.id} className="hover:bg-slate-900/25">
                            <td className="p-4 text-slate-400 whitespace-nowrap">
                              {new Date(lead.createdAt).toLocaleString()}
                            </td>
                            <td className="p-4 font-bold text-white whitespace-nowrap">
                              {lead.name}
                              <span className="block text-[10px] text-indigo-400 font-semibold mt-0.5">
                                {lead.formName}
                              </span>
                            </td>
                            <td className="p-4 space-y-0.5 whitespace-nowrap">
                              <div className="text-slate-200">{lead.email}</div>
                              {lead.phone && (
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {lead.phone}
                                </div>
                              )}
                            </td>
                            <td
                              className="p-4 max-w-xs truncate text-slate-300"
                              title={lead.message}
                            >
                              {lead.message || (
                                <span className="text-slate-600 italic">
                                  No message supplied
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                                  lead.siteId === "gotolatest"
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : lead.siteId === "hehe"
                                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                }`}
                              >
                                {lead.siteId === "gotolatest" && "gotolatest"}
                                {lead.siteId === "hehe" && "raipur podcast"}
                                {lead.siteId === "sunnest" && "sunnest"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
