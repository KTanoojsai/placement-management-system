const express = require("express");
const Organization = require("../models/Organization");
const User = require("../models/User");
const Company = require("../models/Company");
const Application = require("../models/Application");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Apply SUPER_ADMIN restriction to all routes in this router
router.use(requireAuth, requireRole("SUPER_ADMIN"));

// Get all organizations
router.get("/organizations", async (req, res) => {
    try {
        const organizations = await Organization.find().sort({ createdAt: -1 });
        res.json(organizations);
    } catch (error) {
        res.status(500).json({ message: "Failed to get organizations", error: error.message });
    }
});

// Create organization
router.post("/organizations", async (req, res) => {
    try {
        const { name, organizationCode, status } = req.body;

        if (!name || !organizationCode) {
            return res.status(400).json({ message: "Name and unique organization code are required." });
        }

        const existingOrg = await Organization.findOne({ organizationCode });
        if (existingOrg) {
            return res.status(400).json({ message: "Organization code must be unique. This code is already in use." });
        }

        const organization = new Organization({
            name,
            organizationCode,
            status: status || "ACTIVE"
        });

        await organization.save();
        res.status(201).json({ message: "Organization created successfully", organization });
    } catch (error) {
        res.status(500).json({ message: "Failed to create organization", error: error.message });
    }
});

// Update organization details/status
router.put("/organizations/:orgId", async (req, res) => {
    try {
        const { name, organizationCode, status } = req.body;
        const orgId = req.params.orgId;

        const org = await Organization.findById(orgId);
        if (!org) {
            return res.status(404).json({ message: "Organization not found" });
        }

        // If code is changing, check uniqueness
        if (organizationCode && organizationCode !== org.organizationCode) {
            const existingOrg = await Organization.findOne({ organizationCode });
            if (existingOrg) {
                return res.status(400).json({ message: "Organization code already in use." });
            }
            org.organizationCode = organizationCode;
        }

        if (name) org.name = name;
        if (status) org.status = status;

        await org.save();
        res.json({ message: "Organization updated successfully", organization: org });
    } catch (error) {
        res.status(500).json({ message: "Failed to update organization", error: error.message });
    }
});

// Get all users with optional organization filtering
router.get("/users", async (req, res) => {
    try {
        const { organizationId } = req.query;
        let query = {};

        if (organizationId) {
            query.organizationId = organizationId;
        }

        const users = await User.find(query)
            .select("-password")
            .populate("organizationId", "name organizationCode")
            .sort({ createdAt: -1 });

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Failed to get users", error: error.message });
    }
});

// Get global platform statistics
router.get("/stats", async (req, res) => {
    try {
        const totalOrgs = await Organization.countDocuments();
        const totalStudents = await User.countDocuments({ role: "STUDENT" });
        const orgStudents = await User.countDocuments({ role: "STUDENT", accountType: "ORGANIZATION" });
        const indStudents = await User.countDocuments({ role: "STUDENT", accountType: "INDIVIDUAL" });
        const totalOfficers = await User.countDocuments({ role: "PLACEMENT_OFFICER" });
        const totalRecruiters = await User.countDocuments({ role: "RECRUITER" });
        const totalJobs = await Company.countDocuments();
        const totalApplications = await Application.countDocuments();

        // Calculate statistics per organization
        const orgs = await Organization.find();
        const orgStats = [];

        for (let org of orgs) {
            const studentCount = await User.countDocuments({ role: "STUDENT", organizationId: org._id });
            const officerCount = await User.countDocuments({ role: "PLACEMENT_OFFICER", organizationId: org._id });
            const jobCount = await Company.countDocuments({ organizationId: org._id });
            const appCount = await Application.countDocuments({ organizationId: org._id });

            orgStats.push({
                organizationId: org._id,
                name: org.name,
                code: org.organizationCode,
                status: org.status,
                studentCount,
                officerCount,
                jobCount,
                appCount
            });
        }

        res.json({
            global: {
                totalOrgs,
                totalStudents,
                orgStudents,
                indStudents,
                totalOfficers,
                totalRecruiters,
                totalJobs,
                totalApplications
            },
            organizations: orgStats
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to load platform stats", error: error.message });
    }
});

module.exports = router;
