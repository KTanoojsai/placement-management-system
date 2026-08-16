const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        recipientRole: {
            type: String,
            enum: ["student", "admin", "SUPER_ADMIN", "PLACEMENT_OFFICER", "STUDENT", "RECRUITER"],
            default: null
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            default: null
        },
        title: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        readBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Notification", notificationSchema);
