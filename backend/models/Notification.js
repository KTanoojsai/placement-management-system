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
            enum: ["student", "admin"],
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
