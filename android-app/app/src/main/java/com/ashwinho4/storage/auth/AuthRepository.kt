package com.ashwinho4.storage.auth

import com.ashwinho4.storage.SupabaseClient
import io.github.jan.supabase.auth.AuthResult
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.user.UserInfo
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthRepository {
    
    private val _currentUser = MutableStateFlow<UserInfo?>(null)
    val currentUser: Flow<UserInfo?> = _currentUser.asStateFlow()
    
    init {
        // Get current user if already logged in
        SupabaseClient.auth.currentUserOrNull()?.let { user ->
            _currentUser.value = user
        }
    }
    
    suspend fun signUp(email: String, password: String): Result<AuthResult> {
        return try {
            val result = SupabaseClient.auth.signUpWith(Email) {
                this.email = email
                this.password = password
            }
            result.user?.let { _currentUser.value = it }
            Result.success(result)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun signIn(email: String, password: String): Result<AuthResult> {
        return try {
            val result = SupabaseClient.auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
            result.user?.let { _currentUser.value = it }
            Result.success(result)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun signOut(): Result<Unit> {
        return try {
            SupabaseClient.auth.signOut()
            _currentUser.value = null
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    fun isLoggedIn(): Boolean {
        return SupabaseClient.auth.currentUserOrNull() != null
    }
    
    fun getCurrentUser(): UserInfo? {
        return SupabaseClient.auth.currentUserOrNull()
    }
}
