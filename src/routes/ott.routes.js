import { Router } from "express";
import supabase from "../config/supabase.js";
import env from "../config/env.js";

const router = Router();


// GET /api/v1/ott/videos
router.get("/videos", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("ott_videos")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const videos = data.map((video) => {
      const { data: hls } = supabase.storage
        .from(env.supabaseBucket)
        .getPublicUrl(video.hls_path);

      const { data: poster } = video.poster_path
        ? supabase.storage
            .from(env.supabaseBucket)
            .getPublicUrl(video.poster_path)
        : { data: { publicUrl: null } };

      return {
        ...video,
        hls_url: hls.publicUrl,
        poster_url: poster.publicUrl,
      };
    });

    res.json({
      success: true,
      count: videos.length,
      data: videos,
    });
  } catch (error) {
    console.error("OTT catalogue error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to load videos",
    });
  }
});

// GET /api/v1/ott/videos/:id
router.get("/videos/:id", async (req, res) => {
  try {
    const { data: video, error } = await supabase
      .from("ott_videos")
      .select("*")
      .eq("id", req.params.id)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    const { data: hls } = supabase.storage
      .from(env.supabaseBucket)
      .getPublicUrl(video.hls_path);

    res.json({
      success: true,
      data: {
        ...video,
        hls_url: hls.publicUrl,
      },
    });
  } catch (error) {
    console.error("OTT video error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to load video",
    });
  }
});

export default router;