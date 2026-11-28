// Vexora Studio — Enterprise Admin Gateway (Supabase Edge Function)
// Enforces server-side JWT verification, RBAC permissions (Owner / Super Admin / Admin / Editor / Support),
// login/audit logging, database health/metrics, admin account management, and optional CI/CD deploy webhook.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const VALID_ROLES = ["owner", "super_admin", "admin", "editor", "support"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonRes({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonRes({ error: "Server secrets SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing.", errorCode: "unconfigured" }, 503);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return jsonRes({ error: "Missing bearer token.", errorCode: "unauthorized" }, 401);
    }

    const adminSb = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userErr } = await adminSb.auth.getUser(token);
    if (userErr || !userData?.user) {
      return jsonRes({ error: "Invalid or expired session.", errorCode: "unauthorized" }, 401);
    }

    const caller = userData.user;
    const { data: adminRow } = await adminSb
      .from("admin_users")
      .select("user_id, email, full_name, role, is_active")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!adminRow || !adminRow.is_active) {
      await adminSb.from("login_logs").insert({
        id: `login_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        email: caller.email || "",
        user_id: caller.id,
        role: adminRow?.role || "none",
        status: "blocked",
        reason: "Account inactive or not listed in admin_users",
        user_agent: (req.headers.get("user-agent") || "").slice(0, 180)
      });
      return jsonRes({ error: "Access denied: inactive or unauthorized admin account.", errorCode: "forbidden" }, 403);
    }

    const callerRole = String(adminRow.role);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim();

    async function writeAudit(act: string, resourceType: string, resourceId: string, details: Record<string, unknown> = {}) {
      await adminSb.from("audit_logs").insert({
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        actor_user_id: caller.id,
        actor_email: adminRow?.email || caller.email || "",
        actor_role: callerRole,
        action: act,
        resource_type: resourceType,
        resource_id: resourceId,
        details
      });
    }

    if (action === "get_overview_metrics") {
      const [
        usersRes,
        clientsRes,
        projectsRes,
        reqsRes,
        msgsRes,
        analyticsRes,
        aiRes,
        auditRes,
        loginRes,
        adminsRes
      ] = await Promise.all([
        adminSb.from("client_profiles").select("*", { count: "exact", head: true }),
        adminSb.from("client_profiles").select("user_id,full_name,email,company,phone,status,internal_notes,created_at").order("created_at", { ascending: false }).limit(500),
        adminSb.from("projects").select("id,status"),
        adminSb.from("project_requests").select("id,status,created_at"),
        adminSb.from("contact_messages").select("id,status,priority,ticket_type,created_at"),
        adminSb.from("analytics_events").select("event_type,route,referrer_source,created_at").order("created_at", { ascending: false }).limit(2000),
        adminSb.from("ai_logs").select("id,user_lang,status,latency_ms,tokens_estimated,model,error_code,error_message,prompt_preview,created_at").order("created_at", { ascending: false }).limit(500),
        adminSb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
        adminSb.from("login_logs").select("*").order("created_at", { ascending: false }).limit(200),
        adminSb.from("admin_users").select("user_id,email,full_name,role,is_active,last_login_at,created_at").order("created_at", { ascending: true })
      ]);

      return jsonRes({
        ok: true,
        caller: adminRow,
        counts: {
          registeredClients: usersRes.count || 0,
          projectsTotal: projectsRes.data?.length || 0,
          requestsTotal: reqsRes.data?.length || 0,
          messagesTotal: msgsRes.data?.length || 0
        },
        clients: clientsRes.data || [],
        analyticsEvents: analyticsRes.data || [],
        aiLogs: aiRes.data || [],
        auditLogs: auditRes.data || [],
        loginLogs: loginRes.data || [],
        adminUsers: adminsRes.data || []
      });
    }

    if (action === "upsert_admin_user") {
      if (!["owner", "super_admin"].includes(callerRole)) {
        return jsonRes({ error: "Requires Owner or Super Admin role.", errorCode: "forbidden" }, 403);
      }
      const targetEmail = String(body?.email || "").trim().toLowerCase();
      const targetRole = String(body?.role || "editor").trim();
      const targetName = String(body?.fullName || "").trim();
      const isActive = body?.isActive !== false;
      if (!targetEmail.includes("@") || !VALID_ROLES.includes(targetRole)) {
        return jsonRes({ error: "Invalid email or role." }, 400);
      }
      if (targetRole === "owner" && callerRole !== "owner") {
        return jsonRes({ error: "Only the Owner can assign Owner role." }, 403);
      }

      // Find existing Supabase Auth user by email
      const { data: listed } = await adminSb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const matchedUser = (listed?.users || []).find((u) => (u.email || "").toLowerCase() === targetEmail);
      if (!matchedUser) {
        return jsonRes({ error: "User must first register in Auth / Client Portal before receiving admin permissions." }, 404);
      }

      // Prevent removing or disabling last active owner
      if (matchedUser.id === caller.id && callerRole === "owner" && (!isActive || targetRole !== "owner")) {
        return jsonRes({ error: "Cannot demote or disable the active Owner account." }, 400);
      }

      const { error: upErr } = await adminSb.from("admin_users").upsert({
        user_id: matchedUser.id,
        email: targetEmail,
        full_name: targetName || matchedUser.user_metadata?.full_name || targetEmail.split("@")[0],
        role: targetRole,
        is_active: isActive,
        created_by: caller.id
      });
      if (upErr) return jsonRes({ error: upErr.message }, 500);

      await writeAudit("upsert_admin_user", "admin_users", matchedUser.id, { targetEmail, targetRole, isActive });
      return jsonRes({ ok: true });
    }

    if (action === "toggle_client_status") {
      if (!["owner", "super_admin", "admin", "support"].includes(callerRole)) {
        return jsonRes({ error: "Insufficient role.", errorCode: "forbidden" }, 403);
      }
      const targetUserId = String(body?.userId || "").trim();
      const status = body?.status === "disabled" ? "disabled" : "active";
      const internalNotes = typeof body?.internalNotes === "string" ? body.internalNotes : undefined;
      if (!targetUserId) return jsonRes({ error: "Missing userId" }, 400);

      const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (internalNotes !== undefined) patch.internal_notes = internalNotes;

      const { error: clErr } = await adminSb.from("client_profiles").update(patch).eq("user_id", targetUserId);
      if (clErr) return jsonRes({ error: clErr.message }, 500);

      await writeAudit("update_client_profile", "client_profiles", targetUserId, { status });
      return jsonRes({ ok: true });
    }

    if (action === "get_db_health") {
      if (!["owner", "super_admin", "admin"].includes(callerRole)) {
        return jsonRes({ error: "Insufficient role.", errorCode: "forbidden" }, 403);
      }
      const tables = [
        "site_settings",
        "services",
        "projects",
        "team_members",
        "knowledge_base",
        "faqs",
        "client_profiles",
        "project_requests",
        "contact_messages",
        "updates_feed",
        "site_releases",
        "analytics_events",
        "audit_logs",
        "login_logs",
        "ai_logs",
        "admin_users"
      ];
      const counts = await Promise.all(
        tables.map(async (tbl) => {
          const { count, error } = await adminSb.from(tbl).select("*", { count: "exact", head: true });
          return { table: tbl, rows: error ? null : (count || 0), ok: !error, error: error?.message || "" };
        })
      );
      return jsonRes({ ok: true, tables: counts, checkedAt: new Date().toISOString() });
    }

    if (action === "purge_telemetry_logs") {
      if (callerRole !== "owner" || body?.confirmPhrase !== "OWNER_CONFIRM_PURGE") {
        return jsonRes({ error: "Only Owner with explicit confirmation can purge telemetry logs.", errorCode: "forbidden" }, 403);
      }
      const targetTable = String(body?.table || "");
      if (!["analytics_events", "ai_logs"].includes(targetTable)) {
        return jsonRes({ error: "Only analytics_events or ai_logs can be purged." }, 400);
      }
      const { error } = await adminSb.from(targetTable).delete().neq("id", "");
      if (error) return jsonRes({ error: error.message }, 500);

      await writeAudit("purge_telemetry_logs", targetTable, "all", {});
      return jsonRes({ ok: true });
    }

    if (action === "trigger_release_webhook") {
      if (!["owner", "super_admin"].includes(callerRole)) {
        return jsonRes({ error: "Only Owner or Super Admin can trigger deployment webhooks.", errorCode: "forbidden" }, 403);
      }
      const webhookUrl = Deno.env.get("GITHUB_DEPLOY_HOOK_URL") || "";
      const webhookToken = Deno.env.get("GITHUB_DEPLOY_TOKEN") || "";
      if (!webhookUrl) {
        return jsonRes({
          ok: false,
          configured: false,
          message: "No server-side GITHUB_DEPLOY_HOOK_URL secret configured. Release saved in database changelog."
        }, 200);
      }
      const hookRes = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {})
        },
        body: JSON.stringify({
          event_type: "vexora_release",
          version: String(body?.version || ""),
          deploy_target: String(body?.deployTarget || "github_pages"),
          triggered_by: adminRow.email
        })
      });
      await writeAudit("trigger_release_webhook", "site_releases", String(body?.version || ""), { status: hookRes.status });
      return jsonRes({ ok: hookRes.ok, configured: true, status: hookRes.status });
    }

    return jsonRes({ error: "Unknown admin action." }, 400);
  } catch (err) {
    return jsonRes({ error: String(err), errorCode: "server" }, 500);
  }
});

function jsonRes(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
