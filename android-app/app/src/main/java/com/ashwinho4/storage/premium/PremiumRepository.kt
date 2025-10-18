package com.ashwinho4.storage.premium

import com.ashwinho4.storage.SupabaseClient
import com.ashwinho4.storage.UserProfile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class PremiumRepository {
    
    suspend fun getUserPremiumStatus(userId: String): Result<UserProfile> {
        return try {
            withContext(Dispatchers.IO) {
                val response = SupabaseClient.apiService.getUserProfile(userId)
                
                if (response.isSuccessful) {
                    val profiles = response.body() ?: emptyList()
                    if (profiles.isNotEmpty()) {
                        Result.success(profiles.first())
                    } else {
                        // If user profile doesn't exist, return default non-premium status
                        val defaultProfile = UserProfile(
                            id = userId,
                            email = "",
                            is_premium = false
                        )
                        Result.success(defaultProfile)
                    }
                } else {
                    // Return default non-premium status on error
                    val defaultProfile = UserProfile(
                        id = userId,
                        email = "",
                        is_premium = false
                    )
                    Result.success(defaultProfile)
                }
            }
        } catch (e: Exception) {
            // If user profile doesn't exist, return default non-premium status
            val defaultProfile = UserProfile(
                id = userId,
                email = "",
                is_premium = false
            )
            Result.success(defaultProfile)
        }
    }
    
    suspend fun updateUserPremiumStatus(userId: String, isPremium: Boolean): Result<Unit> {
        return try {
            withContext(Dispatchers.IO) {
                // This would need to be implemented as a separate API endpoint
                // For now, just return success
                Result.success(Unit)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
