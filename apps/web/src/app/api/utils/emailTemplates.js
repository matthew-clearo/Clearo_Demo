import sql from "./sql";
import { sendTransactionalEmail } from "./email";
import {
  ensureAdminPhase2Tables,
  buildTemplatePreview,
  normalizeJsonValue,
} from "./adminPhase2";

const SYSTEM_EMAIL_TEMPLATES = [
  {
    slug: "booking-confirmation",
    name: "Booking confirmation",
    description: "Sent after a patient creates a booking and needs a secure management link.",
    subject: "Your Clearo booking for {{scan_name}}",
    body: `<p>{{status_intro}}</p><p><strong>{{scan_name}}</strong><br />{{clinic_name}}<br />{{appointment_date}} at {{appointment_time}}</p><p><a href="{{manage_url}}">View or manage your booking</a></p><p>This secure link expires in {{expiry_window}}.</p>`,
    variables: [
      "status_intro",
      "scan_name",
      "clinic_name",
      "appointment_date",
      "appointment_time",
      "manage_url",
      "expiry_window",
    ],
  },
  {
    slug: "booking-rescheduled",
    name: "Booking rescheduled",
    description: "Sent after a patient reschedules an existing booking.",
    subject: "Your Clearo booking has been rescheduled",
    body: `<p>Your {{scan_name}} booking at {{clinic_name}} has been moved to <strong>{{appointment_date}} at {{appointment_time}}</strong>.</p><p><a href="{{manage_url}}">Review the updated booking</a></p><p>This secure link expires in {{expiry_window}}.</p>`,
    variables: [
      "scan_name",
      "clinic_name",
      "appointment_date",
      "appointment_time",
      "manage_url",
      "expiry_window",
    ],
  },
  {
    slug: "booking-auto-cancelled",
    name: "Booking auto-cancelled",
    description: "Sent when a booking is automatically cancelled before the appointment.",
    subject: "Your Clearo booking was cancelled",
    body: `<p>Your {{scan_name}} booking at {{clinic_name}} on {{appointment_date}} at {{appointment_time}} was cancelled automatically because we still needed a reviewed referral before the appointment.</p><p><a href="{{manage_url}}">Review the booking details</a></p><p>If you still need this appointment, please contact the clinic and create a new booking once your referral is ready.</p>`,
    variables: [
      "scan_name",
      "clinic_name",
      "appointment_date",
      "appointment_time",
      "manage_url",
    ],
  },
  {
    slug: "account-verification",
    name: "Account verification",
    description: "Sent when a new account is created or verification is re-requested.",
    subject: "Verify your Clearo account",
    body: `<p>Welcome to Clearo.</p><p>Verify your account by clicking the link below:</p><p><a href="{{verify_url}}">Verify email</a></p><p>This link expires in {{expiry_window}}.</p>`,
    variables: ["verify_url", "expiry_window"],
  },
  {
    slug: "password-reset",
    name: "Password reset",
    description: "Sent when a user requests a password reset.",
    subject: "Reset your Clearo password",
    body: `<p>We received a password reset request.</p><p><a href="{{reset_url}}">Reset password</a></p><p>This link expires in {{expiry_window}}.</p>`,
    variables: ["reset_url", "expiry_window"],
  },
  {
    slug: "clinic-staff-invite",
    name: "Clinic staff invite",
    description: "Sent when a clinic owner or manager invites a clinic employee.",
    subject: "You’ve been invited to a Clearo clinic portal",
    body: `<p>You’ve been invited to join {{clinic_name}} on the Clearo clinic portal{{invited_by_suffix}}.</p><p><a href="{{signup_url}}">Create your clinic account</a></p><p>This invite expires in {{expiry_window}}.</p>`,
    variables: ["clinic_name", "signup_url", "expiry_window", "invited_by_suffix"],
  },
  {
    slug: "clinic-staff-access-granted",
    name: "Clinic staff access granted",
    description: "Sent when an existing clinic user is granted access to another clinic.",
    subject: "Your Clearo clinic access is ready",
    body: `<p>Your access to {{clinic_name}} on the Clearo clinic portal is ready{{invited_by_suffix}}.</p><p><a href="{{signin_url}}">Sign in to the clinic portal</a></p>`,
    variables: ["clinic_name", "signin_url", "invited_by_suffix"],
  },
  {
    slug: "clinic-account-verification",
    name: "Clinic account verification",
    description: "Sent when a clinic user creates a new clinic portal account.",
    subject: "Verify your Clearo clinic account",
    body: `<p>Welcome to the Clearo clinic portal.</p><p>Verify your email by clicking the link below:</p><p><a href="{{verify_url}}">Verify clinic email</a></p><p>This link expires in {{expiry_window}}.</p>`,
    variables: ["verify_url", "expiry_window"],
  },
  {
    slug: "clinic-password-reset",
    name: "Clinic password reset",
    description: "Sent when a clinic user requests a password reset.",
    subject: "Reset your Clearo clinic password",
    body: `<p>We received a clinic portal password reset request.</p><p><a href="{{reset_url}}">Reset password</a></p><p>This link expires in {{expiry_window}}.</p>`,
    variables: ["reset_url", "expiry_window"],
  },
  {
    slug: "referral-reminder",
    name: "Referral reminder",
    description: "Sent by the referral reminder job for pending bookings.",
    subject: "Referral needed for your imaging booking",
    body: `<p>Your booking #{{booking_id}} is awaiting referral review. Please upload your referral as soon as possible.</p>`,
    variables: ["booking_id"],
  },
  {
    slug: "referral-approved",
    name: "Referral approved",
    description: "Sent when a clinic approves a referral.",
    subject: "Your Clearo referral has been approved",
    body: `<p>Good news — your referral has been approved by {{clinic_name}}.</p><p><strong>{{scan_name}}</strong><br />{{appointment_date}} at {{appointment_time}}<br />{{clinic_name}}<br />{{clinic_address}}</p><p>{{clinic_phone_line}}</p><p><a href="{{manage_url}}">View your booking details</a></p><p>{{calendar_link}}</p>`,
    variables: [
      "scan_name",
      "appointment_date",
      "appointment_time",
      "clinic_name",
      "clinic_address",
      "clinic_phone_line",
      "manage_url",
      "calendar_link",
    ],
  },
  {
    slug: "referral-rejected",
    name: "Referral rejected",
    description: "Sent when a clinic rejects a referral.",
    subject: "Your referral was rejected",
    body: `<p>Your referral for booking #{{booking_id}} was rejected by {{clinic_name}}. Please upload an updated referral and contact the clinic{{clinic_phone_suffix}}.</p>`,
    variables: ["booking_id", "clinic_name", "clinic_phone_suffix"],
  },
  {
    slug: "login-otp",
    name: "Login verification code",
    description: "Sent when a patient signs in with credentials. Contains a 6-digit verification code.",
    subject: "Your Clearo verification code: {{otp_code}}",
    body: `<p>Your verification code is:</p><p style="font-size:32px;font-weight:bold;letter-spacing:0.15em;font-family:monospace;color:#1A1A1A;">{{otp_code}}</p><p>Enter this code on the sign-in page to complete your login.</p><p>This code expires in {{expiry_minutes}} minutes. If you did not request this code, you can safely ignore this email.</p>`,
    variables: ["otp_code", "expiry_minutes"],
  },
];

let ensured = false;

export async function ensureSystemEmailTemplates() {
  if (ensured) return;

  await ensureAdminPhase2Tables();

  for (const template of SYSTEM_EMAIL_TEMPLATES) {
    await sql`
      INSERT INTO admin_message_templates (
        channel,
        slug,
        name,
        description,
        subject,
        body,
        variables,
        is_active,
        created_by,
        updated_by
      )
      VALUES (
        'email',
        ${template.slug},
        ${template.name},
        ${template.description},
        ${template.subject},
        ${template.body},
        ${JSON.stringify(template.variables)},
        true,
        'system',
        'system'
      )
      ON CONFLICT (channel, slug) DO UPDATE
      SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        subject = EXCLUDED.subject,
        body = EXCLUDED.body,
        variables = EXCLUDED.variables,
        is_active = EXCLUDED.is_active,
        updated_by = 'system',
        updated_at = NOW(),
        version = CASE
          WHEN admin_message_templates.name IS DISTINCT FROM EXCLUDED.name
            OR admin_message_templates.description IS DISTINCT FROM EXCLUDED.description
            OR admin_message_templates.subject IS DISTINCT FROM EXCLUDED.subject
            OR admin_message_templates.body IS DISTINCT FROM EXCLUDED.body
            OR admin_message_templates.variables IS DISTINCT FROM EXCLUDED.variables
            OR admin_message_templates.is_active IS DISTINCT FROM EXCLUDED.is_active
          THEN admin_message_templates.version + 1
          ELSE admin_message_templates.version
        END
      WHERE
        COALESCE(admin_message_templates.updated_by, admin_message_templates.created_by, 'system') = 'system'
        AND (
          admin_message_templates.name IS DISTINCT FROM EXCLUDED.name
          OR admin_message_templates.description IS DISTINCT FROM EXCLUDED.description
          OR admin_message_templates.subject IS DISTINCT FROM EXCLUDED.subject
          OR admin_message_templates.body IS DISTINCT FROM EXCLUDED.body
          OR admin_message_templates.variables IS DISTINCT FROM EXCLUDED.variables
          OR admin_message_templates.is_active IS DISTINCT FROM EXCLUDED.is_active
        )
    `;
  }

  ensured = true;
}

export async function getEmailTemplate(slug) {
  await ensureSystemEmailTemplates();

  const [template] = await sql`
    SELECT channel, slug, subject, body, variables, is_active
    FROM admin_message_templates
    WHERE channel = 'email' AND slug = ${slug}
    LIMIT 1
  `;

  return template
    ? { ...template, variables: normalizeJsonValue(template.variables, []) }
    : null;
}

export async function sendSystemEmail({ slug, to, mergeValues = {} }) {
  const template = await getEmailTemplate(slug);
  if (!template) {
    throw new Error(`Missing email template: ${slug}`);
  }

  const preview = buildTemplatePreview(template, mergeValues);
  return sendTransactionalEmail({
    to,
    subject: preview.subject,
    html: preview.body,
    text: preview.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
  });
}

export function getSystemEmailSlugs() {
  return SYSTEM_EMAIL_TEMPLATES.map((template) => template.slug);
}
