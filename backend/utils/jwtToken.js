export const sendToken = (user, statusCode, res, message) => {
  const token = user.getJWTToken();
  const isProduction = process.env.NODE_ENV === "production";
  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // never readable from JS — the token travels ONLY in the cookie
    path: "/",
    // Same-site dev (http://localhost) works with Lax; a cross-site production
    // deployment needs Secure + SameSite=None or the cookie is dropped.
    ...(isProduction ? { secure: true, sameSite: "none" } : { sameSite: "lax" }),
  };

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    // Sanitized: identity fields only. The bcrypt hash and the raw JWT must
    // never appear in a response body (the cookie carries the token).
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    message,
  });
};
