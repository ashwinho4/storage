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
                                    Result.failure(Exception("Upload failed: $retryError"))
                                }
                            } else {
                                Result.failure(Exception("Upload failed: Could not create bucket"))
                            }
                        } else {
                            Result.failure(Exception("Upload failed: $errorBody"))
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
                Result.failure(Exception("Delete failed: $errorBody"))
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
                Result.failure(Exception("List failed: $errorBody"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}