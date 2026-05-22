const SUPABASE_URL     = "https://qnxpewdqbwasvmdpqjyw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueHBld2RxYndhc3ZtZHBxanl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NDAzNzEsImV4cCI6MjA5NTAxNjM3MX0.5SHbLxIQzLAPpmdv7TeftM33FtAuj-A-Ng-Lwb9Xsgo";

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getSupabase() {
  return _supabase;
}
