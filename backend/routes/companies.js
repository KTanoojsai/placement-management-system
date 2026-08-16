const express = require("express");
const Company = require("../models/Company");
const Application = require("../models/Application");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { requireAuth, requireRole, hasOrganizationAccess } = require("../middleware/auth");

const router = express.Router();

// Get all jobs (discovery)
router.get("/", requireAuth, async (req, res) => {
    try {
        const user = req.user;
        let query = {};

        if (user.role === "SUPER_ADMIN") {
            // Super Admin sees all jobs
            query = {};
        } else if (user.role === "PLACEMENT_OFFICER") {
            // Placement Officers see jobs belonging to their organization
            query = { organizationId: user.organizationId };
        } else if (user.role === "RECRUITER") {
            // Recruiters see jobs they created
            query = { createdBy: user.id };
        } else if (user.role === "STUDENT") {
            // Students see jobs based on their account type
            if (user.accountType === "ORGANIZATION") {
                query = {
                    $or: [
                        { visibility: "PUBLIC" },
                        { visibility: "ORGANIZATION_ONLY", organizationId: user.organizationId }
                    ]
                };
            } else {
                query = { visibility: "PUBLIC" };
            }
        }

        const companies = await Company.find(query).sort({ createdAt: -1 });
        res.json(companies);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get jobs/companies"
        });
    }
});

// Add job (company)
router.post("/", requireAuth, requireRole("PLACEMENT_OFFICER", "RECRUITER", "SUPER_ADMIN"), async (req, res) => {
    try {
        const user = req.user;
        const jobData = { ...req.body };

        // Bind creator
        jobData.createdBy = user.id;

        // Set organization scopes and enforce visibility constraints
        if (user.role === "PLACEMENT_OFFICER") {
            jobData.organizationId = user.organizationId;
            // Placement officers can choose ORGANIZATION_ONLY or PUBLIC, default to ORGANIZATION_ONLY
            jobData.visibility = req.body.visibility || "ORGANIZATION_ONLY";
        } else if (user.role === "RECRUITER") {
            // Recruiters can only create PUBLIC jobs
            jobData.organizationId = null;
            jobData.visibility = "PUBLIC";
        } else if (user.role === "SUPER_ADMIN") {
            // Super admin can specify anything
            jobData.organizationId = req.body.organizationId || null;
            jobData.visibility = req.body.visibility || "PUBLIC";
        }

        const company = new Company(jobData);
        await company.save();

        // Trigger notifications
        let notification;
        if (company.visibility === "ORGANIZATION_ONLY") {
            // Scope to the specific college students
            notification = new Notification({
                recipientRole: "STUDENT",
                organizationId: company.organizationId,
                title: "New Job Opportunity",
                message: `New job posted: ${company.role} at ${company.name}. Package: ${company.package}.`
            });
        } else {
            // Global public job broadcast
            notification = new Notification({
                recipientRole: "STUDENT",
                organizationId: null,
                title: "New Public Job Opportunity",
                message: `New public job posted: ${company.role} at ${company.name}. Package: ${company.package}.`
            });
        }
        await notification.save();

        res.status(201).json({
            message: "Job added successfully",
            company
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to add job",
            error: error.message
        });
    }
});

// Delete job (company)
router.delete("/:companyId", requireAuth, requireRole("PLACEMENT_OFFICER", "RECRUITER", "SUPER_ADMIN"), async (req, res) => {
    try {
        const user = req.user;
        const company = await Company.findById(req.params.companyId);

        if (!company) {
            return res.status(404).json({ message: "Job not found" });
        }

        // Verify authorization to delete
        let authorized = false;
        if (user.role === "SUPER_ADMIN") {
            authorized = true;
        } else if (user.role === "PLACEMENT_OFFICER") {
            authorized = company.organizationId && company.organizationId.toString() === user.organizationId;
        } else if (user.role === "RECRUITER") {
            authorized = company.createdBy && company.createdBy.toString() === user.id;
        }

        if (!authorized) {
            return res.status(403).json({ message: "Access denied. You cannot delete this job." });
        }

        await Company.findByIdAndDelete(req.params.companyId);
        await Application.deleteMany({ company: req.params.companyId });

        res.json({
            message: "Job deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete job",
            error: error.message
        });
    }
});

// Apply for job (company)
router.post("/:companyId/apply", requireAuth, requireRole("STUDENT"), async (req, res) => {
    try {
        const user = req.user;
        const { studentId } = req.body;

        // Prevent student A applying on behalf of student B
        if (studentId && studentId !== user.id) {
            return res.status(403).json({ message: "Access denied. Cannot apply on behalf of another student." });
        }

        const company = await Company.findById(req.params.companyId);
        if (!company) {
            return res.status(404).json({ message: "Job opportunity not found." });
        }

        // Enforce job visibility & organization restrictions
        if (company.visibility === "ORGANIZATION_ONLY") {
            if (user.accountType !== "ORGANIZATION" || user.organizationId !== company.organizationId.toString()) {
                return res.status(403).json({ message: "Access denied. This job is private to another organization." });
            }
        }

        // Enforce eligibility criteria (like CGPA) if student profile has it
        const studentInfo = await User.findById(user.id);
        if (company.minimumCGPA && studentInfo.cgpa < company.minimumCGPA) {
            return res.status(400).json({
                message: `Application rejected. Minimum CGPA required is ${company.minimumCGPA}, but you have ${studentInfo.cgpa}.`
            });
        }

        const existingApplication = await Application.findOne({
            student: user.id,
            company: req.params.companyId
        });

        if (existingApplication) {
            return res.status(400).json({
                message: "Already applied to this job posting"
            });
        }

        const application = new Application({
            student: user.id,
            company: req.params.companyId,
            organizationId: company.organizationId
        });

        await application.save();

        // Trigger notification for creator or organization officers
        try {
            if (company.visibility === "ORGANIZATION_ONLY") {
                const notification = new Notification({
                    recipientRole: "PLACEMENT_OFFICER",
                    organizationId: company.organizationId,
                    title: "New Application Received",
                    message: `${studentInfo.name} has applied for the position of ${company.role} at ${company.name}.`
                });
                await notification.save();
            } else {
                // If it's a public job, notify the specific recruiter who created it
                const notification = new Notification({
                    recipient: company.createdBy,
                    title: "New Application Received",
                    message: `${studentInfo.name} has applied for your public job post: ${company.role} at ${company.name}.`
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

// Get student's own applications
router.get("/applications/:studentId", requireAuth, async (req, res) => {
    try {
        const user = req.user;
        const targetStudentId = req.params.studentId;

        // Security check
        let authorized = false;
        if (user.role === "SUPER_ADMIN" || user.id === targetStudentId) {
            authorized = true;
        } else if (user.role === "PLACEMENT_OFFICER") {
            const student = await User.findById(targetStudentId);
            authorized = student && student.organizationId?.toString() === user.organizationId;
        }

        if (!authorized) {
            return res.status(403).json({ message: "Access denied. Cannot view these applications." });
        }

        const applications = await Application.find({
            student: targetStudentId
        }).populate("company").sort({ createdAt: -1 });

        res.json(applications);

    } catch (error) {
        res.status(500).json({
            message: "Failed to get applications"
        });
    }
});

// Get ALL applications (admin/officer/recruiter scoped)
router.get("/all-applications/list", requireAuth, requireRole("PLACEMENT_OFFICER", "RECRUITER", "SUPER_ADMIN"), async (req, res) => {
    try {
        const user = req.user;
        let query = {};

        if (user.role === "SUPER_ADMIN") {
            query = {};
        } else if (user.role === "PLACEMENT_OFFICER") {
            query = { organizationId: user.organizationId };
        } else if (user.role === "RECRUITER") {
            // Find job IDs created by this recruiter
            const recruiterJobs = await Company.find({ createdBy: user.id }, "_id");
            const jobIds = recruiterJobs.map(j => j._id);
            query = { company: { $in: jobIds } };
        }

        const applications = await Application.find(query)
            .populate("student", "name email phone branch cgpa skills resume linkedin github")
            .populate("company", "name role package createdBy organizationId")
            .sort({ createdAt: -1 });

        res.json(applications);

    } catch (error) {
        res.status(500).json({
            message: "Failed to get applications"
        });
    }
});

// Update application status (admin/officer/recruiter scoped)
router.put("/applications/:applicationId/status", requireAuth, requireRole("PLACEMENT_OFFICER", "RECRUITER", "SUPER_ADMIN"), async (req, res) => {
    try {
        const user = req.user;
        const { status } = req.body;

        if (!["Applied", "Shortlisted", "Selected", "Rejected"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        const application = await Application.findById(req.params.applicationId)
            .populate("company")
            .populate("student", "name email");

        if (!application) {
            return res.status(404).json({
                message: "Application not found"
            });
        }

        // Verify status update permission
        let authorized = false;
        if (user.role === "SUPER_ADMIN") {
            authorized = true;
        } else if (user.role === "PLACEMENT_OFFICER") {
            authorized = application.organizationId && application.organizationId.toString() === user.organizationId;
        } else if (user.role === "RECRUITER") {
            authorized = application.company && application.company.createdBy?.toString() === user.id;
        }

        if (!authorized) {
            return res.status(403).json({ message: "Access denied. You cannot modify this application's status." });
        }

        application.status = status;
        await application.save();

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