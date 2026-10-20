import * as ottService from "../services/ott.service.js";

/**
 * Controller to list all published videos.
 */
export const getVideos = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const videos = await ottService.getAllVideos({ category, search });

    return res.status(200).json({
      success: true,
      count: videos.length,
      data: videos,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get a single video by ID.
 */
export const getVideoById = async (req, res, next) => {
  try {
    const video = await ottService.getVideoById(req.params.id);

    return res.status(200).json({
      success: true,
      data: video,
    });
  } catch (error) {
    next(error);
  }
};
