function permissionGuard(requiredPermissions = []) {
    return (req, res, next) => {
        const user = req.user;

        if (!user || !user.permissions) {
            return res.status(403).json({
                success: false,
                message: "No permissions found"
            });
        }

        const hasAllPermissions = requiredPermissions.every(p =>
            user.permissions.includes(p)
        );

        if (!hasAllPermissions) {
            return res.status(403).json({
                success: false,
                message: "Permission denied"
            });
        }

        next();
    };
}

module.exports = permissionGuard;