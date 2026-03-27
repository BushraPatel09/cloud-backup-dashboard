const fetch = require("node-fetch");

async function verifyGoogleToken(req, res, next) {
  try {
    // 1. Read Authorization header
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No Authorization header"
      });
    }

    // Format: Bearer TOKEN
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token missing"
      });
    }

    // 2. Verify token with Google
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`
    );

    const data = await response.json();

    // 3. Validate token
    if (data.error) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google token",
        error: data.error
      });
    }

    // 4. Token valid → attach user info
    req.googleUser = data;
    next();

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Google token verification failed",
      error: error.message
    });
  }
}

module.exports = verifyGoogleToken;
    
