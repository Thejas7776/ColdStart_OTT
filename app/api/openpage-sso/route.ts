import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.redirect(
      "https://cold-start-ott.vercel.app/login"
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return NextResponse.redirect(
      "https://cold-start-ott.vercel.app/home"
    );
  }

  // Admin verification is complete.
  // The secure OpenPage handoff will be added in the next step.
  return NextResponse.json({
    message: "ColdStar admin verified",
    email: user.email,
  });
}