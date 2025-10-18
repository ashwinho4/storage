package com.ashwinho4.storage.auth

import android.app.AlertDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.ashwinho4.storage.databinding.ActivityLoginBinding
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityLoginBinding
    private val authRepository = AuthRepository()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Initialize AuthRepository with context
        authRepository.initialize(this)
        
        setupClickListeners()
    }
    
    private fun setupClickListeners() {
        binding.btnLogin.setOnClickListener {
            val email = binding.etEmail.text.toString().trim()
            val password = binding.etPassword.text.toString().trim()
            
            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            
            signIn(email, password)
        }
        
        binding.btnSignUp.setOnClickListener {
            val email = binding.etEmail.text.toString().trim()
            val password = binding.etPassword.text.toString().trim()
            
            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            
            signUp(email, password)
        }
    }
    
    private fun signIn(email: String, password: String) {
        lifecycleScope.launch {
            binding.btnLogin.isEnabled = false
            binding.btnLogin.text = "Signing in..."
            
            authRepository.signIn(email, password)
                .onSuccess {
                    Toast.makeText(this@LoginActivity, "Login successful!", Toast.LENGTH_SHORT).show()
                    navigateToFileList()
                }
                .onFailure { error ->
                    Toast.makeText(this@LoginActivity, "Login failed: ${error.message}", Toast.LENGTH_LONG).show()
                    showDebugDialog("Login Error", error.message ?: "Unknown error")
                }
            
            binding.btnLogin.isEnabled = true
            binding.btnLogin.text = "Login"
        }
    }
    
    private fun signUp(email: String, password: String) {
        lifecycleScope.launch {
            binding.btnSignUp.isEnabled = false
            binding.btnSignUp.text = "Creating account..."
            
            authRepository.signUp(email, password)
                .onSuccess {
                    Toast.makeText(this@LoginActivity, "Account created successfully!", Toast.LENGTH_SHORT).show()
                    navigateToFileList()
                }
                .onFailure { error ->
                    Toast.makeText(this@LoginActivity, "Sign up failed: ${error.message}", Toast.LENGTH_LONG).show()
                    showDebugDialog("Sign Up Error", error.message ?: "Unknown error")
                }
            
            binding.btnSignUp.isEnabled = true
            binding.btnSignUp.text = "Sign Up"
        }
    }
    
    private fun navigateToFileList() {
        val intent = Intent(this, com.ashwinho4.storage.files.FileListActivity::class.java)
        startActivity(intent)
        finish()
    }
    
    private fun showDebugDialog(title: String, debugInfo: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Debug Info", debugInfo)
        clipboard.setPrimaryClip(clip)
        
        AlertDialog.Builder(this)
            .setTitle("🔍 $title")
            .setMessage(debugInfo)
            .setPositiveButton("Copy to Clipboard") { _, _ ->
                Toast.makeText(this, "Debug info copied to clipboard!", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Close", null)
            .setCancelable(true)
            .show()
    }
}
