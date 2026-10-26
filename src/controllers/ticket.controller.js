import * as ticketService from "../services/ticket.service.js";

export const createTicket = async (req, res, next) => {
  try {
    const { module, category, priority, subject, description } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: "Subject and description are required",
      });
    }

    const ticket = await ticketService.createTicket({
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.user_metadata?.full_name || req.user.user_metadata?.username || "User",
      module,
      category,
      priority,
      subject,
      description,
    });

    return res.status(201).json({
      success: true,
      message: "Support ticket created and submitted to admin team successfully",
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserTickets = async (req, res, next) => {
  try {
    const tickets = await ticketService.getUserTickets(req.user.id);
    return res.status(200).json({
      success: true,
      message: "User support tickets fetched successfully",
      data: { tickets },
    });
  } catch (error) {
    next(error);
  }
};

export const getTicketById = async (req, res, next) => {
  try {
    const ticket = await ticketService.getTicketById(req.params.id, req.user.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Ticket details fetched successfully",
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};
