const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ["student", "admin", "SUPER_ADMIN", "PLACEMENT_OFFICER", "STUDENT", "RECRUITER"],
            required: true
        },
        phone: {
            type: String,
            default: ""
        },
        branch: {
            type: String,
            default: ""
        },
        cgpa: {
            type: Number,
            default: 0
        },
        resume: {
            type: String,
            default: ""
        },
        linkedin: {
            type: String,
            default: ""
        },
        github: {
            type: String,
            default: ""
        },
        skills: {
            type: [String],
            default: []
        },
        accountType: {
            type: String,
            enum: ["ORGANIZATION", "INDIVIDUAL"],
            default: "INDIVIDUAL"
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            default: null
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);