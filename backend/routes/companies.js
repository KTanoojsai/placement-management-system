const express = require("express");
const Company = require("../models/Company");
const Application = require("../models/Application");
const Notification = require("../models/Notification");
const User = require("../models/User");

const router = express.Router();

// Get all companies
router.get("/", async (req, res) => {
    try {
        const companies = await Company.find().sort({ createdAt: -1 });
        res.json(companies);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get companies"
        });
    }
});

// Add company
router.post("/", async (req, res) => {
    try {
        const company = new Company(req.body);
        await company.save();

        // Trigger notification for all students
        const notification = new Notification({
            recipientRole: "student",
            title: "New Job Opportunity",
            message: `New job posted: ${company.role} at ${company.name}. Package: ${company.package}.`
        });
        await notification.save();

        res.status(201).json({
            message: "Company added successfully",
            company
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to add company",
            error: error.message
        });
    }
});

// Delete company
router.delete("/:companyId", async (req, res) => {
    try {
        await Company.findByIdAndDelete(req.params.companyId);
        await Application.deleteMany({ company: req.params.companyId });

        res.json({
            message: "Company deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete company",
            error: error.message
        });
    }
});

// Apply for company
router.post("/:companyId/apply", async (req, res) => {
    try {
        const { studentId } = req.body;

        const existingApplication = await Application.findOne({
            student: studentId,
            company: req.params.companyId
        });

        if (existingApplication) {
            return res.status(400).json({
                message: "Already applied to this company"
            });
        }

        const application = new Application({
            student: studentId,
            company: req.params.companyId
        });

        await application.save();

        // Trigger notification for placement officer (admin)
        try {
            const student = await User.findById(studentId);
            const company = await Company.findById(req.params.companyId);
            if (student && company) {
                const notification = new Notification({
                    recipientRole: "admin",
                    title: "New Application Received",
                    message: `${student.name} has applied for the position of ${company.role} at ${company.name}.`
                });
                await notification.save();
            }
        } catch (notifErr) {
            console.error("Failed to trigger application notification:", notifErr);
        }

        res.status(201).json({
            message: "Application submitted successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Application failed",
            error: error.message
        });
    }
});

// Get student's applications
router.get("/applications/:studentId", async (req, res) => {
    try {
        const applications = await Application.find({
            student: req.params.studentId
        }).populate("company").sort({ createdAt: -1 });

        res.json(applications);

    } catch (error) {
        res.status(500).json({
            message: "Failed to get applications"
        });
    }
});

// Get ALL applications (admin)
router.get("/all-applications/list", async (req, res) => {
    try {
        const applications = await Application.find()
            .populate("student", "name email branch cgpa")
            .populate("company", "name role package")
            .sort({ createdAt: -1 });

        res.json(applications);

    } catch (error) {
        res.status(500).json({
            message: "Failed to get applications"
        });
    }
});

// Update application status (admin)
router.put("/applications/:applicationId/status", async (req, res) => {
    try {
        const { status } = req.body;

        if (!["Applied", "Shortlisted", "Selected", "Rejected"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        const application = await Application.findByIdAndUpdate(
            req.params.applicationId,
            { status },
            { new: true }
        ).populate("student", "name email").populate("company", "name role");

        if (!application) {
            return res.status(404).json({
                message: "Application not found"
            });
        }

        // Trigger notification for student
        try {
            let displayStatus = status;
            if (status === "Selected") {
                displayStatus = "Hired";
            }
            const notification = new Notification({
                recipient: application.student._id,
                title: "Application Status Update",
                message: `Your application for ${application.company.role} at ${application.company.name} has been ${displayStatus.toLowerCase()}.`
            });
            await notification.save();
        } catch (notifErr) {
            console.error("Failed to trigger status update notification:", notifErr);
        }

        res.json({
            message: "Status updated successfully",
            application
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to update status",
            error: error.message
        });
    }
});

module.exports = router;