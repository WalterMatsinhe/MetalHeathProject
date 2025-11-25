const express = require("express");
const router = express.Router();
const Report = require("../models/Report");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

// @route   POST /api/reports
// @desc    Create a new report
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const { reportedUserId, reason, reportType } = req.body;
    const reportingUserId = req.user.id;

    // Validate required fields
    if (!reportedUserId || !reason) {
      return res
        .status(400)
        .json({ message: "Reported user ID and reason are required" });
    }

    // Prevent self-reporting
    if (reportedUserId === reportingUserId) {
      return res.status(400).json({ message: "You cannot report yourself" });
    }

    // Verify reported user exists
    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({ message: "Reported user not found" });
    }

    // Create report
    const report = new Report({
      reportedUserId,
      reportingUserId,
      reason,
      reportType: reportType || "behavior",
      status: "pending",
    });

    await report.save();

    console.log(
      `✅ Report created - User ${reportingUserId} reported ${reportedUserId}`
    );
    res.status(201).json({
      message: "Report submitted successfully",
      reportId: report._id,
    });
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({
      message: "Error submitting report",
      error: error.message,
    });
  }
});

// @route   GET /api/reports
// @desc    Get all reports (admin only)
// @access  Private/Admin
router.get("/", auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || "all";

    // Build query
    let query = {};
    if (status !== "all") {
      query.status = status;
    }

    // Get reports with populated user data
    const reports = await Report.find(query)
      .populate("reportedUserId", "firstName lastName email role")
      .populate("reportingUserId", "firstName lastName email")
      .populate("resolvedBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    // Get total count
    const total = await Report.countDocuments(query);

    console.log(`✅ Fetched ${reports.length} reports for admin`);

    res.json({
      reports,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalReports: total,
        hasMore: skip + reports.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({
      message: "Error fetching reports",
      error: error.message,
    });
  }
});

// @route   GET /api/reports/:reportId
// @desc    Get a specific report
// @access  Private/Admin
router.get("/:reportId", auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    const report = await Report.findById(req.params.reportId)
      .populate(
        "reportedUserId",
        "firstName lastName email role profilePicture"
      )
      .populate("reportingUserId", "firstName lastName email")
      .populate("resolvedBy", "firstName lastName");

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.json(report);
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({
      message: "Error fetching report",
      error: error.message,
    });
  }
});

// @route   PATCH /api/reports/:reportId
// @desc    Update a report status and admin notes
// @access  Private/Admin
router.patch("/:reportId", auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    const { status, adminNotes } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const report = await Report.findById(req.params.reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Update report
    report.status = status;
    if (adminNotes) {
      report.adminNotes = adminNotes;
    }
    if (status !== "pending" && !report.resolvedAt) {
      report.resolvedAt = new Date();
      report.resolvedBy = req.user.id;
    }

    await report.save();

    console.log(`✅ Report ${report._id} updated to status: ${status}`);

    res.json({
      message: "Report updated successfully",
      report,
    });
  } catch (error) {
    console.error("Error updating report:", error);
    res.status(500).json({
      message: "Error updating report",
      error: error.message,
    });
  }
});

module.exports = router;
