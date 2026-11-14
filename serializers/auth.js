function serializeUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    telephone: user.telephone,
    email: user.email,
    role: user.role,
    providerId: user.providerId ? String(user.providerId) : null,
    createdAt: new Date(user.createdAt).toISOString(),
  };
}

module.exports = { serializeUser };
