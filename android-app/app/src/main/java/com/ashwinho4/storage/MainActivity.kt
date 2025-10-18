package com.ashwinho4.storage

import android.content.Intent
import android.os.Bundle
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.ashwinho4.storage.auth.AuthRepository
import com.ashwinho4.storage.auth.LoginActivity
import com.ashwinho4.storage.files.FileListActivity
import com.ashwinho4.storage.databinding.ActivityMainBinding
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private val authRepository = AuthRepository()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        checkAuthStatus()
    }
    
    private fun checkAuthStatus() {
        lifecycleScope.launch {
            authRepository.currentUser.collect { user ->
                if (user != null) {
                    // User is logged in, go to file list
                    startActivity(Intent(this@MainActivity, FileListActivity::class.java))
                    finish()
                } else {
                    // User is not logged in, go to login
                    startActivity(Intent(this@MainActivity, LoginActivity::class.java))
                    finish()
                }
            }
        }
    }
}
