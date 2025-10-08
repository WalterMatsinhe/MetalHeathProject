# Profile Management with MongoDB Integration

## Overview

The Mental Health Platform includes comprehensive profile management for both users and therapists with complete database integration, image upload capabilities, and extensive form fields. All profile data is stored in MongoDB and managed through REST API endpoints.

## Database Integration Features

### ✅ Complete API Backend

- **REST API endpoints** for profile management
- **MongoDB storage** with Mongoose schemas
- **File upload handling** with Multer
- **Data validation** and error handling
- **Authentication-protected** routes

### ✅ API Endpoints

```
GET    /api/profile/           - Get user profile
PUT    /api/profile/           - Update user profile
POST   /api/profile/picture    - Upload profile picture
PUT    /api/profile/stats      - Update user statistics
DELETE /api/profile/picture    - Delete profile picture
```

## Features Added

### User Profile Section

- **Profile Image Upload**: Users can upload and change their profile pictures (stored on server)
- **Personal Information**: First name, last name, email, phone, date of birth, gender, location
- **Biography**: About me section for users to describe their mental health journey
- **Mental Health Information**:
  - Emergency contact details
  - Preferred language (English, Swahili, Kikuyu, Luo, Other)
  - Primary mental health concerns (checkboxes for anxiety, depression, stress, etc.)
  - Mental health goals (text area)
- **Privacy Settings**: Options for sharing progress and receiving notifications
- **Statistics Dashboard**: Shows user journey metrics (days active, sessions completed, etc.)

### Therapist Profile Section

- **Professional Profile Image**: Therapists can upload professional photos (stored on server)
- **Professional Information**: Name, email, phone, license number, specialization
- **Credentials**: Education, certifications, years of experience, institution
- **Professional Details**:
  - Languages spoken
  - Areas of expertise (anxiety disorders, depression, trauma, etc.)
  - Working hours and days
- **Professional Statistics**: Patients helped, hours worked, ratings, etc.

## Technical Implementation

### File Structure

```
client/
├── userDashboard.html (updated with new profile section)
├── therapistDashboard.html (updated with new therapist profile section)
├── style.css (added comprehensive profile styling)
├── script.js (added profile management functionality)
└── ...

Server/
├── models/User.js (comprehensive user schema with all profile fields)
├── routes/profile.js (profile API endpoints)
└── ...

assets/
└── profile-pictures/
    ├── default-avatar.svg (default user avatar)
    └── default-therapist-avatar.svg (default therapist avatar)
```

### Key Features

#### Database Integration

- **MongoDB storage** with Mongoose schemas
- **REST API endpoints** for all operations
- **File upload handling** with Multer
- **Authentication-protected** routes
- **Data validation** and error handling

#### Image Upload

- File type validation (images only)
- File size limit (5MB maximum)
- Server-side file storage in `/assets/profile-pictures/`
- Automatic cleanup of old images
- Hover overlay with upload button

#### Form Handling

- Real-time form validation
- Database persistence via APIs
- Comprehensive checkbox groups
- Responsive form layout
- Reset functionality with data reload

#### Notifications

- Success/error/info notifications
- Auto-dismiss after 5 seconds
- Slide-in animation
- Mobile-responsive positioning

#### Responsive Design

- Mobile-first approach
- Grid layouts that adapt to screen size
- Touch-friendly form controls
- Optimized for tablets and phones

## Usage

### For Users

1. Navigate to the Profile section in the sidebar
2. Click on the profile image to upload a new photo
3. Fill out personal information and mental health details
4. Set privacy preferences
5. Click "Save Changes" to save to MongoDB database

### For Therapists

1. Access the Therapist Profile section
2. Upload professional photo
3. Complete credential information
4. Set availability and specializations
5. Save professional profile to MongoDB database

## Database Setup

1. **MongoDB Connection**: Ensure MongoDB is running locally or use MongoDB Atlas
2. **Environment Variables**: Set up `.env` file with `MONGO_URI`
3. **Start Server**: Run `npm run dev` in the Server directory
4. **Register Users**: Use the registration form to create new accounts
5. **All profile data** automatically persists in the database

## Enhanced User Schema

The MongoDB User model includes comprehensive fields:

- **Authentication**: name, email, password, role
- **Profile Information**: firstName, lastName, phone, dateOfBirth, gender, location, bio, profilePicture
- **Mental Health Data**: emergencyContact, preferredLanguage, mentalHealthConcerns[], mentalHealthGoals
- **Privacy Settings**: shareProgress, emailNotifications, smsReminders
- **Professional Fields** (for therapists): licenseNumber, specialization, yearsExperience, institution, education, certifications, languagesSpoken[], areasOfExpertise[], workingHours, workingDays[]
- **Statistics**: daysActive, sessionsCompleted, moodEntries, goalsAchieved, patientsHelped, hoursThisMonth, averageRating, yearsOnPlatform

## Security Features

- **JWT Authentication**: All profile endpoints require valid authentication
- **File Upload Validation**: Image type and size restrictions
- **Input Sanitization**: Protection against injection attacks
- **Error Handling**: Proper HTTP status codes and user-friendly messages

## Future Enhancements

- Image cropping functionality
- Multiple image uploads
- Profile verification for therapists
- Integration with appointment booking
- Professional certification uploads
- Patient feedback integration
- Advanced analytics and reporting
