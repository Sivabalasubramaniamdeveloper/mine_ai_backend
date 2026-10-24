import * as emailHelperService from "../services/emailHelper.service.js";

export const generateEmail = async (req, res, next) => {
  try {
    const result = await emailHelperService.generateEmail({
      userId: req.user.id,
      userName: req.user.full_name || req.user.name,
      instructions: req.body.instructions,
      tone: req.body.tone,
      model: req.body.model,
    });

    return res.status(200).json({
      success: true,
      message: "Email generated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getSmtpStatus = async (req, res, next) => {
  try {
    const status = await emailHelperService.getSmtpConfigStatus(req.user.id);

    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

export const saveSmtpConfig = async (req, res, next) => {
  try {
    const result = await emailHelperService.saveSmtpConfig(req.user.id, {
      app_password: req.body.app_password,
      key_name: req.body.key_name,
    });

    return res.status(200).json({
      success: true,
      message: "Email App Password saved securely",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSmtpConfig = async (req, res, next) => {
  try {
    const result = await emailHelperService.deleteSmtpConfig(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Email App Password removed",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getSavedEmails = async (req, res, next) => {
  try {
    const result = await emailHelperService.getSavedEmails(req.user.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const saveEmailDraft = async (req, res, next) => {
  try {
    const result = await emailHelperService.saveEmailDraft(req.user.id, req.body);
    return res.status(201).json({ success: true, message: "Email saved securely to cloud", data: result });
  } catch (error) { next(error); }
};

export const deleteSavedEmail = async (req, res, next) => {
  try {
    await emailHelperService.deleteSavedEmail(req.user.id, req.params.id);
    return res.status(200).json({ success: true, message: "Saved email deleted" });
  } catch (error) { next(error); }
};

export const sendDirectEmail = async (req, res, next) => {
  try {
    const result = await emailHelperService.sendDirectEmail({
      userId: req.user.id,
      to: req.body.to,
      cc: req.body.cc,
      subject: req.body.subject,
      body: req.body.body,
    });

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
