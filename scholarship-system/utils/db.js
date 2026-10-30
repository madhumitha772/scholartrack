const dns = require("dns");
const mongoose = require("mongoose");

// Connects to MongoDB. Some networks refuse the DNS SRV lookups that MongoDB Atlas (mongodb+srv://)
// needs; when that happens we retry once with public DNS resolvers instead of failing outright.
async function connectDb(uri) {
    if (process.env.USE_PUBLIC_DNS === "true") dns.setServers(["8.8.8.8", "1.1.1.1"]);
    const options = { serverSelectionTimeoutMS: 15000 };
    try {
        await mongoose.connect(uri, options);
    } catch (error) {
        if (!/querySrv|ENOTFOUND|ECONNREFUSED/i.test(String(error.message)) || !uri.startsWith("mongodb+srv://")) throw error;
        console.warn("DNS lookup for MongoDB failed; retrying with public DNS resolvers...");
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
        await mongoose.connect(uri, options);
    }
}

module.exports = { connectDb };
