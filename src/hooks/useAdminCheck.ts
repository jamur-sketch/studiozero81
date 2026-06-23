import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useAdminCheck() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return; // wait for auth to resolve first

    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data, error }) => {
        if (error) console.error("Admin check error:", error);
        setIsAdmin(!!data);
        setLoading(false);
      });
  }, [user, authLoading]);

  return { isAdmin, loading };
}
