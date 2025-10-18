package com.ashwinho4.storage.files

import android.content.Context
import android.net.Uri
import com.ashwinho4.storage.SupabaseClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.InputStream
import java.util.*

class FileRepository {
    
    companion object {
        @Volatile
        private var INSTANCE: FileRepository? = null
        
        fun getInstance(): FileRepository {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: FileRepository().also { INSTANCE = it }
            }
        }
    }
    
    suspend fun uploadFile(context: Context, uri: Uri, fileName: String): Result<String> {
        return try {
            withContext(Dispatchers.IO) {
                val inputStream: InputStream? = context.contentResolver.openInputStream(uri)
                inputStream?.use { stream ->
                    val timestamp = Date().time
                    val sanitizedName = fileName.replace(Regex("[^a-zA-Z0-9.-]"), "_")
                    val uniqueFileName = "$timestamp-$sanitizedName"
                    
                    // Read file content
                    val fileBytes = stream.readBytes()
                    val contentType = context.contentResolver.getType(uri) ?: "application/octet-stream"
                    
                    // Create request body
                    val requestBody = fileBytes.toRequestBody(contentType.toMediaType())
                    
                    // Try to upload to Supabase Storage
                    val response = SupabaseClient.apiService.uploadFile(uniqueFileName, requestBody)
                    
                    if (response.isSuccessful) {
                        Result.success("File uploaded successfully: $uniqueFileName")
                    } else {
                        // If upload fails with 404, try to create the bucket first
                        val errorBody = response.errorBody()?.string() ?: "Upload failed"
                        val debugInfo = """
                            DEBUG INFO:
                            Status Code: ${response.code()}
                            Error Body: $errorBody
                            File Name: $uniqueFileName
                            Content Type: $contentType
                            File Size: ${fileBytes.size} bytes
                            Bucket: storage
                        """.trimIndent()
                        
                        if (response.code() == 404 && errorBody.contains("Bucket")) {
                            // Try to create the storage bucket
                            val bucketResponse = SupabaseClient.apiService.createBucket(
                                com.ashwinho4.storage.CreateBucketRequest(
                                    id = "storage",
                                    name = "storage",
                                    public = true
                                )
                            )
                            
                            if (bucketResponse.isSuccessful) {
                                // Retry upload after creating bucket
                                val retryResponse = SupabaseClient.apiService.uploadFile(uniqueFileName, requestBody)
                                if (retryResponse.isSuccessful) {
                                    Result.success("File uploaded successfully: $uniqueFileName")
                                } else {
                                    val retryError = retryResponse.errorBody()?.string() ?: "Upload failed after bucket creation"
                                    Result.failure(Exception("Upload failed after bucket creation: $retryError\n\n$debugInfo"))
                                }
                            } else {
                                val bucketError = bucketResponse.errorBody()?.string() ?: "Bucket creation failed"
                                Result.failure(Exception("Could not create bucket: $bucketError\n\n$debugInfo"))
                            }
                        } else {
                            Result.failure(Exception("Upload failed: $errorBody\n\n$debugInfo"))
                        }
                    }
                } ?: Result.failure(Exception("Could not read file"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun deleteFile(fileName: String): Result<Unit> {
        return try {
            val response = SupabaseClient.apiService.deleteFile(fileName)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorBody = response.errorBody()?.string() ?: "Delete failed"
                
                // If bucket doesn't exist, try to create it first
                if (response.code() == 404 && errorBody.contains("Bucket not found")) {
                    val bucketResponse = SupabaseClient.apiService.createBucket(
                        com.ashwinho4.storage.CreateBucketRequest(
                            id = "storage",
                            name = "storage",
                            public = true
                        )
                    )
                    
                    if (bucketResponse.isSuccessful) {
                        // Bucket created successfully, but file doesn't exist to delete
                        Result.success(Unit) // File already "deleted" since bucket was empty
                    } else {
                        val bucketError = bucketResponse.errorBody()?.string() ?: "Bucket creation failed"
                        val debugInfo = """
                            DEBUG INFO:
                            Status Code: ${response.code()}
                            Error Body: $errorBody
                            File Name: $fileName
                            Bucket: storage
                            Bucket Creation Failed: $bucketError
                        """.trimIndent()
                        Result.failure(Exception("Could not create bucket: $bucketError\n\n$debugInfo"))
                    }
                } else {
                    val debugInfo = """
                        DEBUG INFO:
                        Status Code: ${response.code()}
                        Error Body: $errorBody
                        File Name: $fileName
                        Bucket: storage
                    """.trimIndent()
                    Result.failure(Exception("Delete failed: $errorBody\n\n$debugInfo"))
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun listFiles(): Result<List<String>> {
        return try {
            val response = SupabaseClient.apiService.listFiles()
            if (response.isSuccessful) {
                val files = response.body() ?: emptyList()
                val fileNames = files.map { it.name }
                Result.success(fileNames)
            } else {
                val errorBody = response.errorBody()?.string() ?: "List failed"
                
                // Check if it's an authentication issue (401/403)
                if (response.code() == 401 || response.code() == 403) {
                    val debugInfo = """
                        DEBUG INFO:
                        Status Code: ${response.code()}
                        Error Body: $errorBody
                        Bucket: storage
                        Issue: Authentication failed - user may not be logged in or token expired
                        Solution: Please login again
                    """.trimIndent()
                    Result.failure(Exception("Authentication failed - please login again\n\n$debugInfo"))
                } else if (response.code() == 404 && errorBody.contains("Bucket not found")) {
                    val bucketResponse = SupabaseClient.apiService.createBucket(
                        com.ashwinho4.storage.CreateBucketRequest(
                            id = "storage",
                            name = "storage",
                            public = true
                        )
                    )
                    
                    if (bucketResponse.isSuccessful) {
                        // Bucket created successfully, retry listing
                        val retryResponse = SupabaseClient.apiService.listFiles()
                        if (retryResponse.isSuccessful) {
                            val files = retryResponse.body() ?: emptyList()
                            val fileNames = files.map { it.name }
                            Result.success(fileNames)
                        } else {
                            val retryError = retryResponse.errorBody()?.string() ?: "List failed after bucket creation"
                            Result.failure(Exception("List failed after bucket creation: $retryError"))
                        }
                    } else {
                        val bucketError = bucketResponse.errorBody()?.string() ?: "Bucket creation failed"
                        val debugInfo = """
                            DEBUG INFO:
                            Status Code: ${response.code()}
                            Error Body: $errorBody
                            Bucket: storage
                            Bucket Creation Failed: $bucketError
                        """.trimIndent()
                        Result.failure(Exception("Could not create bucket: $bucketError\n\n$debugInfo"))
                    }
                } else {
                    val debugInfo = """
                        DEBUG INFO:
                        Status Code: ${response.code()}
                        Error Body: $errorBody
                        Bucket: storage
                    """.trimIndent()
                    Result.failure(Exception("List failed: $errorBody\n\n$debugInfo"))
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}