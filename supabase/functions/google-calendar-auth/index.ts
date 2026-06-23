import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    if (action === "auth-url") {
      const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-auth?action=callback`;
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar");
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response("Missing code", { status: 400, headers: corsHeaders });
      }

      const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-auth?action=callback`;
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenRes.json();

      if (tokens.error) {
        return new Response(`Error: ${tokens.error_description}`, { status: 400, headers: corsHeaders });
      }

      // Store refresh token in Supabase vault via service role
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      
      // Store in database settings table
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabase = createClient(SUPABASE_URL, serviceRoleKey);
      
      await supabase.from("app_settings").upsert({
        key: "google_refresh_token",
        value: tokens.refresh_token,
      }, { onConflict: "key" });

      return new Response(
        `<html><body><h1>Google Calendar conectado com sucesso!</h1><p>Você pode fechar esta janela.</p><script>window.close();</script></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    if (action === "status") {
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabase = createClient(SUPABASE_URL, serviceRoleKey);
      
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "google_refresh_token")
        .single();

      return new Response(JSON.stringify({ connected: !!data?.value }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Invalid action", { status: 400, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
