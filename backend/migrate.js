const mongoose = require("mongoose");
const dns = require("dns");
require("dotenv").config();

// DNS configuration to prevent resolution errors on local machines
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const Organization = require("./models/Organization");
const User = require("./models/User");
const Company = require("./models/Company");
const Application = require("./models/Application");
const Notification = require("./models/Notification");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("Error: MONGO_URI is not defined in backend/.env");
    process.exit(1);
}

async function run() {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected successfully!");

        // 1. Create or Find Default Organization
        let defaultOrg = await Organization.findOne({ organizationCode: "DEFAULT-ORG-2026" });
        if (!defaultOrg) {
            console.log("Creating default organization...");
            defaultOrg = new Organization({
                name: "Default Organization",
                organizationCode: "DEFAULT-ORG-2026",
                status: "ACTIVE"
            });
            await defaultOrg.save();
            console.log("Default organization created:", defaultOrg._id);
        } else {
            console.log("Default organization already exists:", defaultOrg._id);
        }

        // 2. Migrate User Roles
        console.log("Migrating users...");
        const usersToMigrate = await User.find({
            role: { $in: ["student", "admin"] }
        });
        console.log(`Found ${usersToMigrate.length} users to migrate.`);
        for (let user of usersToMigrate) {
            const oldRole = user.role;
            let newRole = "";
            if (oldRole === "admin") {
                newRole = "PLACEMENT_OFFICER";
            } else if (oldRole === "student") {
                newRole = "STUDENT";
            }

            user.role = newRole;
            user.accountType = "ORGANIZATION";
            user.organizationId = defaultOrg._id;
            user.isActive = true;
            await user.save();
            console.log(`- Migrated User ${user.email}: ${oldRole} -> ${newRole}`);
        }

        // Find the first placement officer to assign as creator for existing companies
        let firstOfficer = await User.findOne({ role: "PLACEMENT_OFFICER" });
        if (!firstOfficer) {
            console.log("No placement officer found, creating a default one for legacy job ownership...");
            const bcrypt = require("bcryptjs");
            const hashedPassword = await bcrypt.hash("legacyadmin2026", 10);
            firstOfficer = new User({
                name: "Legacy Placement Officer",
                email: "legacyofficer@default.com",
                password: hashedPassword,
                role: "PLACEMENT_OFFICER",
                accountType: "ORGANIZATION",
                organizationId: defaultOrg._id,
                isActive: true
            });
            await firstOfficer.save();
            console.log("Created legacy placement officer:", firstOfficer.email);
        }

        // 3. Migrate Companies (Jobs)
        console.log("Migrating companies/jobs...");
        const companiesToMigrate = await Company.find({
            $or: [
                { organizationId: { $exists: false } },
                { organizationId: null }
            ]
        });
        console.log(`Found ${companiesToMigrate.length} companies to migrate.`);
        for (let comp of companiesToMigrate) {
            comp.visibility = "ORGANIZATION_ONLY";
            comp.organizationId = defaultOrg._id;
            comp.createdBy = firstOfficer._id;
            comp.status = "ACTIVE";
            await comp.save();
            console.log(`- Migrated Company ${comp.name} for Job role: ${comp.role}`);
        }

        // 4. Migrate Applications
        console.log("Migrating applications...");
        const applicationsToMigrate = await Application.find({
            $or: [
                { organizationId: { $exists: false } },
                { organizationId: null }
            ]
        });
        console.log(`Found ${applicationsToMigrate.length} applications to migrate.`);
        for (let app of applicationsToMigrate) {
            app.organizationId = defaultOrg._id;
            await app.save();
            console.log(`- Migrated Application id: ${app._id}`);
        }

        // 5. Migrate Notifications
        console.log("Migrating notifications...");
        const notificationsToMigrate = await Notification.find({
            $or: [
                { organizationId: { $exists: false } },
                { organizationId: null }
            ]
        });
        console.log(`Found ${notificationsToMigrate.length} notifications to migrate.`);
        for (let notif of notificationsToMigrate) {
            if (notif.recipientRole === "student") {
                notif.recipientRole = "STUDENT";
            } else if (notif.recipientRole === "admin") {
                notif.recipientRole = "PLACEMENT_OFFICER";
            }
            notif.organizationId = defaultOrg._id;
            notif.title = notif.title || "Notification"; // Set default title for legacy entries
            await notif.save();
            console.log(`- Migrated Notification: ${notif.title || notif.message}`);
        }

        console.log("Database migration completed successfully!");
    } catch (err) {
        console.error("Migration Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from database.");
    }
}

run();
