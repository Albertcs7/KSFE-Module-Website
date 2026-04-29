import api from "../http/axios";

// GET policies
export const getPolicies = () => {
  return api.get("/insurance/policies");
};

// CREATE policy
export const createPolicy = (data: any) => {
  return api.post("/insurance/policies", data);
};