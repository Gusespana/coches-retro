import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { DEFAULT_DNA } from "@/lib/dna-default";
import { clampDNA, type GameDNA } from "@/lib/dna-schema";

export const runtime = "edge";
export const revalidate = 60; // cache active DNA for 1 minute

/**
 * GET /api/dna
 * Returns the currently active Game DNA.
 * Falls back to DEFAULT_DNA if Supabase is unreachable or empty.
 * Always passes through clampDNA() so the client can trust the response.
 */
export async function GET() {
  if (!supabase) {
    return NextResponse.json(clampDNA(DEFAULT_DNA), {
      headers: { "x-dna-source": "default-no-supabase" },
    });
  }

  try {
    const { data, error } = await supabase
      .from("game_dna")
      .select("dna")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.dna) {
      return NextResponse.json(clampDNA(DEFAULT_DNA), {
        headers: { "x-dna-source": "default-fallback" },
      });
    }

    const dna = clampDNA(data.dna as GameDNA);
    return NextResponse.json(dna, {
      headers: { "x-dna-source": "supabase" },
    });
  } catch {
    return NextResponse.json(clampDNA(DEFAULT_DNA), {
      headers: { "x-dna-source": "default-error" },
    });
  }
}
