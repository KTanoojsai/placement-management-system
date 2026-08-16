const mongoose = require("mongoose");
const dns = require("dns");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// DNS configuration to prevent resolution errors on local machines
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const Organization = require("./models/Organization");
const User = require("./models/User");
const Company = require("./models/Company");
const Application = require("./models/Application");
const Notification = require("./models/Notification");
const { JWT_SECRET } = require("./middleware/auth");

const MONGO_URI = process.env.MONGO_URI;

// Express setup to test routes locally
const express = require("express");
const app = require("./server");
const request = require("supertest"); // we can use supertest to hit the live routes on the running serverless app

async function runTests() {
    try {
        console.log("=========================================");
        console.log("STARTING SECURITY INTEGRATION TESTS");
        console.log("=========================================");

        // Clear previous test users if any
        await User.deleteMany({ email: /@test-security\.com$/ });
        await Organization.deleteMany({ organizationCode: /^TEST-ORG-/ });
        await Company.deleteMany({ name: /Test Company/ });
        await Application.deleteMany({}); // Delete all applications for test clean run

        // 1. Create Test Organizations
        console.log("\n[1] Seeding Test Organizations...");
        const orgA = new Organization({ name: "College A", organizationCode: "TEST-ORG-A", status: "ACTIVE" });
        const orgB = new Organization({ name: "College B", organizationCode: "TEST-ORG-B", status: "ACTIVE" });
        const orgInactive = new Organization({ name: "College Inactive", organizationCode: "TEST-ORG-INACTIVE", status: "INACTIVE" });
        await orgA.save();
        await orgB.save();
        await orgInactive.save();
        console.log("College A created ID:", orgA._id);
        console.log("College B created ID:", orgB._id);
        console.log("Inactive College created ID:", orgInactive._id);

        // 2. Seeding Users
        console.log("\n[2] Seeding Test Users...");
        const hash = await bcrypt.hash("krishna143", 10);

        await User.deleteMany({
            email: { $in: ["superadmin@test-security.com", "krishna@gmail.com"] }
        });

        // Super Admin (Seed locally if not exists, or create a test one)
        const superAdmin = new User({
            name: "Krishna",
            email: "krishna@gmail.com",
            password: hash,
            role: "SUPER_ADMIN",
            accountType: "INDIVIDUAL",
            organizationId: null
        });
        await superAdmin.save();

        // Officer A (College A)
        const officerA = new User({
            name: "Officer A",
            email: "officera@test-security.com",
            password: hash,
            role: "PLACEMENT_OFFICER",
            accountType: "ORGANIZATION",
            organizationId: orgA._id
        });
        await officerA.save();

        // Officer B (College B)
        const officerB = new User({
            name: "Officer B",
            email: "officerb@test-security.com",
            password: hash,
            role: "PLACEMENT_OFFICER",
            accountType: "ORGANIZATION",
            organizationId: orgB._id
        });
        await officerB.save();

        // Student A1 (College A)
        const studentA1 = new User({
            name: "Student A1",
            email: "studenta1@test-security.com",
            password: hash,
            role: "STUDENT",
            accountType: "ORGANIZATION",
            organizationId: orgA._id,
            cgpa: 8.5,
            branch: "CSE"
        });
        await studentA1.save();

        // Student B1 (College B)
        const studentB1 = new User({
            name: "Student B1",
            email: "studentb1@test-security.com",
            password: hash,
            role: "STUDENT",
            accountType: "ORGANIZATION",
            organizationId: orgB._id,
            cgpa: 7.5,
            branch: "ECE"
        });
        await studentB1.save();

        // Recruiter (Public)
        const recruiter = new User({
            name: "Public Recruiter",
            email: "recruiter@test-security.com",
            password: hash,
            role: "RECRUITER",
            accountType: "INDIVIDUAL",
            organizationId: null
        });
        await recruiter.save();

        // Individual Student
        const studentInd = new User({
            name: "Individual Student",
            email: "studentind@test-security.com",
            password: hash,
            role: "STUDENT",
            accountType: "INDIVIDUAL",
            organizationId: null,
            cgpa: 9.0
        });
        await studentInd.save();

        console.log("Users seeded successfully.");

        // Generate JWT tokens for requests
        const tokenSuperAdmin = jwt.sign({ id: superAdmin._id, role: superAdmin.role }, JWT_SECRET);
        const tokenOfficerA = jwt.sign({ id: officerA._id, role: officerA.role, organizationId: orgA._id, accountType: "ORGANIZATION" }, JWT_SECRET);
        const tokenOfficerB = jwt.sign({ id: officerB._id, role: officerB.role, organizationId: orgB._id, accountType: "ORGANIZATION" }, JWT_SECRET);
        const tokenStudentA1 = jwt.sign({ id: studentA1._id, role: studentA1.role, organizationId: orgA._id, accountType: "ORGANIZATION" }, JWT_SECRET);
        const tokenStudentB1 = jwt.sign({ id: studentB1._id, role: studentB1.role, organizationId: orgB._id, accountType: "ORGANIZATION" }, JWT_SECRET);
        const tokenRecruiter = jwt.sign({ id: recruiter._id, role: recruiter.role, accountType: "INDIVIDUAL" }, JWT_SECRET);
        const tokenStudentInd = jwt.sign({ id: studentInd._id, role: studentInd.role, accountType: "INDIVIDUAL" }, JWT_SECRET);

        console.log("\n[3] Running Test Cases...");

        // --- TEST CASE 1: Inactive Organization Code Registration ---
        console.log("\nTest Case 1: Register with Inactive Organization Code");
        const resRegInactive = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Temp Student",
                email: "temp@test-security.com",
                password: "password123",
                role: "student",
                accountType: "ORGANIZATION",
                organizationCode: "TEST-ORG-INACTIVE"
            });
        console.log(`- Response Code: ${resRegInactive.status} (Expected: 400)`);
        console.log(`- Response Message: ${resRegInactive.body.message}`);

        // --- TEST CASE 2: Organization Isolation (Profile API) ---
        console.log("\nTest Case 2: Officer A accessing Student A1 profile vs Student B1 profile");
        const resProfileA1 = await request(app)
            .get(`/api/auth/profile/${studentA1._id}`)
            .set("Authorization", `Bearer ${tokenOfficerA}`);
        console.log(`- Officer A -> Student A1 profile: Status ${resProfileA1.status} (Expected: 200)`);

        const resProfileB1 = await request(app)
            .get(`/api/auth/profile/${studentB1._id}`)
            .set("Authorization", `Bearer ${tokenOfficerA}`);
        console.log(`- Officer A -> Student B1 profile: Status ${resProfileB1.status} (Expected: 403)`);

        // --- TEST CASE 3: Job Visibility Scoping ---
        console.log("\nTest Case 3: Job visibility controls");
        
        // Let Officer A create a private job for College A
        const resCreateJobPrivate = await request(app)
            .post("/api/companies")
            .set("Authorization", `Bearer ${tokenOfficerA}`)
            .send({
                name: "Test Company Private A",
                role: "Software Engineer",
                eligibility: "BTech",
                location: "Hyderabad",
                package: "10 LPA",
                visibility: "ORGANIZATION_ONLY"
            });
        const privateJobId = resCreateJobPrivate.body.company._id;
        console.log(`- Officer A created private job: Status ${resCreateJobPrivate.status} (Expected: 201). Job ID: ${privateJobId}`);

        // Let Recruiter create a public job
        const resCreateJobPublic = await request(app)
            .post("/api/companies")
            .set("Authorization", `Bearer ${tokenRecruiter}`)
            .send({
                name: "Test Company Public Recruiter",
                role: "Product Manager",
                eligibility: "Any Graduate",
                location: "Bangalore",
                package: "12 LPA",
                visibility: "PUBLIC"
            });
        const publicJobId = resCreateJobPublic.body.company._id;
        console.log(`- Recruiter created public job: Status ${resCreateJobPublic.status} (Expected: 201). Job ID: ${publicJobId}`);

        // Student A1 (College A) list jobs
        const resListA1 = await request(app)
            .get("/api/companies")
            .set("Authorization", `Bearer ${tokenStudentA1}`);
        const listA1Ids = resListA1.body.map(j => j._id);
        console.log(`- Student A1 lists jobs: Sees private job A: ${listA1Ids.includes(privateJobId)} (Expected: true)`);
        console.log(`- Student A1 lists jobs: Sees public job: ${listA1Ids.includes(publicJobId)} (Expected: true)`);

        // Student B1 (College B) list jobs
        const resListB1 = await request(app)
            .get("/api/companies")
            .set("Authorization", `Bearer ${tokenStudentB1}`);
        const listB1Ids = resListB1.body.map(j => j._id);
        console.log(`- Student B1 lists jobs: Sees private job A: ${listB1Ids.includes(privateJobId)} (Expected: false)`);
        console.log(`- Student B1 lists jobs: Sees public job: ${listB1Ids.includes(publicJobId)} (Expected: true)`);

        // Individual Student list jobs
        const resListInd = await request(app)
            .get("/api/companies")
            .set("Authorization", `Bearer ${tokenStudentInd}`);
        const listIndIds = resListInd.body.map(j => j._id);
        console.log(`- Individual Student lists jobs: Sees private job A: ${listIndIds.includes(privateJobId)} (Expected: false)`);
        console.log(`- Individual Student lists jobs: Sees public job: ${listIndIds.includes(publicJobId)} (Expected: true)`);

        // --- TEST CASE 4: Application Security Scoping ---
        console.log("\nTest Case 4: Applying to jobs eligibility check");

        // Student B1 (College B) tries to apply to College A's private job
        const resApplyB1ToPrivateA = await request(app)
            .post(`/api/companies/${privateJobId}/apply`)
            .set("Authorization", `Bearer ${tokenStudentB1}`)
            .send({ studentId: studentB1._id });
        console.log(`- Student B1 applying to private job A: Status ${resApplyB1ToPrivateA.status} (Expected: 403)`);

        // Student A1 (College A) tries to apply to College A's private job
        const resApplyA1ToPrivateA = await request(app)
            .post(`/api/companies/${privateJobId}/apply`)
            .set("Authorization", `Bearer ${tokenStudentA1}`)
            .send({ studentId: studentA1._id });
        console.log(`- Student A1 applying to private job A: Status ${resApplyA1ToPrivateA.status} (Expected: 201)`);

        // Individual Student tries to apply to Recruiter's public job
        const resApplyIndToPublic = await request(app)
            .post(`/api/companies/${publicJobId}/apply`)
            .set("Authorization", `Bearer ${tokenStudentInd}`)
            .send({ studentId: studentInd._id });
        console.log(`- Individual Student applying to public job: Status ${resApplyIndToPublic.status} (Expected: 201)`);

        // --- TEST CASE 5: IDOR / Parameter Tampering ---
        console.log("\nTest Case 5: Parameter Tampering");

        // Student A1 tries to submit application on behalf of Student B1
        const resTamperApply = await request(app)
            .post(`/api/companies/${publicJobId}/apply`)
            .set("Authorization", `Bearer ${tokenStudentA1}`)
            .send({ studentId: studentB1._id });
        console.log(`- Student A1 applying as Student B1: Status ${resTamperApply.status} (Expected: 403)`);

        // Officer A tries to view Student B1's applications list
        const resTamperAppsList = await request(app)
            .get(`/api/companies/applications/${studentB1._id}`)
            .set("Authorization", `Bearer ${tokenOfficerA}`);
        console.log(`- Officer A fetching Student B1's applications: Status ${resTamperAppsList.status} (Expected: 403)`);

        // Recruiter tries to list all applications on the platform
        const resRecruiterAppsList = await request(app)
            .get("/api/companies/all-applications/list")
            .set("Authorization", `Bearer ${tokenRecruiter}`);
        console.log(`- Recruiter fetches all-applications/list: Status ${resRecruiterAppsList.status} (Expected: 200). Received count: ${resRecruiterAppsList.body.length} (Expected to contain only applications to their own job. Candidate is Individual Student)`);

        // --- TEST CASE 6: Super Admin Security ---
        console.log("\nTest Case 6: Super Admin APIs restriction");

        // Officer A tries to call Admin stats API
        const resOfficerStats = await request(app)
            .get("/api/admin/stats")
            .set("Authorization", `Bearer ${tokenOfficerA}`);
        console.log(`- Officer A calling /api/admin/stats: Status ${resOfficerStats.status} (Expected: 403)`);

        // Super Admin calling stats API
        const resSuperStats = await request(app)
            .get("/api/admin/stats")
            .set("Authorization", `Bearer ${tokenSuperAdmin}`);
        console.log(`- Super Admin calling /api/admin/stats: Status ${resSuperStats.status} (Expected: 200)`);

        console.log("\n=========================================");
        console.log("INTEGRATION TESTS FINISHED");
        console.log("=========================================");

    } catch (err) {
        console.error("Test execution failed:", err);
    } finally {
        // Cleanup test data
        await User.deleteMany({ email: /@test-security\.com$/ });
        await Organization.deleteMany({ organizationCode: /^TEST-ORG-/ });
        await Company.deleteMany({ name: /Test Company/ });
        await Application.deleteMany({});
        await mongoose.disconnect();
        console.log("Database disconnected. Tests complete.");
        process.exit(0);
    }
}

// Connect mongoose first
mongoose.connect(MONGO_URI).then(() => {
    runTests();
});
