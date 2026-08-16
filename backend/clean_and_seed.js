const mongoose = require("mongoose");
const dns = require("dns");
const bcrypt = require("bcryptjs");
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

async function cleanAndSeed() {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected successfully!");

        // 1. Delete all existing collections data
        console.log("Deleting old documents from all collections...");
        await Organization.deleteMany({});
        await User.deleteMany({});
        await Company.deleteMany({});
        await Application.deleteMany({});
        await Notification.deleteMany({});
        console.log("All old database documents deleted successfully.");

        // 2. Seed Super Admin
        const adminName = "Krishna";
        const adminEmail = "krishna@gmail.com";
        const adminPassword = "krishna123";

        console.log(`Seeding Super Admin user (${adminName} / ${adminEmail})...`);
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        const superAdmin = new User({
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: "SUPER_ADMIN",
            accountType: "INDIVIDUAL",
            organizationId: null,
            isActive: true
        });

        await superAdmin.save();

        console.log("==================================================");
        console.log("DATABASE CLEANED & SUPER ADMIN SEEDED SUCCESSFULLY!");
        console.log(`Name: ${adminName}`);
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        console.log("==================================================");

    } catch (err) {
        console.error("Database cleanup and seeding failed:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from database.");
    }
}

cleanAndSeed();
