class FileUploadApp {
    constructor() {
        this.selectedFile = null;
        this.uploads = this.loadUploads();
        this.currentUser = null;
        this.authToken = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthStatus();
        this.displayUploads();
        this.handlePaymentReturn();
    }

    bindEvents() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const uploadButton = document.getElementById('uploadButton');
        const removeFileBtn = document.getElementById('removeFile');
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const authTabs = document.querySelectorAll('.auth-tab');
        const authModalOverlay = document.getElementById('authModalOverlay');

        // File input change
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Upload button click
        uploadButton.addEventListener('click', () => this.uploadFile());

        // Remove file button
        removeFileBtn.addEventListener('click', () => this.clearSelection());

        // Drag and drop events
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        // Click on upload area
        uploadArea.addEventListener('click', () => fileInput.click());

        // Auth button events
        loginBtn.addEventListener('click', () => this.showAuthModal('login'));
        signupBtn.addEventListener('click', () => this.showAuthModal('signup'));
        logoutBtn.addEventListener('click', () => this.logout());
        authModalOverlay.addEventListener('click', () => this.hideAuthModal());

        // Form submissions
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        signupForm.addEventListener('submit', (e) => this.handleSignup(e));

        // Tab switching
        authTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAuthTab(e.target.dataset.form));
        });

        // Payment button events
        document.querySelectorAll('.payment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handlePayment(e));
        });
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.selectedFile = file;
            this.showFilePreview();
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.selectedFile = files[0];
            this.showFilePreview();
        }
    }

    showFilePreview() {
        if (!this.selectedFile) return;

        const uploadArea = document.getElementById('uploadArea');
        const selectedFileDiv = document.getElementById('selectedFile');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');

        fileName.textContent = this.selectedFile.name;
        fileSize.textContent = this.formatFileSize(this.selectedFile.size);

        uploadArea.style.display = 'none';
        selectedFileDiv.style.display = 'block';
    }

    clearSelection() {
        this.selectedFile = null;
        document.getElementById('fileInput').value = '';
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('selectedFile').style.display = 'none';
    }

    async uploadFile() {
        if (!this.selectedFile) return;

        const uploadButton = document.getElementById('uploadButton');
        const uploadButtonText = document.getElementById('uploadButtonText');
        const uploadSpinner = document.getElementById('uploadSpinner');
        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');

        try {
            // Disable upload button
            uploadButton.disabled = true;
            uploadButtonText.textContent = 'Uploading...';
            uploadSpinner.style.display = 'inline-block';
            progressBar.style.display = 'block';

            // Simulate progress (since we don't have real progress from fetch)
            this.simulateProgress(progressFill);

            // Create form data
            const formData = new FormData();
            formData.append('file', this.selectedFile);

            // Upload to server
            const headers = {};
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: headers,
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Save upload to history
                this.addUpload(result.file);
                
                // Show success message
                this.showToast('File uploaded successfully!', 'success');

                // Reset form
                this.clearSelection();
                progressFill.style.width = '100%';
                
                setTimeout(() => {
                    progressBar.style.display = 'none';
                    progressFill.style.width = '0%';
                }, 1000);
            } else {
                throw new Error(result.error || 'Upload failed');
            }

        } catch (error) {
            console.error('Upload error:', error);
            this.showToast(`Upload failed: ${error.message}`, 'error');
            progressBar.style.display = 'none';
            progressFill.style.width = '0%';
        } finally {
            // Re-enable upload button
            uploadButton.disabled = false;
            uploadButtonText.textContent = 'Upload File';
            uploadSpinner.style.display = 'none';
        }
    }

    simulateProgress(progressFill) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) {
                progress = 90;
                clearInterval(interval);
            }
            progressFill.style.width = `${progress}%`;
        }, 200);
    }

    addUpload(file) {
        const upload = {
            id: Date.now().toString(),
            fileName: file.originalName,
            size: file.size,
            mimetype: file.mimetype,
            url: file.url,
            uploadedAt: new Date().toISOString()
        };

        this.uploads.unshift(upload);
        this.saveUploads();
        this.displayUploads();
    }

    displayUploads() {
        const uploadsList = document.getElementById('uploadsList');

        if (this.uploads.length === 0) {
            uploadsList.innerHTML = '<div class="empty-state">No files uploaded yet</div>';
            return;
        }

        uploadsList.innerHTML = this.uploads.map(upload => this.createUploadHTML(upload)).join('');

        // Bind copy button events
        this.uploads.forEach(upload => {
            const copyBtn = document.getElementById(`copy-${upload.id}`);
            if (copyBtn) {
                copyBtn.addEventListener('click', () => this.copyToClipboard(upload.url));
            }
        });
    }

    createUploadHTML(upload) {
        const date = new Date(upload.uploadedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const fileIcon = this.getFileIcon(upload.mimetype);

        return `
            <div class="upload-item">
                <div class="upload-item-header">
                    <div class="upload-item-icon">${fileIcon}</div>
                    <div class="upload-item-name">${this.escapeHtml(upload.fileName)}</div>
                </div>
                <div class="upload-item-details">
                    <span>${this.formatFileSize(upload.size)}</span>
                    <span>•</span>
                    <span>${date}</span>
                </div>
                <div class="upload-item-url">
                    <button class="copy-link-btn" id="copy-${upload.id}">
                        📋 Copy Link
                    </button>
                </div>
            </div>
        `;
    }

    getFileIcon(mimetype) {
        if (mimetype.startsWith('image/')) return '🖼️';
        if (mimetype.startsWith('video/')) return '🎥';
        if (mimetype.startsWith('audio/')) return '🎵';
        if (mimetype.includes('pdf')) return '📕';
        if (mimetype.includes('word') || mimetype.includes('document')) return '📄';
        if (mimetype.includes('sheet') || mimetype.includes('excel')) return '📊';
        if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return '📊';
        if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('compressed')) return '🗜️';
        if (mimetype.includes('text')) return '📝';
        return '📁';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Link copied to clipboard!', 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            this.showToast('Failed to copy link', 'error');
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastContent = toast.querySelector('.toast-content');

        toastContent.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveUploads() {
        localStorage.setItem('fileUploads', JSON.stringify(this.uploads));
    }

    loadUploads() {
        const saved = localStorage.getItem('fileUploads');
        return saved ? JSON.parse(saved) : [];
    }

    // Authentication methods
    checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('currentUser');
        
        if (token && user) {
            this.authToken = token;
            this.currentUser = JSON.parse(user);
            this.updateAuthUI();
        }
    }

    showAuthModal(form = 'login') {
        document.getElementById('authForms').style.display = 'flex';
        this.switchAuthTab(form);
    }

    hideAuthModal() {
        document.getElementById('authForms').style.display = 'none';
    }

    switchAuthTab(form) {
        // Update tab buttons
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-form="${form}"]`).classList.add('active');

        // Update forms
        document.querySelectorAll('.auth-form').forEach(formEl => {
            formEl.classList.remove('active');
        });
        document.getElementById(`${form}Form`).classList.add('active');
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                this.authToken = result.session.access_token;
                this.currentUser = result.user;
                
                localStorage.setItem('authToken', this.authToken);
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                
                this.updateAuthUI();
                this.hideAuthModal();
                this.showToast('Login successful!', 'success');
                
                document.getElementById('loginForm').reset();
            } else {
                this.showToast(result.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Login failed', 'error');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Account created successfully! Please login.', 'success');
                this.switchAuthTab('login');
                document.getElementById('signupForm').reset();
            } else {
                this.showToast(result.error || 'Signup failed', 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showToast('Signup failed', 'error');
        }
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        
        this.updateAuthUI();
        this.showToast('Logged out successfully', 'success');
    }

    updateAuthUI() {
        const authButtons = document.querySelector('.auth-buttons');
        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        const uploadSection = document.getElementById('uploadSection');
        const paymentSection = document.getElementById('paymentSection');

        if (this.currentUser) {
            authButtons.style.display = 'none';
            userInfo.style.display = 'flex';
            userEmail.textContent = this.currentUser.email;
            uploadSection.style.display = 'block';
            paymentSection.style.display = 'block';
        } else {
            authButtons.style.display = 'flex';
            userInfo.style.display = 'none';
            uploadSection.style.display = 'none';
            paymentSection.style.display = 'none';
        }
    }

    // Payment methods
    async handlePayment(e) {
        if (!this.currentUser) {
            this.showToast('Please login to make a payment', 'error');
            return;
        }

        const productId = e.target.dataset.productId;
        const button = e.target;
        const originalText = button.textContent;

        try {
            button.disabled = true;
            button.textContent = 'Processing...';

            // Create checkout session using the new Dodo Payments implementation
            const response = await fetch('/api/payment/create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    productId,
                    customerEmail: this.currentUser.email,
                    customerName: this.currentUser.email.split('@')[0],
                    phoneNumber: '+1234567890'
                })
            });

            const result = await response.json();

            if (result.success) {
                // Redirect user to checkout URL as specified in the new implementation
                window.location.href = result.checkout_url;
            } else {
                throw new Error(result.error || 'Failed to create payment session');
            }
        } catch (error) {
            console.error('Payment error:', error);
            this.showToast(error.message || 'Payment failed', 'error');
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }


    // Handle payment success page (when user returns from Dodo Payments)
    handlePaymentReturn() {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentId = urlParams.get('payment_id');
        const status = urlParams.get('status');

        if (paymentId && status === 'success') {
            this.showToast('Payment completed successfully!', 'success');
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (status === 'error') {
            this.showToast('Payment was cancelled or failed', 'error');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FileUploadApp();
});

