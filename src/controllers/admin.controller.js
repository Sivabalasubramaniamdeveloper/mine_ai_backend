import * as adminService from "../services/admin.service.js";
import * as ticketService from "../services/ticket.service.js";

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await adminService.adminLogin({ email, password });
    return res.status(200).json({
      success: true,
      message: "Admin authentication successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboard = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    return res.status(200).json({
      success: true,
      message: "Admin dashboard stats retrieved successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const { query, tier_code } = req.query;
    const users = await adminService.getAllUsers({ query, tierCode: tier_code });
    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

export const changeUserPlan = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { plan_id } = req.body;
    if (!plan_id) {
      return res.status(400).json({ success: false, message: "plan_id is required" });
    }

    const updated = await adminService.updateUserPlan(userId, plan_id);
    return res.status(200).json({
      success: true,
      message: "User plan updated successfully",
      data: { user: updated },
    });
  } catch (error) {
    next(error);
  }
};

export const adjustUserCredits = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { credits } = req.body;
    if (credits === undefined) {
      return res.status(400).json({ success: false, message: "credits amount is required" });
    }

    const updated = await adminService.updateUserCredits(userId, credits);
    return res.status(200).json({
      success: true,
      message: "User credits adjusted successfully",
      data: { user: updated },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await adminService.deleteUser(userId);
    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listTickets = async (req, res, next) => {
  try {
    const { status, priority, module, query } = req.query;
    const tickets = await ticketService.getAllTickets({ status, priority, module, query });
    return res.status(200).json({
      success: true,
      message: "Support tickets retrieved successfully",
      data: { tickets },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { status, priority, admin_notes } = req.body;

    const updated = await ticketService.updateTicket({
      ticketId,
      status,
      priority,
      adminNotes: admin_notes,
    });

    return res.status(200).json({
      success: true,
      message: "Support ticket updated successfully",
      data: { ticket: updated },
    });
  } catch (error) {
    next(error);
  }
};

export const createTicket = async (req, res, next) => {
  try {
    const { user_id, user_email, user_name, module, category, priority, subject, description } = req.body;
    const ticket = await ticketService.createTicket({
      userId: user_id || "admin_sys",
      userEmail: user_email,
      userName: user_name,
      module,
      category,
      priority,
      subject,
      description,
    });

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

export const listPlans = async (req, res, next) => {
  try {
    const plans = await adminService.getPlans();
    return res.status(200).json({
      success: true,
      message: "Plans catalog retrieved successfully",
      data: { plans },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const updated = await adminService.updatePlan(planId, req.body);
    return res.status(200).json({
      success: true,
      message: "Plan quotas updated successfully",
      data: { plan: updated },
    });
  } catch (error) {
    next(error);
  }
};

export const listApiKeys = async (req, res, next) => {
  try {
    const keys = await adminService.getApiKeys();
    return res.status(200).json({
      success: true,
      message: "API keys retrieved successfully",
      data: { keys },
    });
  } catch (error) {
    next(error);
  }
};

export const toggleApiKey = async (req, res, next) => {
  try {
    const { keyId } = req.params;
    const { is_active } = req.body;
    const result = await adminService.toggleApiKey(keyId, is_active);
    return res.status(200).json({
      success: true,
      message: "API key status updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getHealth = async (req, res, next) => {
  try {
    const health = await adminService.getSystemHealth();
    return res.status(200).json({
      success: true,
      message: "System health retrieved successfully",
      data: health,
    });
  } catch (error) {
    next(error);
  }
};
