package com.ashwinho4.storage.auth

import com.ashwinho4.storage.SupabaseClient
import com.ashwinho4.storage.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthRepository {
    
    private val _currentUser = MutableStateFlow<User?>(null)
    private val _accessToken = MutableStateFlow<String?>(null)
    val currentUser: Flow<User?> = _currentUser.asStateFlow()
    
    suspend fun signUp(email: String, password: String): Result<User> {
        return try {
            val response = SupabaseClient.apiService.signUp(
                com.ashwinho4.storage.SignUpRequest(email, password)
            )
            
            if (response.isSuccessful && response.body() != null) {
                val authResponse = response.body()!!
                _currentUser.value = authResponse.user
                _accessToken.value = authResponse.access_token
                Result.success(authResponse.user)
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                Result.failure(Exception("Sign up failed: $errorBody"))
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
                Result.success(authResponse.user)
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                Result.failure(Exception("Sign in failed: $errorBody"))
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
                Result.success(Unit)
            } else {
                _currentUser.value = null
                _accessToken.value = null
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
