const express = require("express");
const Notification = require("../models/Notification");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Get notifications for a specific user based on their ID and role (JWT scoped)
router.get("/:userId/:role", requireAuth, async (req, res) => {
    try {
        const user = req.user;
        const { userId, role } = req.params;

        // Prevent IDOR: ensure request matches authenticated user's ID
        if (userId !== user.id) {
            return res.status(403).json({ message: "Access denied. Cannot view notifications of another user." });
        }

        // Fetch notifications:
        // 1. Direct recipient matches user ID
        // 2. Broadcasted to user's role in user's organization
        // 3. Broadcasted to user's role globally (organizationId is null)
        const notifications = await Notification.find({
            $or: [
                { recipient: user.id },
                { recipientRole: user.role, organizationId: user.organizationId },
                { recipientRole: user.role, organizationId: null }
            ]
        }).sort({ createdAt: -1 });

        // Map notifications to include a simple "read" boolean for frontend convenience
        const mapped = notifications.map(notif => {
            return {
                _id: notif._id,
                title: notif.title,
                message: notif.message,
                createdAt: notif.createdAt,
                read: notif.readBy.includes(user.id)
            };
        });

        res.json(mapped);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch notifications",
            error: error.message
        });
    }
});

// Mark a single notification as read
router.put("/:notificationId/read", requireAuth, async (req, res) => {
    try {
        const user = req.user;
        const { notificationId } = req.params;
        const { userId } = req.body;

        if (!userId || userId !== user.id) {
            return res.status(400).json({ message: "Invalid or mismatching userId." });
        }

        const notification = await Notification.findByIdAndUpdate(
            notificationId,
            { $addToSet: { readBy: user.id } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.json({
            message: "Notification marked as read",
            read: true
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to mark notification as read",
            error: error.message
        });
    }
});

// Mark all relevant notifications as read
router.put("/read-all", requireAuth, async (req, res) => {
    try {
        const user = req.user;
        const { userId } = req.body;

        if (!userId || userId !== user.id) {
            return res.status(400).json({ message: "Invalid or mismatching userId." });
        }

        await Notification.updateMany(
            {
                $or: [
                    { recipient: user.id },
                    { recipientRole: user.role, organizationId: user.organizationId },
                    { recipientRole: user.role, organizationId: null }
                ],
                readBy: { $ne: user.id }
            },
            { $addToSet: { readBy: user.id } }
        );

        res.json({
            message: "All notifications marked as read"
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to mark all notifications as read",
            error: error.message
        });
    }
});

module.exports = router;
