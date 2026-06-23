import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://rixxzwbrwuayvzbajlyw.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeHh6d2Jyd3VheXZ6YmFqbHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODA3NTcsImV4cCI6MjA4NzM1Njc1N30.skslu8LhDiMuxyy3B0RLjln5w8d-uIznwU2cwqNVXr8';

export const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);
