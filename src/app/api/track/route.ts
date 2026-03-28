import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const type = request.nextUrl.searchParams.get("type");
    const supabase = createAdminClient();

    if (type === "share") {
      // Track share event
      await supabase.from("share_events").insert({
        article_id: body.article_id,
        platform: body.platform,
      });
    } else if (type === "scroll") {
      // Update scroll depth for existing page view
      await supabase
        .from("page_views")
        .update({ scroll_depth: body.scroll_depth })
        .eq("session_id", body.session_id)
        .eq("article_id", body.article_id)
        .order("created_at", { ascending: false })
        .limit(1);
    } else {
      // Track page view
      await supabase.from("page_views").insert({
        article_id: body.article_id,
        path: body.path,
        referrer: body.referrer,
        utm_source: body.utm_source,
        utm_medium: body.utm_medium,
        utm_campaign: body.utm_campaign,
        worker_id: body.worker_id,
        user_agent: body.user_agent,
        device_type: body.device_type,
        session_id: body.session_id,
      });

      // Increment article view count
      if (body.article_id) {
        try {
          await supabase
            .from("articles")
            .update({ view_count: body.article_id })
            .eq("id", body.article_id);
          // Note: In production, use an RPC for atomic increment.
          // For now, view_count is tracked via page_views table aggregation.
        } catch {
          // Ignore - tracking should never fail the request
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Never fail tracking
  }
}
