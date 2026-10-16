import {
  getUserProfileById,
  updateUserProfile,
  getPlanCatalog,
  assignUserPlan,
} from "../repositories/user.repository.js";

export const getMyProfile = async (userId) => {
  const user = await getUserProfileById(userId);

  return user;
};

export const updateMyProfile = async (userId, data) => {
  return await updateUserProfile(userId, data);
};

// Keep plan catalog reads and assignments on the backend, where the service role can read the catalog.
export const getAvailablePlans = async () => getPlanCatalog();

export const updateMyPlan = async (userId, planId) =>
  assignUserPlan(userId, planId);
