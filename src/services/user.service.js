import {
  getUserProfileById,
  updateUserProfile,
} from "../repositories/user.repository.js";

export const getMyProfile = async (userId) => {
  const user = await getUserProfileById(userId);

  return user;
};

export const updateMyProfile = async (userId, data) => {
  return await updateUserProfile(userId, data);
};
