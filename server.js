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
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    } catch (error) {
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
    process.exit(1);
}

// Check if Dodo Payments API key is available
if (!process.env.DODO_API_KEY) {
    console.warn('DODO_API_KEY is not set in environment variables');
}

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
app.post('/api/payment/create-checkout', authenticateToken, async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;
        
        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        // Create payment record in Supabase
        const paymentData = {
            user_id: req.user.id,
            user_email: req.user.email,
            product_id: productId,
            quantity: quantity,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        // Map internal product IDs to Dodo Payments product IDs
        const productMapping = {
            'basic_plan': process.env.DODO_PRODUCT_BASIC_ID,
            'pro_plan': process.env.DODO_PRODUCT_PRO_ID,
            'enterprise_plan': process.env.DODO_PRODUCT_ENTERPRISE_ID
        };

        const dodoProductId = productMapping[productId];
        if (!dodoProductId) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        // Store payment record (you might want to create a payments table in Supabase)
        // For now, we'll just return the checkout URL
        const checkoutUrl = `https://test.dodopayments.com/checkouts?product_id=${dodoProductId}&quantity=${quantity}&customer_email=${encodeURIComponent(req.user.email)}&return_url=${encodeURIComponent(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success`)}&api_key=${process.env.DODO_API_KEY}`;

        res.json({
            success: true,
            checkoutUrl: checkoutUrl,
            paymentData: paymentData
        });

    } catch (error) {
        console.error('Payment creation error:', error);
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

app.get('/api/payment/status/:paymentId', authenticateToken, async (req, res) => {
    try {
        const { paymentId } = req.params;
        
        // Check payment status (this would typically query your database)
        // For demo purposes, we'll return a mock status
        
        res.json({
            success: true,
            paymentId: paymentId,
            status: 'completed',
            user_id: req.user.id
        });
    } catch (error) {
        console.error('Payment status error:', error);
        res.status(500).json({ error: 'Failed to get payment status' });
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

