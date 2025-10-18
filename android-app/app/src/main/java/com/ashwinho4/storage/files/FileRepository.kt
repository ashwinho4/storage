package com.ashwinho4.storage.files

import android.content.Context
import android.net.Uri
import com.ashwinho4.storage.SupabaseClient
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.InputStream
import java.util.*

class FileRepository {
    
    private val bucketName = "uploads"
    
    suspend fun uploadFile(context: Context, uri: Uri, fileName: String): Result<String> {
        return try {
            withContext(Dispatchers.IO) {
                val inputStream: InputStream? = context.contentResolver.openInputStream(uri)
                inputStream?.use { stream ->
                    val fileData = stream.readBytes()
                    
                    val timestamp = Date().time
                    val sanitizedName = fileName.replace(Regex("[^a-zA-Z0-9.-]"), "_")
                    val uniqueFileName = "$timestamp-$sanitizedName"
                    
                    SupabaseClient.storage.from(bucketName).upload(
                        path = uniqueFileName,
                        data = fileData
                    )
                    
                    // Get public URL
                    val publicUrl = SupabaseClient.storage.from(bucketName).createSignedUrl(
                        path = uniqueFileName,
                        expiresIn = 3600
                    )
                    
                    Result.success(publicUrl)
                } ?: Result.failure(Exception("Could not read file"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun deleteFile(fileName: String): Result<Unit> {
        return try {
            SupabaseClient.storage.from(bucketName).delete(fileName)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun listFiles(): Result<List<String>> {
        return try {
            val files = SupabaseClient.storage.from(bucketName).list()
            val fileNames = files.map { it.name }
            Result.success(fileNames)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
