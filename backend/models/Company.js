const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        role: {
            type: String,
            required: true
        },
        eligibility: {
            type: String,
            required: true
        },
        location: {
            type: String,
            required: true
        },
        package: {
            type: String,
            required: true
        },
        description: {
            type: String,
            default: ""
        },
        requiredSkills: {
            type: [String],
            default: []
        },
        minimumCGPA: {
            type: Number,
            default: 0
        },
        eligibleBranches: {
            type: [String],
            default: []
        },
        jobType: {
            type: String,
            default: "Full Time"
        },
        workMode: {
            type: String,
            default: "Onsite"
        },
        openings: {
            type: Number,
            default: 1
        },
        applicationDeadline: {
            type: Date,
            default: null
        },
        visibility: {
            type: String,
            enum: ["PUBLIC", "ORGANIZATION_ONLY"],
            default: "PUBLIC"
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            default: null
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        status: {
            type: String,
            default: "ACTIVE"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Company", companySchema);