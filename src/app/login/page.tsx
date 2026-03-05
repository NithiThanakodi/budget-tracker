"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "../../../utils/supabase";

const inputClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export default function LoginPage() {
  const router = useRouter();

  const [nextPath, setNextPath] = useState("/");
  const [accessError, setAccessError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") || "/");
    setAccessError(params.get("error"));
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace(nextPath);
      }
    };
    checkSession();
  }, [router, nextPath]);

  useEffect(() => {
    if (accessError) {
      setError(accessError);
    }
  }, [accessError]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    window.location.assign(nextPath);
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4 dark:from-slate-950 dark:to-slate-900">
      <section className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to access your budget tracker.
        </p>

        {error ? (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={inputClassName}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              className={inputClassName}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </section>
    </div>
  );
}
