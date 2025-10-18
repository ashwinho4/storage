package com.ashwinho4.storage.auth

import android.content.Context
import android.content.SharedPreferences
import com.ashwinho4.storage.SupabaseClient
import com.ashwinho4.storage.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import com.google.gson.Gson

class AuthRepository {
    
    private lateinit var sharedPreferences: SharedPreferences
    private val gson = Gson()
    
    private val _currentUser = MutableStateFlow<User?>(null)
    private val _accessToken = MutableStateFlow<String?>(null)
    val currentUser: Flow<User?> = _currentUser.asStateFlow()
    
    fun initialize(context: Context) {
        sharedPreferences = context.getSharedPreferences("auth_prefs", Context.MODE_PRIVATE)
        restoreAuthState()
    }
    
    private fun restoreAuthState() {
        val userJson = sharedPreferences.getString("current_user", null)
        val token = sharedPreferences.getString("access_token", null)
        
        if (userJson != null && token != null) {
            try {
                val user = gson.fromJson(userJson, User::class.java)
                _currentUser.value = user
                _accessToken.value = token
                SupabaseClient.setUserToken(token)
            } catch (e: Exception) {
                // Clear invalid stored data
                clearStoredAuth()
            }
        }
    }
    
    private fun saveAuthState(user: User, token: String) {
        val userJson = gson.toJson(user)
        sharedPreferences.edit()
            .putString("current_user", userJson)
            .putString("access_token", token)
            .apply()
    }
    
    private fun clearStoredAuth() {
        sharedPreferences.edit()
            .remove("current_user")
            .remove("access_token")
            .apply()
    }
    
    suspend fun signUp(email: String, password: String): Result<User> {
        return try {
            val response = SupabaseClient.apiService.signUp(
                com.ashwinho4.storage.SignUpRequest(email, password)
            )
            
            if (response.isSuccessful && response.body() != null) {
                val authResponse = response.body()!!
                _currentUser.value = authResponse.user
                _accessToken.value = authResponse.access_token
                
                // Set user token for Supabase client
                SupabaseClient.setUserToken(authResponse.access_token)
                
                // Save auth state to SharedPreferences
                saveAuthState(authResponse.user, authResponse.access_token)
                
                Result.success(authResponse.user)
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                val debugInfo = """
                    DEBUG INFO:
                    Status Code: ${response.code()}
                    Error Body: $errorBody
                    Endpoint: /auth/v1/signup
                    Email: $email
                """.trimIndent()
                Result.failure(Exception("Sign up failed: $errorBody\n\n$debugInfo"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun signIn(email: String, password: String): Result<User> {
        return try {
            val response = SupabaseClient.apiService.signIn(
                com.ashwinho4.storage.SignInRequest(email, password)
            )
            
            if (response.isSuccessful && response.body() != null) {
                val authResponse = response.body()!!
                _currentUser.value = authResponse.user
                _accessToken.value = authResponse.access_token
                
                // Set user token for Supabase client
                SupabaseClient.setUserToken(authResponse.access_token)
                
                // Save auth state to SharedPreferences
                saveAuthState(authResponse.user, authResponse.access_token)
                
                Result.success(authResponse.user)
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                val debugInfo = """
                    DEBUG INFO:
                    Status Code: ${response.code()}
                    Error Body: $errorBody
                    Endpoint: /auth/v1/token?grant_type=password
                    Email: $email
                """.trimIndent()
                Result.failure(Exception("Sign in failed: $errorBody\n\n$debugInfo"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun signOut(): Result<Unit> {
        return try {
            val token = _accessToken.value
            if (token != null) {
                val response = SupabaseClient.apiService.signOut("Bearer $token")
                _currentUser.value = null
                _accessToken.value = null
                
                // Clear user token from Supabase client
                SupabaseClient.setUserToken(null)
                
                // Clear stored auth state
                clearStoredAuth()
                
                Result.success(Unit)
            } else {
                _currentUser.value = null
                _accessToken.value = null
                
                // Clear user token from Supabase client
                SupabaseClient.setUserToken(null)
                
                // Clear stored auth state
                clearStoredAuth()
                
                Result.success(Unit)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    fun isLoggedIn(): Boolean {
        return _currentUser.value != null
    }
    
    fun getCurrentUser(): User? {
        return _currentUser.value
    }
}
