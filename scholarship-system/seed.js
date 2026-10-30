// Usage:  npm run seed          -> admin account + sample scholarships
//         npm run seed:demo     -> also adds demo students and applications
const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config({ path: require("path").join(__dirname, ".env") });

const { connectDb } = require("./utils/db");
const { bootstrap, seedDemo } = require("./utils/seed");

(async () => {
    try {
        await connectDb(process.env.MONGO_URI);
        if (process.argv.includes("--demo")) await seedDemo(); else await bootstrap();
        console.log("Seeding finished.");
    } catch (error) {
        console.error("Seeding failed:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
})();
