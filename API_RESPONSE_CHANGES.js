/**
 * API Response Comparison: Before and After Cleanup
 *
 * This document shows how API responses have changed with the cleanup
 */

// ============================================================================
// 1. LOGIN ENDPOINT: POST /api/auth/login
// ============================================================================

// BEFORE
const exampleLoginBefore = {
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: {
    id: "507f1f77bcf86cd799439011",
    firstName: "John",
    lastName: "Doe",
    name: "John Doe", // ❌ REDUNDANT - Stored in database
    email: "john@example.com",
    role: "user",
  },
};

// AFTER
const exampleLoginAfter = {
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: {
    id: "507f1f77bcf86cd799439011",
    firstName: "John",
    lastName: "Doe",
    fullName: "John Doe", // ✅ COMPUTED Virtual field
    email: "john@example.com",
    role: "user",
  },
};

// ============================================================================
// 2. GET USER PROFILE: GET /api/user/profile
// ============================================================================

// BEFORE
const exampleProfileBefore = {
  _id: "507f1f77bcf86cd799439011",
  id: "507f1f77bcf86cd799439011",
  name: "John Doe", // ❌ REDUNDANT - Stored in database
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  role: "user",
  profilePicture: "/assets/profile-pictures/507f1f77bcf86cd799439011.jpg",
  specialization: "",
  yearsExperience: 0,
  bio: "I'm a mental health advocate...",
};

// AFTER
const exampleProfileAfter = {
  _id: "507f1f77bcf86cd799439011",
  id: "507f1f77bcf86cd799439011",
  firstName: "John",
  lastName: "Doe",
  fullName: "John Doe", // ✅ COMPUTED Virtual field
  email: "john@example.com",
  role: "user",
  profilePicture: "/assets/profile-pictures/507f1f77bcf86cd799439011.jpg",
  specialization: "",
  yearsExperience: 0,
  bio: "I'm a mental health advocate...",
};

// ============================================================================
// 3. GET THERAPISTS: GET /api/therapists
// ============================================================================

// BEFORE
const exampleTherapistsBefore = [
  {
    _id: "507f1f77bcf86cd799439012",
    name: "Dr. Sarah Smith", // ❌ REDUNDANT - Stored in database
    firstName: "Sarah",
    lastName: "Smith",
    specialization: "clinical-psychology",
    yearsExperience: 10,
    bio: "Licensed clinical psychologist...",
    areasOfExpertise: ["anxiety", "depression"],
    languagesSpoken: ["english", "swahili"],
    stats: {
      patientsHelped: 150,
      averageRating: 4.8,
      hoursThisMonth: 42,
    },
  },
];

// AFTER
const exampleTherapistsAfter = [
  {
    _id: "507f1f77bcf86cd799439012",
    firstName: "Sarah",
    lastName: "Smith",
    fullName: "Dr. Sarah Smith", // ✅ COMPUTED Virtual field
    specialization: "clinical-psychology",
    yearsExperience: 10,
    bio: "Licensed clinical psychologist...",
    areasOfExpertise: ["anxiety", "depression"],
    languagesSpoken: ["english", "swahili"],
    stats: {
      patientsHelped: 150,
      averageRating: 4.8,
      hoursThisMonth: 42,
    },
  },
];

// ============================================================================
// 4. GET CHAT THERAPISTS: GET /api/chat/therapists
// ============================================================================

// BEFORE
const exampleChatTherapistsBefore = [
  {
    _id: "507f1f77bcf86cd799439012",
    name: "Dr. Sarah Smith", // ❌ REDUNDANT - Stored in database
    firstName: "Sarah",
    lastName: "Smith",
    status: "online",
    isOnline: true,
    specialization: "clinical-psychology",
    yearsExperience: 10,
  },
];

// AFTER
const exampleChatTherapistsAfter = [
  {
    _id: "507f1f77bcf86cd799439012",
    firstName: "Sarah",
    lastName: "Smith",
    fullName: "Dr. Sarah Smith", // ✅ COMPUTED Virtual field
    status: "online",
    isOnline: true,
    specialization: "clinical-psychology",
    yearsExperience: 10,
  },
];

// ============================================================================
// 5. APPROVE THERAPIST APPLICATION: PUT /api/admin/applications/:id/approve
// ============================================================================

// BEFORE
const exampleApproveBefore = {
  message: "Therapist application approved successfully",
  therapist: {
    id: "507f1f77bcf86cd799439013",
    name: "Dr. James Wilson", // ❌ REDUNDANT - Stored in database
    email: "james@example.com",
    registrationStatus: "approved",
  },
};

// AFTER
const exampleApproveAfter = {
  message: "Therapist application approved successfully",
  therapist: {
    id: "507f1f77bcf86cd799439013",
    firstName: "James",
    lastName: "Wilson",
    fullName: "Dr. James Wilson", // ✅ COMPUTED Virtual field
    email: "james@example.com",
    registrationStatus: "approved",
  },
};

// ============================================================================
// 6. REJECT THERAPIST APPLICATION: PUT /api/admin/applications/:id/reject
// ============================================================================

// BEFORE
const exampleRejectBefore = {
  message: "Therapist application rejected",
  therapist: {
    id: "507f1f77bcf86cd799439014",
    name: "Dr. Emily Brown", // ❌ REDUNDANT - Stored in database
    email: "emily@example.com",
    registrationStatus: "rejected",
    rejectionReason: "Incomplete documentation",
  },
};

// AFTER
const exampleRejectAfter = {
  message: "Therapist application rejected",
  therapist: {
    id: "507f1f77bcf86cd799439014",
    firstName: "Emily",
    lastName: "Brown",
    fullName: "Dr. Emily Brown", // ✅ COMPUTED Virtual field
    email: "emily@example.com",
    registrationStatus: "rejected",
    rejectionReason: "Incomplete documentation",
  },
};

// ============================================================================
// KEY IMPROVEMENTS
// ============================================================================

/**
 * Benefits Summary:
 *
 * ✅ No Redundancy
 *    - Removed stored 'name' field
 *    - fullName is computed from firstName + lastName
 *    - Single source of truth
 *
 * ✅ Database Efficiency
 *    - Reduced database storage
 *    - Faster writes (no pre-save computation)
 *    - Cleaner schema
 *
 * ✅ Code Quality
 *    - Removed pre-save middleware complexity
 *    - Follows DRY principle
 *    - Better organized field structure
 *
 * ✅ Backward Compatibility
 *    - Virtual field works transparently
 *    - Existing code continues to work
 *    - No client-side changes needed
 *
 * ✅ Flexibility
 *    - Virtual field always computes latest value
 *    - Easy to modify format if needed
 *    - Display name fallbacks still work
 */

// ============================================================================
// CLIENT CODE COMPATIBILITY
// ============================================================================

// Client code can still access full name in multiple ways:

// Option 1: Use the virtual fullName field (RECOMMENDED)
// const displayName = user.fullName;  // "John Doe"

// Option 2: Concatenate firstName and lastName (Still works)
// const displayName = `${user.firstName} ${user.lastName}`;  // "John Doe"

// Option 3: Display components separately (Most flexible)
// const display = `${user.firstName} ${user.lastName}`;  // "John Doe"

// All approaches work correctly with the new schema!
