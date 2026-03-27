const jwt = require("jsonwebtoken");

const JWT_SECRET = "super-secure-jwt-secret-change-later";

function jwtAuth(req, res, next) {
    try {
        // 1. Get token
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        const token = authHeader.split(" ")[1];

        // 2. Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // 3. Attach user to request
        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
            error: error.message
        });
    }
}

module.exports = jwtAuth;