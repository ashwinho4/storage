package com.ashwinho4.storage

import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

interface SupabaseApiService {
    
    // Auth endpoints
    @POST("/auth/v1/signup")
    suspend fun signUp(@Body request: SignUpRequest): Response<AuthResponse>
    
    @POST("/auth/v1/token?grant_type=password")
    suspend fun signIn(@Body request: SignInRequest): Response<AuthResponse>
    
    @POST("/auth/v1/logout")
    suspend fun signOut(@Header("Authorization") token: String): Response<Unit>
    
    // Storage endpoints
    @POST("/storage/v1/bucket")
    suspend fun createBucket(@Body bucket: CreateBucketRequest): Response<Unit>
    
    @GET("/storage/v1/object/list/{bucketId}")
    suspend fun listFiles(@Path("bucketId") bucketId: String): Response<List<StorageFile>>
    
    @POST("/storage/v1/object/{bucketId}/{fileName}")
    suspend fun uploadFile(
        @Path("bucketId") bucketId: String,
        @Path("fileName") fileName: String,
        @Body file: RequestBody
    ): Response<Unit>
    
    @DELETE("/storage/v1/object/{bucketId}/{fileName}")
    suspend fun deleteFile(
        @Path("bucketId") bucketId: String,
        @Path("fileName") fileName: String
    ): Response<Unit>
    
    // Database endpoints
    @GET("/rest/v1/user_profiles")
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

data class CreateBucketRequest(
    val id: String,
    val name: String,
    val public: Boolean = true
)
