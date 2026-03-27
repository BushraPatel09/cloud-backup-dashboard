function roleGuard(allowedRoles = []) {
    return (req, res, next) => {
        const user = req.user;

        if (!user || !user.role) {
            return res.status(403).json({
                success: false,
                message: "Role not found"
            });
        }

        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied: role restricted"
            });
        }

        next();
    };
}

module.exports = roleGuard;