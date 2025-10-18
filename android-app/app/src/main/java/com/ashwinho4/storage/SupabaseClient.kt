package com.ashwinho4.storage

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.storage.Storage
import io.github.jan.supabase.postgrest.Postgrest

object SupabaseClient {
    
    private const val SUPABASE_URL = "https://gjihfsstquukbkespeae.supabase.co"
    private const val SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE" // Replace with your actual key
    
    val client = createSupabaseClient(
        supabaseUrl = SUPABASE_URL,
        supabaseKey = SUPABASE_ANON_KEY
    ) {
        install(Auth)
        install(Storage)
        install(Postgrest)
    }
    
    val auth = client.auth
    val storage = client.storage
    val postgrest = client.postgrest
}
