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
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Company", companySchema);