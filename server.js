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
if (!process.env.DODO_PAYMENTS_API_KEY) {
    console.warn('DODO_PAYMENTS_API_KEY is not set in environment variables');
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
app.post('/api/payment/create-checkout', async (req, res) => {
    try {
        const { productId, quantity = 1, customerEmail = 'guest@example.com' } = req.body;
        
        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        // Create payment record in Supabase (optional for guest users)
        const paymentData = {
            user_id: 'guest',
            user_email: customerEmail,
            product_id: productId,
            quantity: quantity,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        // Map internal product IDs to Dodo Payments product IDs
        const productMapping = {
            'basic_plan': process.env.DODO_PRODUCT_BASIC_ID
        };

        const dodoProductId = productMapping[productId];
        if (!dodoProductId) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        // Debug logging
        console.log('=== DODO PAYMENTS DEBUG ===');
        console.log('API Key exists:', !!process.env.DODO_PAYMENTS_API_KEY);
        console.log('API Key (first 10 chars):', process.env.DODO_PAYMENTS_API_KEY ? process.env.DODO_PAYMENTS_API_KEY.substring(0, 10) + '...' : 'NOT SET');
        console.log('Product ID:', dodoProductId);
        console.log('Frontend URL:', process.env.FRONTEND_URL);
        console.log('Customer email:', customerEmail);
        
        const requestBody = {
            // Products to sell - use IDs from your Dodo Payments dashboard
            product_cart: [
                {
                    product_id: dodoProductId,
                    quantity: quantity
                }
            ],
            
            // Pre-fill customer information to reduce checkout friction
            customer: {
                email: customerEmail,
                name: customerEmail.split('@')[0] // Use email prefix as name
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
                user_id: 'guest',
                internal_product_id: productId,
                order_id: `order_${Date.now()}_guest`,
                source: 'web_app'
            }
        };
        
        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        // Create checkout session using Dodo Payments REST API
        // Try different authentication methods
        const authMethods = [
            `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
            `Basic ${Buffer.from(process.env.DODO_PAYMENTS_API_KEY + ':').toString('base64')}`,
            process.env.DODO_PAYMENTS_API_KEY,
            `sk_test_${process.env.DODO_PAYMENTS_API_KEY}`,
            `Bearer sk_test_${process.env.DODO_PAYMENTS_API_KEY}`
        ];
        
        let checkoutResponse;
        let lastError;
        
        const endpoints = [
            'https://test.dodopayments.com/checkouts',
            'https://api.dodopayments.com/v1/checkouts',
            'https://test.api.dodopayments.com/checkouts'
        ];
        
        let success = false;
        
        for (let i = 0; i < authMethods.length && !success; i++) {
            for (let j = 0; j < endpoints.length && !success; j++) {
                try {
                    console.log(`Trying auth method ${i + 1} with endpoint ${j + 1}: ${authMethods[i].substring(0, 20)}... -> ${endpoints[j]}`);
                    
                    checkoutResponse = await fetch(endpoints[j], {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': authMethods[i]
                        },
                        body: JSON.stringify(requestBody)
                    });
                    
                    console.log(`Response status:`, checkoutResponse.status);
                    
                    if (checkoutResponse.ok) {
                        console.log(`SUCCESS with auth method ${i + 1} and endpoint ${j + 1}!`);
                        success = true;
                        break;
                    } else {
                        const errorText = await checkoutResponse.text();
                        console.log(`Auth method ${i + 1} with endpoint ${j + 1} failed:`, errorText);
                        lastError = errorText;
                    }
                } catch (error) {
                    console.log(`Auth method ${i + 1} with endpoint ${j + 1} threw error:`, error.message);
                    lastError = error.message;
                }
            }
        }

        console.log('Response status:', checkoutResponse.status);
        console.log('Response headers:', Object.fromEntries(checkoutResponse.headers.entries()));
        
        if (!checkoutResponse.ok) {
            const errorText = await checkoutResponse.text();
            console.error('Dodo Payments API Error Response:', errorText);
            throw new Error(`HTTP error! status: ${checkoutResponse.status}, body: ${errorText}`);
        }

        const session = await checkoutResponse.json();
        
        // Log the response (matching your format)
        console.log('Checkout URL:', session.checkout_url);
        console.log('Session ID:', session.session_id);
        console.log('=== END DEBUG ===');
        
        res.json({
            success: true,
            checkoutUrl: session.checkout_url,
            sessionId: session.session_id,
            paymentData: paymentData
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

// Debug endpoint to test API key (remove this after debugging)
app.get('/api/debug/dodo-key', (req, res) => {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    res.json({
        hasKey: !!apiKey,
        keyLength: apiKey ? apiKey.length : 0,
        keyPrefix: apiKey ? apiKey.substring(0, 15) + '...' : 'NOT SET',
        keySuffix: apiKey ? '...' + apiKey.substring(apiKey.length - 10) : 'NOT SET'
    });
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

