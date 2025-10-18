# Storage App - Android Client

A simple Android client for the Storage App that provides file upload, authentication, and premium status checking using Supabase.

## Features

- 🔐 **Authentication**: Login and Sign Up using Supabase Auth
- 📁 **File Management**: Upload and delete files from Supabase Storage
- 👑 **Premium Status**: Check if user has premium subscription
- 🎨 **Modern UI**: Material Design 3 with clean interface
- 📱 **Responsive**: Works on all Android devices (API 24+)

## Prerequisites

- Android Studio Narwhal 4 Feature Drop (2025.1.4) or later
- Android SDK API 24 or higher
- Supabase project with Storage and Auth enabled

## Setup Instructions

### 1. Configure Supabase

1. Replace `YOUR_SUPABASE_ANON_KEY_HERE` in `SupabaseClient.kt` with your actual Supabase anon key
2. Ensure your Supabase project has:
   - **Authentication** enabled
   - **Storage** enabled with a bucket named `uploads`
   - **Database table** for user profiles (optional, for premium status)

### 2. Database Schema (Optional - for Premium Status)

If you want to track premium status, create a `user_profiles` table in your Supabase database:

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    premium_expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Create policy for users to update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create policy for users to insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
```

### 3. Build and Run

1. Open the project in Android Studio
2. Sync Gradle files
3. Build and run on your device or emulator

## Project Structure

```
android-app/
├── app/
│   ├── src/main/java/com/ashwinho4/storage/
│   │   ├── SupabaseClient.kt              # Supabase configuration
│   │   ├── MainActivity.kt                # Main entry point
│   │   ├── auth/
│   │   │   ├── AuthRepository.kt          # Authentication logic
│   │   │   └── LoginActivity.kt           # Login/Signup UI
│   │   ├── files/
│   │   │   ├── FileRepository.kt          # File operations
│   │   │   ├── FileListActivity.kt        # File management UI
│   │   │   └── FileAdapter.kt             # RecyclerView adapter
│   │   └── premium/
│   │       └── PremiumRepository.kt       # Premium status logic
│   ├── src/main/res/
│   │   ├── layout/                        # UI layouts
│   │   ├── values/                        # Strings, colors, themes
│   │   └── drawable/                      # Drawable resources
│   └── build.gradle                       # App dependencies
├── build.gradle                           # Project configuration
├── settings.gradle                        # Project settings
└── README.md                              # This file
```

## Key Components

### Authentication
- Uses Supabase Auth with email/password
- Automatic session management
- Secure token handling

### File Management
- Upload files to Supabase Storage
- List uploaded files
- Delete files
- Unique file naming with timestamps

### Premium Status
- Checks user premium status from database
- Visual indicator in UI
- Extensible for future premium features

## Dependencies

- **Supabase**: Authentication, Storage, and Database
- **Material Design 3**: Modern UI components
- **Kotlin Coroutines**: Async operations
- **View Binding**: Type-safe view references

## Permissions

The app requires the following permissions:
- `INTERNET`: For Supabase API calls
- `READ_EXTERNAL_STORAGE`: For file selection
- `WRITE_EXTERNAL_STORAGE`: For file operations

## Customization

### Change Supabase Configuration
Edit `SupabaseClient.kt`:
```kotlin
private const val SUPABASE_URL = "https://your-project.supabase.co"
private const val SUPABASE_ANON_KEY = "your-anon-key"
```

### Modify Storage Bucket
Edit `FileRepository.kt`:
```kotlin
private val bucketName = "your-bucket-name"
```

### Update Premium Logic
Modify `PremiumRepository.kt` to match your database schema and business logic.

## Troubleshooting

### Build Issues
- Ensure you have the correct Android SDK version
- Check that all dependencies are properly synced
- Verify Supabase configuration

### Runtime Issues
- Check Supabase project settings
- Verify network connectivity
- Check device permissions

### Authentication Issues
- Verify Supabase Auth is enabled
- Check email/password requirements
- Ensure proper error handling

## Future Enhancements

- File preview functionality
- File sharing capabilities
- Offline support
- Push notifications
- Advanced file management features
- Payment integration (when needed)

## License

MIT License - Feel free to use and modify as needed.
