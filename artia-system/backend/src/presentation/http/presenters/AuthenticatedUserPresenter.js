export function toAuthenticatedRequestUser(profile) {
  return {
    userId: profile.id,
    id: profile.id,
    email: profile.email,
    name: profile.name,
    factorialEmployeeId: profile.factorialEmployeeId,
    artiaUserId: profile.artiaUserId
  };
}
