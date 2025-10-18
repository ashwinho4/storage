package com.ashwinho4.storage

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object SupabaseClient {
    
    private const val SUPABASE_URL = "https://gjihfsstquukbkespeae.supabase.co"
    private const val SERVER_URL = "http://192.168.1.110:3000" // Local network IP
    private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaWhmc3N0cXV1a2JrZXNwZWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjc5ODAsImV4cCI6MjA3NTcwMzk4MH0.xjRPkZB7tbQZ4ahO8zLTy0Cap1K59RJbhCBnBDptDcg"
    
    private var userToken: String? = null
    private var supabaseRetrofit: Retrofit? = null
    private var serverRetrofit: Retrofit? = null
    
    fun setUserToken(token: String?) {
        userToken = token
        // Invalidate retrofit instances so they get recreated with new token
        supabaseRetrofit = null
        serverRetrofit = null
    }
    
    private fun getSupabaseOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor { chain ->
                val original = chain.request()
                val requestBuilder = original.newBuilder()
                    .addHeader("apikey", SUPABASE_ANON_KEY)
                    .addHeader("Content-Type", "application/json")
                
                // Add Authorization header for authenticated requests
                userToken?.let { token ->
                    requestBuilder.addHeader("Authorization", "Bearer $token")
                }
                
                // Debug logging
                println("DEBUG: Making Supabase request to: ${original.url}")
                val tokenForLog = userToken
                println("DEBUG: Headers: apikey=${SUPABASE_ANON_KEY.take(20)}..., Authorization=${if (tokenForLog != null) "Bearer ${tokenForLog.take(20)}..." else "null"}")
                
                chain.proceed(requestBuilder.build())
            }
            .build()
    }
    
    private fun getServerOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor { chain ->
                val original = chain.request()
                val requestBuilder = original.newBuilder()
                    .addHeader("Content-Type", "application/json")
                
                // Add Authorization header for authenticated requests
                userToken?.let { token ->
                    requestBuilder.addHeader("Authorization", "Bearer $token")
                }
                
                // Debug logging
                println("DEBUG: Making server request to: ${original.url}")
                val tokenForLog = userToken
                println("DEBUG: Headers: Authorization=${if (tokenForLog != null) "Bearer ${tokenForLog.take(20)}..." else "null"}")
                
                chain.proceed(requestBuilder.build())
            }
            .build()
    }
    
    private fun getSupabaseRetrofit(): Retrofit {
        return supabaseRetrofit ?: Retrofit.Builder()
            .baseUrl(SUPABASE_URL)
            .client(getSupabaseOkHttpClient())
            .addConverterFactory(GsonConverterFactory.create())
            .build().also { supabaseRetrofit = it }
    }
    
    private fun getServerRetrofit(): Retrofit {
        return serverRetrofit ?: Retrofit.Builder()
            .baseUrl(SERVER_URL)
            .client(getServerOkHttpClient())
            .addConverterFactory(GsonConverterFactory.create())
            .build().also { serverRetrofit = it }
    }
    
    val apiService: SupabaseApiService
        get() = getSupabaseRetrofit().create(SupabaseApiService::class.java)
    
    val serverApiService: SupabaseApiService
        get() = getServerRetrofit().create(SupabaseApiService::class.java)
}
