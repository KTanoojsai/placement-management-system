const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_key_143";

// Middleware to require JWT authentication
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Authentication required. Please log in." });
        }

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: "Invalid or expired session. Please log in again." });
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "User account no longer exists." });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: "Your account has been deactivated." });
        }

        // Attach user info to request
        req.user = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            accountType: user.accountType,
            organizationId: user.organizationId ? user.organizationId.toString() : null
        };

        next();
    } catch (error) {
        console.error("Authentication middleware error:", error);
        return res.status(500).json({ message: "Internal server error during authentication" });
    }
};

// Middleware to restrict access to specific roles
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required." });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access denied. Requires role: ${allowedRoles.join(" or ")}` });
        }

        next();
    };
};

// Helper function to check organization level access
const hasOrganizationAccess = (user, resourceOrgId) => {
    if (user.role === "SUPER_ADMIN") return true;
    
    const userOrgStr = user.organizationId ? user.organizationId.toString() : null;
    const resourceOrgStr = resourceOrgId ? resourceOrgId.toString() : null;

    return userOrgStr === resourceOrgStr;
};

module.exports = {
    requireAuth,
    requireRole,
    hasOrganizationAccess,
    JWT_SECRET
};
