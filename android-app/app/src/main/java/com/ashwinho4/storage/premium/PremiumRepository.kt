package com.ashwinho4.storage.premium

import com.ashwinho4.storage.SupabaseClient
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class UserProfile(
    val id: String,
    val email: String,
    val isPremium: Boolean = false,
    val premiumExpiryDate: String? = null
)

class PremiumRepository {
    
    suspend fun getUserPremiumStatus(userId: String): Result<UserProfile> {
        return try {
            withContext(Dispatchers.IO) {
                // Assuming you have a 'user_profiles' table with premium status
                // Adjust the table name and columns based on your actual database schema
                val response = SupabaseClient.postgrest
                    .from("user_profiles")
                    .select()
                    .eq("id", userId)
                    .decodeSingle<UserProfile>()
                
                Result.success(response)
            }
        } catch (e: Exception) {
            // If user profile doesn't exist, return default non-premium status
            val defaultProfile = UserProfile(
                id = userId,
                email = "",
                isPremium = false
            )
            Result.success(defaultProfile)
        }
    }
    
    suspend fun updateUserPremiumStatus(userId: String, isPremium: Boolean): Result<Unit> {
        return try {
            withContext(Dispatchers.IO) {
                SupabaseClient.postgrest
                    .from("user_profiles")
                    .upsert(
                        UserProfile(
                            id = userId,
                            email = "",
                            isPremium = isPremium
                        )
                    )
                
                Result.success(Unit)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
