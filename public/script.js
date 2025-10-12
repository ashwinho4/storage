class FileUploadApp {
    constructor() {
        this.selectedFile = null;
        this.uploads = this.loadUploads();
        this.init();
    }

    init() {
        this.bindEvents();
        this.displayUploads();
    }

    bindEvents() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const uploadButton = document.getElementById('uploadButton');
        const removeFileBtn = document.getElementById('removeFile');

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
            const response = await fetch('/api/upload', {
                method: 'POST',
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FileUploadApp();
});

