import { assertTableColumns } from "./schemaGuard";

let adminPhase2Ensured = false;

export async function ensureAdminPhase2Tables() {
  if (adminPhase2Ensured) return;

  await Promise.all([
    assertTableColumns({
      table: "admin_message_templates",
      columns: [
        "channel",
        "slug",
        "name",
        "description",
        "subject",
        "body",
        "variables",
        "version",
        "is_active",
        "created_by",
        "updated_by",
        "created_at",
        "updated_at",
      ],
      context: "admin messaging schema validation",
    }),
    assertTableColumns({
      table: "admin_page_metadata",
      columns: [
        "route_path",
        "title",
        "description",
        "og_title",
        "og_description",
        "canonical_url",
        "robots_index",
        "robots_follow",
        "updated_by",
        "updated_at",
      ],
      context: "admin page metadata schema validation",
    }),
    assertTableColumns({
      table: "admin_system_settings",
      columns: ["key", "category", "value", "description", "updated_by", "updated_at"],
      context: "admin system settings schema validation",
    }),
    assertTableColumns({
      table: "admin_page_content",
      columns: ["key", "title", "body", "status", "updated_by", "updated_at"],
      context: "admin page content schema validation",
    }),
    assertTableColumns({
      table: "admin_message_test_logs",
      columns: [
        "channel",
        "template_slug",
        "recipient",
        "status",
        "error_message",
        "payload",
        "created_by",
        "created_at",
      ],
      context: "admin message test log schema validation",
    }),
  ]);

  adminPhase2Ensured = true;
}

export function parseVariables(input) {
  if (Array.isArray(input)) {
    return input
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof input === "string") {
    return input
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function normalizeJsonValue(value, fallback = {}) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value;

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export function renderTemplateString(template, mergeValues = {}) {
  const values = normalizeJsonValue(mergeValues, {});
  return String(template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = values[key];
    return value === null || value === undefined ? `{{${key}}}` : String(value);
  });
}

export function buildTemplatePreview(template, mergeValues = {}) {
  return {
    subject: template.subject ? renderTemplateString(template.subject, mergeValues) : "",
    body: renderTemplateString(template.body, mergeValues),
  };
}
