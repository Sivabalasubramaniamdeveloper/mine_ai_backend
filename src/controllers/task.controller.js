import * as taskService from "../services/task.service.js";

export const extractTask = async (req, res, next) => {
  try {
    const result = await taskService.extractTask({
      userId: req.user.id,
      prompt: req.body.prompt,
      model: req.body.model,
    });

    return res.status(200).json({
      success: true,
      message: "Task extracted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const notifyTaskEmail = async (req, res, next) => {
  try {
    const result = await taskService.notifyTaskEmail(req.user.id, req.body.task);

    return res.status(200).json({
      success: true,
      message: "Task confirmation sent to your email",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
