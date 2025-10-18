package com.ashwinho4.storage.files

import android.content.Context
import android.net.Uri
import com.ashwinho4.storage.SupabaseClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.Response
import java.io.File
import java.io.FileOutputStream
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
    
    // In-memory storage for demo purposes
    private val uploadedFiles = mutableListOf<String>()
    
    suspend fun uploadFile(context: Context, uri: Uri, fileName: String): Result<String> {
        return try {
            withContext(Dispatchers.IO) {
                val inputStream: InputStream? = context.contentResolver.openInputStream(uri)
                inputStream?.use { stream ->
                    val timestamp = Date().time
                    val sanitizedName = fileName.replace(Regex("[^a-zA-Z0-9.-]"), "_")
                    val uniqueFileName = "$timestamp-$sanitizedName"
                    
                    // Simulate upload delay
                    kotlinx.coroutines.delay(1000)
                    
                    // Add to our in-memory list
                    uploadedFiles.add(uniqueFileName)
                    
                    Result.success("File uploaded successfully: $uniqueFileName")
                } ?: Result.failure(Exception("Could not read file"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun deleteFile(fileName: String): Result<Unit> {
        return try {
            // Remove from our in-memory list
            uploadedFiles.remove(fileName)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun listFiles(): Result<List<String>> {
        return try {
            // Return the actual uploaded files
            Result.success(uploadedFiles.toList())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
