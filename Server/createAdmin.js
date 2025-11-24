const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
require("dotenv").config();

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/mentalhealth";

async function createAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    // Check if admin already exists
    const adminExists = await User.findOne({ email: "admin@gmail.com" });

    if (adminExists) {
      console.log("\n⚠️  Admin user already exists in database");
      console.log("   Email: admin@gmail.com");
      console.log("   Password: 555555");
      console.log("\n   You can login now!");
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("555555", 10);

    const adminUser = new User({
      firstName: "Admin",
      lastName: "User",
      name: "Admin User",
      email: "admin@gmail.com",
      password: hashedPassword,
      role: "admin",
      registrationStatus: "active",
      isActive: true,
    });

    await adminUser.save();

    console.log("\n✅ Admin user created successfully!");
    console.log("\n📧 LOGIN CREDENTIALS:");
    console.log("   Email:    admin@gmail.com");
    console.log("   Password: 555555");
    console.log("\n🌐 You can now login at: http://localhost:5000/login.html");
    console.log(
      "   After login, go to: http://localhost:5000/adminDashboard.html"
    );

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);

    // Try local MongoDB if Atlas fails
    if (!error.message.includes("localhost")) {
      console.log("\n⚠️  Trying local MongoDB...");
      try {
        await mongoose.connect("mongodb://localhost:27017/mentalhealth");
        console.log("✅ MongoDB connected (local)");

        const adminExists = await User.findOne({ email: "admin@gmail.com" });

        if (adminExists) {
          console.log("\n⚠️  Admin user already exists in database");
          console.log("   Email: admin@gmail.com");
          console.log("   Password: 555555");
          await mongoose.disconnect();
          process.exit(0);
        }

        const hashedPassword = await bcrypt.hash("555555", 10);

        const adminUser = new User({
          firstName: "Admin",
          lastName: "User",
          name: "Admin User",
          email: "admin@gmail.com",
          password: hashedPassword,
          role: "admin",
          registrationStatus: "active",
          isActive: true,
        });

        await adminUser.save();

        console.log("\n✅ Admin user created successfully!");
        console.log("\n📧 LOGIN CREDENTIALS:");
        console.log("   Email:    admin@gmail.com");
        console.log("   Password: 555555");
        console.log(
          "\n🌐 You can now login at: http://localhost:5000/login.html"
        );
        console.log(
          "   After login, go to: http://localhost:5000/adminDashboard.html"
        );

        await mongoose.disconnect();
        process.exit(0);
      } catch (localError) {
        console.error("❌ Local MongoDB error:", localError.message);
        console.log("\n⚠️  Please make sure MongoDB is running!");
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
}

createAdmin();
