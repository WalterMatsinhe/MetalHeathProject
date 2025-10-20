const jwt = require("jsonwebtoken");

// Middleware to verify JWT and attach user to request
function auth(req, res, next) {
  // Try to get token from Authorization header first
  let token = req.header("Authorization")?.replace("Bearer ", "");

  // If no token in header, try to get from cookies
  if (!token && req.cookies && req.cookies.authToken) {
    token = req.cookies.authToken;
  }

  if (!token) {
    console.log("No token found in Authorization header or cookies");
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const jwtSecret =
      process.env.JWT_SECRET || "fallback_jwt_secret_for_development_only";
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    console.log("User authenticated:", decoded.id, decoded.role);
    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    res.status(401).json({ message: "Token is not valid" });
  }
}

// Middleware to check therapist role
function therapist(req, res, next) {
  if (req.user?.role !== "therapist") {
    return res.status(403).json({ message: "Access denied: Therapists only" });
  }
  next();
}

module.exports = { auth, therapist };
