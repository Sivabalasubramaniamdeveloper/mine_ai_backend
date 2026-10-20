import supabase from "../config/supabase.js";
import env from "../config/env.js";

/**
 * Resolves public URLs for HLS manifest and poster image from Supabase storage.
 * @param {object} video
 * @returns {object} video with hls_url and poster_url attached
 */
const attachPublicUrls = (video) => {
  if (!video) return null;

  const { data: hls } = supabase.storage
    .from(env.supabaseBucket)
    .getPublicUrl(video.hls_path);

  const posterUrl = video.poster_path
    ? supabase.storage.from(env.supabaseBucket).getPublicUrl(video.poster_path).data.publicUrl
    : null;

  return {
    ...video,
    hls_url: hls.publicUrl,
    poster_url: posterUrl,
  };
};

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

  return (data || []).map(attachPublicUrls);
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
