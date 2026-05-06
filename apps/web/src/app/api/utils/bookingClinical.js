import sql from "@/app/api/utils/sql";
import { assertTableColumns } from "./schemaGuard";
import {
  DEFAULT_PREP_BY_MODALITY,
  getDefaultSafetyQuestionsByModality,
  inferScanModality,
} from "@/utils/bookingSafety";

let ensureColumnsPromise = null;

export async function ensureClinicalBookingColumns() {
  if (!ensureColumnsPromise) {
    ensureColumnsPromise = (async () => {
      await Promise.all([
        assertTableColumns({
          table: "bookings",
          columns: [
            "referral_status",
            "consent_given_at",
            "consent_ip",
            "referral_reminder_sent_at",
            "safety_review_status",
            "safety_block_reasons",
            "cancelled_at",
            "updated_at",
            "manage_token",
            "manage_token_expires_at",
          ],
          context: "clinical booking schema validation",
        }),
        assertTableColumns({
          table: "scan_types",
          columns: ["requires_referral", "prep_instructions", "safety_question_set"],
          context: "scan type clinical defaults validation",
        }),
        assertTableColumns({
          table: "clinic_scans",
          columns: ["requires_referral", "prep_instructions"],
          context: "clinic scan override validation",
        }),
      ]);
    })().catch((err) => {
      ensureColumnsPromise = null;
      throw err;
    });
  }
  return ensureColumnsPromise;
}

let backfillPromise = null;

export async function backfillScanTypeClinicalDefaults() {
  if (!backfillPromise) {
    backfillPromise = (async () => {
      const scanTypes = await sql`
        SELECT id, name, requires_referral, prep_instructions, safety_question_set
        FROM scan_types
      `;

      for (const st of scanTypes) {
        const modality = inferScanModality(st.name);
        const defaultRequiresReferral = modality === "mri" || modality === "ct";
        const defaultPrep =
          DEFAULT_PREP_BY_MODALITY[modality] || DEFAULT_PREP_BY_MODALITY.default;
        const defaultSafety = getDefaultSafetyQuestionsByModality(modality);

        if (st.requires_referral === null || st.requires_referral === undefined) {
          await sql`
            UPDATE scan_types
            SET requires_referral = ${defaultRequiresReferral}
            WHERE id = ${st.id}
          `;
        }

        if (!st.prep_instructions) {
          await sql`
            UPDATE scan_types
            SET prep_instructions = ${defaultPrep}
            WHERE id = ${st.id}
          `;
        }

        if (!st.safety_question_set) {
          await sql`
            UPDATE scan_types
            SET safety_question_set = ${JSON.stringify(defaultSafety)}::jsonb
            WHERE id = ${st.id}
          `;
        }
      }
    })().catch((err) => {
      backfillPromise = null;
      throw err;
    });
  }
  return backfillPromise;
}

export function getClientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")?.[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

export function deriveReferralStatus({ requiresReferral, hasReferralUrl }) {
  if (!requiresReferral) {
    return hasReferralUrl ? "uploaded" : "not_required";
  }
  return "pending_review";
}

export function deriveBookingStatus({ requiresReferral }) {
  return requiresReferral ? "pending" : "confirmed";
}
