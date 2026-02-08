"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabase } from "@/lib/supabase";

const USER_ID_KEY = "superbowl2026_user_id";
const STARTING_BALANCE = 100;

interface ExistingUser {
  id: string;
  balance: number;
  display_name: string;
}

const LoginPage = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [existingUser, setExistingUser] = useState<ExistingUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlay = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Check if user exists
      const { data: existing } = await getSupabase()
        .from("users")
        .select("id, balance, display_name")
        .eq("display_name", trimmed)
        .single();

      if (existing) {
        // Show welcome back screen
        setExistingUser({
          id: existing.id,
          balance: Number(existing.balance),
          display_name: existing.display_name,
        });
      } else {
        // Create new user
        const { data: newUser, error: insertErr } = await getSupabase()
          .from("users")
          .insert({ display_name: trimmed, balance: STARTING_BALANCE })
          .select("id")
          .single();

        if (insertErr) throw insertErr;

        localStorage.setItem(USER_ID_KEY, newUser.id);
        router.push("/");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (!existingUser) return;
    localStorage.setItem(USER_ID_KEY, existingUser.id);
    router.push("/");
  };

  const handleGoBack = () => {
    setExistingUser(null);
    setName("");
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md border-border/50 bg-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Super Bowl LX</CardTitle>
          <p className="text-sm text-muted-foreground">
            Seahawks vs Patriots — Feb 8, 2026
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {existingUser ? (
            // Welcome back screen
            <div className="space-y-4">
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center">
                <p className="text-lg font-semibold">
                  Welcome back, {existingUser.display_name}!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your balance is{" "}
                  <span className="text-green-400 font-bold">
                    ${existingUser.balance.toFixed(2)}
                  </span>
                </p>
              </div>
              <Button
                onClick={handleContinue}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                Continue
              </Button>
              <Button
                onClick={handleGoBack}
                variant="ghost"
                className="w-full text-muted-foreground"
              >
                Not you? Go back
              </Button>
            </div>
          ) : (
            // Name entry screen
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="display-name"
                  className="block text-sm font-medium mb-2"
                >
                  Enter your display name
                </label>
                <Input
                  id="display-name"
                  type="text"
                  placeholder="e.g. BigBetBob"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePlay()}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button
                onClick={handlePlay}
                disabled={!name.trim() || isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {isSubmitting ? "Loading..." : "Play"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                New players start with $100.00
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
