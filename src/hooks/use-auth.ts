import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<"owner" | "professional" | "client" | null>(null);
  useEffect(() => {
    if (!user) { setRole(null); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setRole((data?.role as any) ?? "client");
    });
  }, [user]);
  return role;
}

export async function signOut() {
  await supabase.auth.signOut();
}
