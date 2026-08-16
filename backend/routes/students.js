const express = require("express");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Get all students (admin/officer scoped)
router.get("/", requireAuth, requireRole("PLACEMENT_OFFICER", "SUPER_ADMIN"), async (req, res) => {
    try {
        const user = req.user;
        let query = { role: "STUDENT" };

        if (user.role === "PLACEMENT_OFFICER") {
            query.organizationId = user.organizationId;
        }

        const students = await User.find(query)
            .select("-password")
            .sort({ createdAt: -1 });

        res.json(students);

    } catch (error) {
        res.status(500).json({
            message: "Failed to get students",
            error: error.message
        });
    }
});

module.exports = router;
