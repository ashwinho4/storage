const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Add CSP headers to fix console errors
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self';");
    next();
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        console.log('Validating token:', token ? `${token.substring(0, 20)}...` : 'null');
        const { data: { user }, error } = await supabase.auth.getUser(token);
        console.log('Token validation result:', { user: !!user, error: error?.message || 'none' });
        if (error || !user) {
            console.log('Token validation failed:', error?.message || 'No user returned');
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    } catch (error) {
        console.log('Token validation exception:', error.message);
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Configure multer for file uploads (store in memory)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

// Configure Supabase client
const supabaseUrl = 'https://gjihfsstquukbkespeae.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Check if Supabase key is available
if (!supabaseKey) {
    console.error('SUPABASE_ANON_KEY is not set in environment variables');
    console.error('Available environment variables:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
    // Don't exit, just log the error and continue
}

// Check if Dodo Payments API key is available
if (!process.env.DODO_PAYMENTS_API_KEY) {
    console.warn('DODO_PAYMENTS_API_KEY is not set in environment variables');
}

// Check if Dodo Payments Product ID is available
if (!process.env.DODO_PRODUCT_ID) {
    console.warn('DODO_PRODUCT_ID is not set in environment variables - will use fallback from request body');
}

// Create Supabase client with debug logging
console.log('Creating Supabase client with URL:', supabaseUrl);
console.log('Supabase key available:', !!supabaseKey);
console.log('Supabase key length:', supabaseKey ? supabaseKey.length : 0);

const supabase = createClient(supabaseUrl, supabaseKey);

// Also keep S3 client as backup
const s3Client = new S3Client({
    endpoint: process.env.SUPABASE_STORAGE_ENDPOINT || 'https://gjihfsstquukbkespeae.storage.supabase.co/storage/v1/s3',
    region: 'auto',
    credentials: {
        accessKeyId: process.env.SUPABASE_ACCESS_KEY_ID,
        secretAccessKey: process.env.SUPABASE_SECRET_ACCESS_KEY
    },
    forcePathStyle: true,
    signatureVersion: 'v4'
});

// Authentication endpoints
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            success: true,
            message: 'User created successfully',
            user: data.user
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            return res.status(401).json({ error: error.message });
        }

        res.json({
            success: true,
            message: 'Login successful',
            user: data.user,
            session: data.session
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

app.post('/api/auth/logout', async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

// Payment endpoints
app.post('/api/payment/create-checkout', async (req, res) => {
    try {
        const { productId, quantity = 1, customerEmail = 'customer@example.com', customerName = 'John Doe', phoneNumber = '+1234567890' } = req.body;
        
        // Use environment variable for product ID or fallback to request body
        const dodoProductId = process.env.DODO_PRODUCT_ID || productId;
        
        if (!dodoProductId) {
            return res.status(400).json({ error: 'Product ID is required. Please set DODO_PRODUCT_ID environment variable or provide productId in request body.' });
        }

        const response = await fetch('https://test.dodopayments.com/checkouts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`
            },
            body: JSON.stringify({
                // Products to sell - use IDs from your Dodo Payments dashboard
                product_cart: [
                    {
                        product_id: dodoProductId, // Uses environment variable DODO_PRODUCT_ID
                        quantity: quantity
                    }
                ],
                
                // Pre-fill customer information to reduce checkout friction
                customer: {
                    email: customerEmail,
                    name: customerName,
                    phone_number: phoneNumber
                },
                
                // Billing address for tax calculation and compliance
                billing_address: {
                    street: '123 Main St',
                    city: 'San Francisco',
                    state: 'CA', 
                    country: 'US', // Required: ISO 3166-1 alpha-2 country code
                    zipcode: '94102'
                },
                
                // Where to redirect after successful payment
                return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success`,
                
                // Custom data for your internal tracking
                metadata: {
                    order_id: `order_${Date.now()}`,
                    source: 'web_app'
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const session = await response.json();
        
        // Redirect your customer to this URL to complete payment
        console.log('Checkout URL:', session.checkout_url);
        console.log('Session ID:', session.session_id);
        
        res.json({
            success: true,
            checkout_url: session.checkout_url,
            session_id: session.session_id
        });
        
    } catch (error) {
        console.error('Failed to create checkout session:', error);
        res.status(500).json({ error: 'Failed to create payment checkout' });
    }
});

app.post('/api/payment/webhook', async (req, res) => {
    try {
        // Handle payment webhook from Dodo Payments
        const { payment_id, status, customer_email } = req.body;
        
        console.log('Payment webhook received:', { payment_id, status, customer_email });
        
        // Update payment status in your database
        // You would typically update a payments table here
        
        res.json({ success: true, message: 'Webhook received' });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

// Protected upload endpoint
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.file;
        const bucketName = process.env.SUPABASE_BUCKET_NAME || 'storage';
        
        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${timestamp}-${sanitizedFilename}`;

        // Upload to Supabase storage using native API
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            throw error;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: {
                originalName: file.originalname,
                fileName: fileName,
                size: file.size,
                mimetype: file.mimetype,
                url: urlData.publicUrl,
                uploadedBy: req.user.email
            }
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Failed to upload file',
            details: error.message
        });
    }
});

// Protected list files endpoint
app.get('/api/list', authenticateToken, async (req, res) => {
    try {
        console.log('Listing files for user:', req.user.email);
        
        const bucketName = process.env.SUPABASE_BUCKET_NAME || 'storage';
        
        // List files from Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucketName)
            .list('', {
                limit: 100,
                offset: 0
            });

        if (error) {
            console.error('Error listing files:', error);
            return res.status(500).json({ error: 'Failed to list files' });
        }

        console.log('Files listed successfully:', data.length);
        res.json({ 
            success: true,
            files: data 
        });
        
    } catch (error) {
        console.error('Error in list files endpoint:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});


// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Payment success page
app.get('/payment-success', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'payment-success.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to use the app`);
    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Supabase Key configured: ${supabaseKey ? 'Yes' : 'No'}`);
}).on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
});

