const mongoose = require("mongoose");
const dns = require("dns");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// DNS configuration to prevent resolution errors on local machines
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const User = require("./models/User");
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("Error: MONGO_URI is not defined in backend/.env");
    process.exit(1);
}

async function seed() {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(MONGO_URI);
        
        const adminEmail = "superadmin@platform.com";
        const adminPassword = "superadmin123";

        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log(`Super Admin already exists with email: ${adminEmail}`);
            // Ensure its role is set to SUPER_ADMIN
            existingAdmin.role = "SUPER_ADMIN";
            await existingAdmin.save();
            console.log("Role verified as SUPER_ADMIN.");
        } else {
            console.log("Seeding initial Super Admin...");
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            const superAdmin = new User({
                name: "System Super Admin",
                email: adminEmail,
                password: hashedPassword,
                role: "SUPER_ADMIN",
                accountType: "INDIVIDUAL",
                organizationId: null,
                isActive: true
            });
            await superAdmin.save();
            console.log("==================================================");
            console.log("SUPER ADMIN SEEDED SUCCESSFUL!");
            console.log(`Email: ${adminEmail}`);
            console.log(`Password: ${adminPassword}`);
            console.log("==================================================");
        }
    } catch (err) {
        console.error("Seeding failed:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from database.");
    }
}

seed();
