package com.ashwinho4.storage.files

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.ashwinho4.storage.R
import com.ashwinho4.storage.SupabaseClient
import com.ashwinho4.storage.auth.AuthRepository
import com.ashwinho4.storage.databinding.ActivityFileListBinding
import com.ashwinho4.storage.premium.PremiumRepository
import com.ashwinho4.storage.premium.UserProfile
import kotlinx.coroutines.launch

class FileListActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityFileListBinding
    private val authRepository = AuthRepository()
    private val fileRepository = FileRepository()
    private val premiumRepository = PremiumRepository()
    private lateinit var fileAdapter: FileAdapter
    private var userProfile: UserProfile? = null
    
    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.data?.let { uri ->
                uploadFile(uri)
            }
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityFileListBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupUI()
        checkPremiumStatus()
        loadFiles()
    }
    
    private fun setupUI() {
        fileAdapter = FileAdapter { fileName ->
            deleteFile(fileName)
        }
        
        binding.recyclerViewFiles.apply {
            layoutManager = LinearLayoutManager(this@FileListActivity)
            adapter = fileAdapter
        }
        
        binding.btnUploadFile.setOnClickListener {
            pickFile()
        }
        
        binding.btnLogout.setOnClickListener {
            logout()
        }
    }
    
    private fun checkPremiumStatus() {
        val currentUser = authRepository.getCurrentUser()
        if (currentUser != null) {
            lifecycleScope.launch {
                premiumRepository.getUserPremiumStatus(currentUser.id)
                    .onSuccess { profile ->
                        userProfile = profile
                        updatePremiumStatusUI(profile.is_premium)
                    }
                    .onFailure { error ->
                        Toast.makeText(this@FileListActivity, "Failed to load premium status: ${error.message}", Toast.LENGTH_SHORT).show()
                    }
            }
        }
    }
    
    private fun updatePremiumStatusUI(isPremium: Boolean) {
        binding.tvPremiumStatus.text = if (isPremium) {
            "Premium User ✅"
        } else {
            "Free User"
        }
        
        binding.tvPremiumStatus.setTextColor(
            if (isPremium) {
                getColor(R.color.green)
            } else {
                getColor(R.color.gray)
            }
        )
    }
    
    private fun pickFile() {
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "*/*"
            addCategory(Intent.CATEGORY_OPENABLE)
        }
        filePickerLauncher.launch(intent)
    }
    
    private fun uploadFile(uri: Uri) {
        val fileName = getFileName(uri) ?: "unknown_file"
        
        lifecycleScope.launch {
            binding.btnUploadFile.isEnabled = false
            binding.btnUploadFile.text = "Uploading..."
            
            fileRepository.uploadFile(this@FileListActivity, uri, fileName)
                .onSuccess { url ->
                    Toast.makeText(this@FileListActivity, "File uploaded successfully!", Toast.LENGTH_SHORT).show()
                    loadFiles() // Refresh the file list
                }
                .onFailure { error ->
                    Toast.makeText(this@FileListActivity, "Upload failed: ${error.message}", Toast.LENGTH_LONG).show()
                }
            
            binding.btnUploadFile.isEnabled = true
            binding.btnUploadFile.text = "Upload File"
        }
    }
    
    private fun loadFiles() {
        lifecycleScope.launch {
            fileRepository.listFiles()
                .onSuccess { files ->
                    fileAdapter.submitList(files)
                }
                .onFailure { error ->
                    Toast.makeText(this@FileListActivity, "Failed to load files: ${error.message}", Toast.LENGTH_SHORT).show()
                }
        }
    }
    
    private fun deleteFile(fileName: String) {
        lifecycleScope.launch {
            fileRepository.deleteFile(fileName)
                .onSuccess {
                    Toast.makeText(this@FileListActivity, "File deleted successfully!", Toast.LENGTH_SHORT).show()
                    loadFiles() // Refresh the file list
                }
                .onFailure { error ->
                    Toast.makeText(this@FileListActivity, "Delete failed: ${error.message}", Toast.LENGTH_SHORT).show()
                }
        }
    }
    
    private fun logout() {
        lifecycleScope.launch {
            authRepository.signOut()
                .onSuccess {
                    finish()
                }
                .onFailure { error ->
                    Toast.makeText(this@FileListActivity, "Logout failed: ${error.message}", Toast.LENGTH_SHORT).show()
                }
        }
    }
    
    private fun getFileName(uri: Uri): String? {
        return contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
            cursor.moveToFirst()
            cursor.getString(nameIndex)
        }
    }
}
