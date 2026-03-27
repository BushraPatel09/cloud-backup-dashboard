function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        next(); // logged in
    } else {
        res.redirect("/public/login.html"); // ✅ correct path
    }
}

module.exports = requireAuth;
