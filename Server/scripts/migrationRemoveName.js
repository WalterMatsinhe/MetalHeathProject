/**
 * Database Migration Script: Remove redundant 'name' field
 *
 * This script safely removes the redundant 'name' field from the User collection
 * in MongoDB. The 'name' field was previously computed from firstName and lastName,
 * but is now replaced by a virtual 'fullName' field for better code organization.
 *
 * Usage: node migrationRemoveName.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");

// MongoDB connection options
const mongooseOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 45000,
  retryWrites: true,
  retryReads: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
};

/**
 * Main migration function
 */
async function runMigration() {
  const MONGO_URI =
    process.env.MONGO_URI || "mongodb://localhost:27017/mentalhealth";

  try {
    // Connect to MongoDB
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, mongooseOptions);
    console.log("✅ Connected to MongoDB successfully");

    // Start migration
    console.log("\n🔄 Starting migration: Remove redundant 'name' field...\n");

    // Count documents that have the 'name' field
    const usersWithNameField = await User.countDocuments({
      name: { $exists: true },
    });
    console.log(`📊 Found ${usersWithNameField} users with 'name' field`);

    if (usersWithNameField === 0) {
      console.log(
        "✅ No users with 'name' field found. Migration already complete."
      );
      console.log("\n✨ Migration completed successfully!");
      process.exit(0);
    }

    // Unset the 'name' field from all documents
    console.log("🗑️  Removing 'name' field from all users...");
    const result = await User.updateMany(
      { name: { $exists: true } },
      { $unset: { name: "" } }
    );

    console.log(
      `✅ Successfully removed 'name' field from ${result.modifiedCount} users`
    );

    // Verify migration
    console.log("\n🔍 Verifying migration...");
    const usersStillWithName = await User.countDocuments({
      name: { $exists: true },
    });

    if (usersStillWithName === 0) {
      console.log("✅ Verification passed: No users have 'name' field");
      console.log("\n✨ Migration completed successfully!");
      console.log(
        "\nNote: The virtual 'fullName' field is now available on all users."
      );
      console.log(
        "It automatically computes fullName from firstName and lastName."
      );
    } else {
      console.error(
        `❌ Verification failed: ${usersStillWithName} users still have 'name' field`
      );
      process.exit(1);
    }

    // Show summary
    console.log("\n📝 Migration Summary:");
    console.log("-------------------");
    console.log(`• Removed 'name' field from: ${result.modifiedCount} users`);
    console.log("• Database schema: Cleaner without redundant 'name' field");
    console.log(
      "• Backward compatibility: fullName virtual field provides computed name"
    );
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error("Error stack:", error.stack);
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    console.log("\n🔌 Disconnecting from MongoDB...");
    await mongoose.connection.close();
    console.log("✅ Disconnected from MongoDB");
  }
}

// Run the migration
console.log("================================================");
console.log("Database Migration: Remove Redundant 'name' Field");
console.log("================================================\n");

runMigration();
