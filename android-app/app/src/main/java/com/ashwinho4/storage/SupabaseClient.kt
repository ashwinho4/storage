package com.ashwinho4.storage

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object SupabaseClient {
    
    private const val SUPABASE_URL = "https://gjihfsstquukbkespeae.supabase.co"
    private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaWhmc3N0cXV1a2JrZXNwZWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjc5ODAsImV4cCI6MjA3NTcwMzk4MH0.xjRPkZB7tbQZ4ahO8zLTy0Cap1K59RJbhCBnBDptDcg"
    
    private var userToken: String? = null
    private var retrofit: Retrofit? = null
    
    fun setUserToken(token: String?) {
        userToken = token
        // Invalidate retrofit instance so it gets recreated with new token
        retrofit = null
    }
    
    private fun getOkHttpClient(): OkHttpClient {
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
                println("DEBUG: Making request to: ${original.url}")
                println("DEBUG: Headers: apikey=${SUPABASE_ANON_KEY.take(20)}..., Authorization=${if (userToken != null) "Bearer ${userToken.take(20)}..." else "null"}")
                
                chain.proceed(requestBuilder.build())
            }
            .build()
    }
    
    private fun getRetrofit(): Retrofit {
        return retrofit ?: Retrofit.Builder()
            .baseUrl(SUPABASE_URL)
            .client(getOkHttpClient())
            .addConverterFactory(GsonConverterFactory.create())
            .build().also { retrofit = it }
    }
    
    val apiService: SupabaseApiService
        get() = getRetrofit().create(SupabaseApiService::class.java)
}
