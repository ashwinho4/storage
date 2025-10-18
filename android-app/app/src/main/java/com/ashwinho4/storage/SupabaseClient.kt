package com.ashwinho4.storage

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object SupabaseClient {
    
    private const val SUPABASE_URL = "https://gjihfsstquukbkespeae.supabase.co"
    private const val SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE" // Replace with your actual key
    
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val original = chain.request()
            val requestBuilder = original.newBuilder()
                .addHeader("apikey", SUPABASE_ANON_KEY)
                .addHeader("Content-Type", "application/json")
            
            chain.proceed(requestBuilder.build())
        }
        .build()
    
    val retrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(SUPABASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
    
    val apiService: SupabaseApiService by lazy {
        retrofit.create(SupabaseApiService::class.java)
    }
}
