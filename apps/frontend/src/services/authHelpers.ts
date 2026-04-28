export const clearLocalAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("auth_user");
};
