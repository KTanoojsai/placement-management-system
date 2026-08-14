const express = require("express");
const Notification = require("../models/Notification");

const router = express.Router();

// Get notifications for a specific user based on their ID and role
router.get("/:userId/:role", async (req, res) => {
    try {
        const { userId, role } = req.params;

        const notifications = await Notification.find({
            $or: [
                { recipient: userId },
                { recipientRole: role }
            ]
        }).sort({ createdAt: -1 });

        // Map notifications to include a simple "read" boolean for frontend convenience
        const mapped = notifications.map(notif => {
            return {
                _id: notif._id,
                title: notif.title,
                message: notif.message,
                createdAt: notif.createdAt,
                read: notif.readBy.includes(userId)
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
router.put("/:notificationId/read", async (req, res) => {
    try {
        const { notificationId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "userId is required" });
        }

        const notification = await Notification.findByIdAndUpdate(
            notificationId,
            { $addToSet: { readBy: userId } },
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
router.put("/read-all", async (req, res) => {
    try {
        const { userId, role } = req.body;

        if (!userId || !role) {
            return res.status(400).json({ message: "userId and role are required" });
        }

        await Notification.updateMany(
            {
                $or: [
                    { recipient: userId },
                    { recipientRole: role }
                ],
                readBy: { $ne: userId }
            },
            { $addToSet: { readBy: userId } }
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
