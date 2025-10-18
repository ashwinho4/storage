package com.ashwinho4.storage.auth

import com.ashwinho4.storage.SupabaseClient
import com.ashwinho4.storage.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthRepository {
    
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: Flow<User?> = _currentUser.asStateFlow()
    
    suspend fun signUp(email: String, password: String): Result<User> {
        return try {
            val response = SupabaseClient.apiService.signUp(
                com.ashwinho4.storage.SignUpRequest(email, password)
            )
            
            if (response.isSuccessful) {
                val authResponse = response.body()!!
                _currentUser.value = authResponse.user
                Result.success(authResponse.user)
            } else {
                Result.failure(Exception("Sign up failed: ${response.message()}"))
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
            
            if (response.isSuccessful) {
                val authResponse = response.body()!!
                _currentUser.value = authResponse.user
                Result.success(authResponse.user)
            } else {
                Result.failure(Exception("Sign in failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun signOut(): Result<Unit> {
        return try {
            val response = SupabaseClient.apiService.signOut()
            if (response.isSuccessful) {
                _currentUser.value = null
                Result.success(Unit)
            } else {
                Result.failure(Exception("Sign out failed: ${response.message()}"))
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
