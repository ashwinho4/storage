package com.ashwinho4.storage

import retrofit2.Response
import retrofit2.http.*

interface SupabaseApiService {
    
    // Auth endpoints
    @POST("/auth/v1/signup")
    @Headers("Content-Type: application/json")
    suspend fun signUp(@Body request: SignUpRequest): Response<AuthResponse>
    
    @POST("/auth/v1/token?grant_type=password")
    @Headers("Content-Type: application/json")
    suspend fun signIn(@Body request: SignInRequest): Response<AuthResponse>
    
    @POST("/auth/v1/logout")
    @Headers("Authorization: Bearer YOUR_SUPABASE_ANON_KEY_HERE")
    suspend fun signOut(): Response<Unit>
    
    // Storage endpoints
    @GET("/storage/v1/object/list/uploads")
    @Headers("Authorization: Bearer YOUR_SUPABASE_ANON_KEY_HERE")
    suspend fun listFiles(): Response<List<StorageFile>>
    
    @POST("/storage/v1/object/uploads/{fileName}")
    @Headers("Authorization: Bearer YOUR_SUPABASE_ANON_KEY_HERE")
    suspend fun uploadFile(
        @Path("fileName") fileName: String,
        @Body fileData: String
    ): Response<Unit>
    
    @DELETE("/storage/v1/object/uploads/{fileName}")
    @Headers("Authorization: Bearer YOUR_SUPABASE_ANON_KEY_HERE")
    suspend fun deleteFile(@Path("fileName") fileName: String): Response<Unit>
    
    // Database endpoints
    @GET("/rest/v1/user_profiles")
    @Headers("Authorization: Bearer YOUR_SUPABASE_ANON_KEY_HERE")
    suspend fun getUserProfile(@Query("id") userId: String): Response<List<UserProfile>>
}

// Data classes for API requests and responses
data class SignUpRequest(
    val email: String,
    val password: String
)

data class SignInRequest(
    val email: String,
    val password: String
)

data class AuthResponse(
    val access_token: String,
    val token_type: String,
    val expires_in: Long,
    val refresh_token: String,
    val user: User
)

data class User(
    val id: String,
    val email: String,
    val created_at: String
)

data class StorageFile(
    val name: String,
    val id: String,
    val updated_at: String,
    val created_at: String,
    val last_accessed_at: String,
    val metadata: Map<String, Any>
)

data class UserProfile(
    val id: String,
    val email: String,
    val is_premium: Boolean = false,
    val premium_expiry_date: String? = null
)
