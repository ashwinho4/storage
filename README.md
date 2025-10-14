# File Upload App

A modern, full-stack web application for uploading files to Supabase storage. Built with Node.js, Express, and vanilla JavaScript with a beautiful, responsive UI.

## Features

- 📁 Upload any file type (images, videos, PDFs, documents, etc.)
- 🎨 Modern, beautiful UI with drag-and-drop support
- ☁️ Secure cloud storage via Supabase S3
- 📋 Copy file URLs to clipboard
- 📱 Fully responsive design
- 🔒 Secure API key handling via environment variables
- 📊 Upload history with file details
- ⚡ Fast and efficient file uploads

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express
- **Storage**: Supabase Storage (S3 compatible)
- **Deployment**: Render

## Project Structure

```
.
├── public/
│   ├── index.html      # Frontend HTML
│   ├── styles.css      # Frontend styles
│   └── script.js       # Frontend JavaScript
├── server.js           # Express server
├── package.json        # Dependencies
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore file
├── render.yaml         # Render deployment config
└── README.md           # This file
```

## Local Development Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Supabase account with S3 storage configured

### Installation

1. Navigate to the project directory:
   ```bash
   cd storage
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`:
   ```env
   SUPABASE_STORAGE_ENDPOINT=https://gjihfsstquukbkespeae.storage.supabase.co/storage/v1/s3
   SUPABASE_ACCESS_KEY_ID=your_access_key_id
   SUPABASE_SECRET_ACCESS_KEY=your_secret_access_key
   SUPABASE_BUCKET_NAME=uploads
   PORT=3000
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and visit: `http://localhost:3000`

## Deployment on Render

### Method 1: Using render.yaml (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Go to [Render Dashboard](https://dashboard.render.com/)

3. Click "New" → "Blueprint"

4. Connect your repository

5. Render will automatically detect the `render.yaml` file

6. Set the following environment variables in Render:
   - `SUPABASE_ACCESS_KEY_ID` - Your Supabase S3 access key ID
   - `SUPABASE_SECRET_ACCESS_KEY` - Your Supabase S3 secret access key

7. Click "Apply" to deploy

### Method 2: Manual Setup

1. Go to [Render Dashboard](https://dashboard.render.com/)

2. Click "New" → "Web Service"

3. Connect your repository

4. Configure the service:
   - **Name**: file-upload-app (or your preferred name)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

5. Add environment variables:
   - `NODE_ENV` = `production`
   - `SUPABASE_STORAGE_ENDPOINT` = `https://gjihfsstquukbkespeae.storage.supabase.co/storage/v1/s3`
   - `SUPABASE_ACCESS_KEY_ID` = Your Supabase access key ID
   - `SUPABASE_SECRET_ACCESS_KEY` = Your Supabase secret access key
   - `SUPABASE_BUCKET_NAME` = `uploads`

6. Click "Create Web Service"

## Getting Supabase S3 Credentials

1. Log in to your [Supabase Dashboard](https://app.supabase.com/)

2. Select your project

3. Go to **Settings** → **Storage**

4. Create an S3 access key:
   - Navigate to the S3 section
   - Generate new access keys
   - Copy the **Access Key ID** and **Secret Access Key**
   - Save these securely (you won't see the secret key again)

5. Create a storage bucket named `uploads` (or your preferred name):
   - Go to **Storage** in the left sidebar
   - Click "Create a new bucket"
   - Name it `uploads`
   - Set appropriate permissions (public or private based on your needs)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_STORAGE_ENDPOINT` | Supabase S3 storage endpoint URL | Yes |
| `SUPABASE_ACCESS_KEY_ID` | Supabase S3 access key ID | Yes |
| `SUPABASE_SECRET_ACCESS_KEY` | Supabase S3 secret access key | Yes |
| `SUPABASE_BUCKET_NAME` | Name of the storage bucket | Yes |
| `PORT` | Server port (default: 3000) | No |

## API Endpoints

### POST /api/upload
Upload a file to Supabase storage.

**Request**: multipart/form-data with `file` field

**Response**:
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "originalName": "example.pdf",
    "fileName": "1234567890-example.pdf",
    "size": 1024000,
    "mimetype": "application/pdf",
    "url": "https://..."
  }
}
```

### GET /api/health
Health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## File Size Limits

The default file size limit is **100MB**. You can modify this in `server.js`:

```javascript
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
    }
});
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

Features used:
- Drag and Drop API
- File API
- Fetch API
- LocalStorage API
- CSS Grid & Flexbox

## Security Considerations

- API keys are stored securely in environment variables
- Never commit `.env` file to version control
- File uploads are validated on the server side
- CORS is enabled for frontend-backend communication
- Files are stored with unique timestamped names to prevent conflicts

## Troubleshooting

### Upload fails with "Failed to upload file"

- Check that your Supabase credentials are correct
- Verify that the bucket name matches your Supabase bucket
- Ensure the bucket has appropriate permissions
- Check Render logs for detailed error messages

### "No file uploaded" error

- Ensure you've selected a file before clicking upload
- Check browser console for JavaScript errors
- Verify the file size is within limits

### Cannot connect to server

- Check that all environment variables are set correctly
- Verify the Render service is running
- Check Render logs for startup errors

## Contributing

Feel free to open issues or submit pull requests for improvements.

## License

MIT License - feel free to use this project for any purpose.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Render deployment logs
3. Check Supabase storage settings
4. Open an issue in the repository

---

Built with ❤️ using Node.js, Express, and Supabase



