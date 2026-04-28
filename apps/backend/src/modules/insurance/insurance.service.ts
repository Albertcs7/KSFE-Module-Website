import { getAllPoliciesRepo } from "./insurance.repository";

export const getAllPoliciesService = async () => {
  const policies = await getAllPoliciesRepo();

  // later: validations, transformations, business rules

  return policies;
};