import supabase from "../config/supabase.js";
import env from "../config/env.js";

/**
 * Resolves public URLs for HLS manifest and poster image from Supabase storage.
 * @param {object} video
 * @returns {object} video with hls_url and poster_url attached
 */
const attachPublicUrls = (video) => {
  if (!video) return null;

  let hlsUrl = video.hls_path;
  if (video.hls_path && !video.hls_path.startsWith("http")) {
    const { data: hls } = supabase.storage
      .from(env.supabaseBucket)
      .getPublicUrl(video.hls_path);
    hlsUrl = hls?.publicUrl || video.hls_path;
  }

  let posterUrl = video.poster_path;
  if (video.poster_path && !video.poster_path.startsWith("http")) {
    const { data: poster } = supabase.storage
      .from(env.supabaseBucket)
      .getPublicUrl(video.poster_path);
    posterUrl = poster?.data?.publicUrl || null;
  }

  return {
    ...video,
    hls_url: hlsUrl,
    poster_url: posterUrl || video.poster_url || null,
  };
};

const CURATED_DEVELOPER_VIDEOS = [
  {
    id: "dev-001",
    title: "Building Autonomous Agentic AI Workflows",
    description: "Deep dive into multi-agent orchestration, tool routing, memory, and high-performance LLM streaming architectures.",
    category: "AI & Agents",
    poster_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
    hls_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    duration_seconds: 1420,
    is_featured: true,
  },
  {
    id: "dev-002",
    title: "Flutter Clean Architecture & BLoC Patterns",
    description: "Industry patterns for scalable Flutter applications with dependency injection, repository layer, and reactive state management.",
    category: "Mobile Architecture",
    poster_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800",
    hls_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    duration_seconds: 2180,
    is_featured: false,
  },
  {
    id: "dev-003",
    title: "Mastering Real-Time Systems with WebSockets & Redis",
    description: "How to build high-concurrency event pipelines, pub-sub architectures, and scalable notification engines.",
    category: "System Design",
    poster_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800",
    hls_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    duration_seconds: 1850,
    is_featured: false,
  },
  {
    id: "dev-004",
    title: "Cloud Native DevOps with Kubernetes & CI/CD",
    description: "Production guide to container orchestration, automated canary deployments, and monitoring with Prometheus.",
    category: "DevOps & Cloud",
    poster_url: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800",
    hls_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    duration_seconds: 1620,
    is_featured: false,
  },
];

/**
 * Fetches all published OTT videos with optional category or search filters.
 * @param {object} options
 * @param {string} [options.category]
 * @param {string} [options.search]
 * @returns {Promise<Array>}
 */
export const getAllVideos = async ({ category, search } = {}) => {
  let query = supabase
    .from("ott_videos")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (category && category !== "For you" && category !== "all") {
    query = query.eq("category", category);
  }

  if (search && search.trim()) {
    query = query.ilike("title", `%${search.trim()}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[OttService] Error querying videos:", error.message);
    throw error;
  }

  const mapped = (data || []).map(attachPublicUrls);
  // Blend in curated developer AI videos so the user has a full library across categories
  const allVideos = [...mapped];
  for (const curated of CURATED_DEVELOPER_VIDEOS) {
    if (!allVideos.some((v) => v.title === curated.title)) {
      if (!category || category === "For you" || category === "all" || curated.category === category) {
        if (!search || curated.title.toLowerCase().includes(search.toLowerCase())) {
          allVideos.push(curated);
        }
      }
    }
  }

  return allVideos;
};

/**
 * Fetches a single published video by its unique ID.
 * @param {string} id
 * @returns {Promise<object>}
 */
export const getVideoById = async (id) => {
  if (!id) {
    const error = new Error("Video ID is required");
    error.statusCode = 400;
    throw error;
  }

  const curated = CURATED_DEVELOPER_VIDEOS.find((v) => v.id === id);
  if (curated) return curated;

  const { data: video, error } = await supabase
    .from("ott_videos")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error(`[OttService] Error querying video ${id}:`, error.message);
    throw error;
  }

  if (!video) {
    const notFoundError = new Error("Video not found");
    notFoundError.statusCode = 404;
    notFoundError.code = "VIDEO_NOT_FOUND";
    throw notFoundError;
  }

  return attachPublicUrls(video);
};
