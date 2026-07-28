import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import * as messagesService from "./messages.service.js";

export const listConversations = asyncHandler(async (req, res) => {
  const conversations = await messagesService.listConversationsForUser(req.user, {
    projectId: req.query.projectId,
    clientId: req.query.clientId,
  });
  res.status(200).json(new ApiResponse(200, { conversations }));
});

export const getMessages = asyncHandler(async (req, res) => {
  const messages = await messagesService.getMessagesForUser(
    req.user,
    req.params.conversationId,
  );
  res.status(200).json(new ApiResponse(200, { messages }));
});

export const create = asyncHandler(async (req, res) => {
  const message = await messagesService.createMessage(req.user, req.body);
  res.status(201).json(new ApiResponse(201, { message }, "Message sent"));
});

export const markRead = asyncHandler(async (req, res) => {
  const message = await messagesService.markMessageRead(req.user, req.params.messageId);
  res.status(200).json(new ApiResponse(200, { message }, "Message marked as read"));
});

export const remove = asyncHandler(async (req, res) => {
  await messagesService.deleteMessage(req.params.messageId);
  res.status(200).json(new ApiResponse(200, null, "Message deleted"));
});
