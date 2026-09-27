import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function encodeGitHubPath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function validBackupPath(path: string) {
  if (!path || path.length > 500) return false;
  if (path.startsWith("/") || path.includes("..")) return false;
  if (path.toLowerCase().startsWith(".github/")) return false;

  const allowedRoots = [
    "historic/",
    "hemeroteca/",
    "minijocs/",
    "home/",
    "calendar/",
    "users/",
    "altres/",
    "_system/",
  ];

  return allowedRoots.some((root) => path.startsWith(root));
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return response({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const githubToken = Deno.env.get("GITHUB_MEDIA_BACKUP_TOKEN");
    const githubOwner = Deno.env.get("GITHUB_MEDIA_BACKUP_OWNER");
    const githubRepo = Deno.env.get("GITHUB_MEDIA_BACKUP_REPO");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!githubToken || !githubOwner || !githubRepo || !supabaseUrl || !serviceRoleKey) {
      return response({ ok: false, error: "MISSING_SERVER_CONFIGURATION" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return response({ ok: false, error: "AUTH_REQUIRED" }, 401);
    }

    const jwt = authHeader.replace("Bearer ", "").trim();
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      return response({ ok: false, error: "INVALID_USER" }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,email,name")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return response({ ok: false, error: "PROFILE_NOT_FOUND" }, 403);
    }
    if (!["admin", "gestor"].includes(profile.role)) {
      return response({ ok: false, error: "PERMISSION_DENIED" }, 403);
    }

    const body = await req.json();
    const bucket = String(body.bucket || "").trim();
    const objectPath = String(body.objectPath || "").trim();
    const githubPath = String(body.githubPath || "").trim();

    if (!bucket || !objectPath || !githubPath) {
      return response({ ok: false, error: "MISSING_PARAMETERS" }, 400);
    }
    if (bucket !== "media-backup-staging") {
      return response({ ok: false, error: "INVALID_BUCKET" }, 400);
    }
    if (!validBackupPath(githubPath)) {
      return response({ ok: false, error: "INVALID_BACKUP_PATH" }, 400);
    }

    const { data: storedFile, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(objectPath);

    if (downloadError || !storedFile) {
      return response({
        ok: false,
        error: "STORAGE_DOWNLOAD_FAILED",
        details: downloadError?.message || null,
      }, 500);
    }

    const arrayBuffer = await storedFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (!bytes.length) return response({ ok: false, error: "EMPTY_FILE" }, 400);

    const encodedPath = encodeGitHubPath(githubPath);
    const githubApiUrl = `https://api.github.com/repos/${encodeURIComponent(githubOwner)}/${encodeURIComponent(githubRepo)}/contents/${encodedPath}`;
    const githubHeaders = {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${githubToken}`,
      "X-GitHub-Api-Version": "2026-03-10",
      "User-Agent": "BandaDeLaCala-MediaBackup",
    };

    const existingResponse = await fetch(githubApiUrl, {
      method: "GET",
      headers: githubHeaders,
    });

    if (existingResponse.ok) {
      const { error: cleanupError } = await supabase.storage
        .from(bucket)
        .remove([objectPath]);

      return response({
        ok: true,
        alreadyBackedUp: true,
        backup: { repository: `${githubOwner}/${githubRepo}`, path: githubPath },
        stagingRemoved: !cleanupError,
        cleanupError: cleanupError?.message || null,
      });
    }

    if (existingResponse.status !== 404) {
      const details = await existingResponse.text();
      return response({
        ok: false,
        error: "GITHUB_CHECK_FAILED",
        status: existingResponse.status,
        details,
      }, 502);
    }

    const base64Content = bytesToBase64(bytes);
    const commitMessage = `Backup media · ${githubPath} · ${new Date().toISOString()}`;
    const githubResponse = await fetch(githubApiUrl, {
      method: "PUT",
      headers: { ...githubHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ message: commitMessage, content: base64Content }),
    });
    const githubResult = await githubResponse.json();

    if (!githubResponse.ok) {
      return response({
        ok: false,
        error: "GITHUB_UPLOAD_FAILED",
        status: githubResponse.status,
        details: githubResult,
      }, 502);
    }

    const githubSha = githubResult?.content?.sha || null;
    const { error: cleanupError } = await supabase.storage
      .from(bucket)
      .remove([objectPath]);

    return response({
      ok: true,
      alreadyBackedUp: false,
      backup: {
        repository: `${githubOwner}/${githubRepo}`,
        path: githubPath,
        bytes: bytes.length,
        sha: githubSha,
      },
      uploadedBy: { userId: user.id, role: profile.role },
      stagingRemoved: !cleanupError,
      cleanupError: cleanupError?.message || null,
    });
  } catch (error) {
    console.error("backup-band-media:", error);
    return response({
      ok: false,
      error: "UNEXPECTED_ERROR",
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
