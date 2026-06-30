import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Identifica quem está chamando (precisa ser admin).
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return json({ error: "Não autorizado." }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: caller, error: callerError } = await admin.auth.getUser(token);
    if (callerError || !caller?.user) {
      return json({ error: "Sessão inválida." }, 401);
    }

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return json({ error: "Apenas administradores podem redefinir senhas." }, 403);
    }

    // 2) Lê os dados do pedido.
    const { clientId, tempPassword } = await req.json();
    if (!clientId || !tempPassword || String(tempPassword).length < 6) {
      return json({ error: "Informe uma senha temporária com pelo menos 6 caracteres." }, 400);
    }

    // 3) Descobre o usuário de autenticação ligado ao cliente.
    const { data: client, error: clientError } = await admin
      .from("clients")
      .select("user_id")
      .eq("id", clientId)
      .single();

    if (clientError || !client?.user_id) {
      return json({ error: "Este cliente ainda não tem uma conta de acesso." }, 404);
    }

    // 4) Define a senha temporária e marca que precisa trocar no próximo acesso.
    const { data: existing } = await admin.auth.admin.getUserById(client.user_id);
    const currentMeta = existing?.user?.user_metadata || {};

    const { error: updateError } = await admin.auth.admin.updateUserById(client.user_id, {
      password: String(tempPassword),
      user_metadata: { ...currentMeta, must_change_password: true },
    });

    if (updateError) {
      return json({ error: updateError.message }, 500);
    }

    return json({ success: true });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
