package com.ashwinho4.storage.files

import android.content.Context
import android.net.Uri
import com.ashwinho4.storage.SupabaseClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.InputStream
import java.util.*

class FileRepository {
    
    suspend fun uploadFile(context: Context, uri: Uri, fileName: String): Result<String> {
        return try {
            withContext(Dispatchers.IO) {
                val inputStream: InputStream? = context.contentResolver.openInputStream(uri)
                inputStream?.use { stream ->
                    val fileData = stream.readBytes()
                    
                    val timestamp = Date().time
                    val sanitizedName = fileName.replace(Regex("[^a-zA-Z0-9.-]"), "_")
                    val uniqueFileName = "$timestamp-$sanitizedName"
                    
                    val response = SupabaseClient.apiService.uploadFile(
                        fileName = uniqueFileName,
                        fileData = fileData.toString(Charsets.UTF_8)
                    )
                    
                    if (response.isSuccessful) {
                        Result.success("File uploaded successfully")
                    } else {
                        Result.failure(Exception("Upload failed: ${response.message()}"))
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
                Result.failure(Exception("Delete failed: ${response.message()}"))
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
                Result.failure(Exception("Failed to list files: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
