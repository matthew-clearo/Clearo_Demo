import { sendSystemEmail } from "./emailTemplates";
import { getRequiredPublicAppOrigin } from "@/utils/siteSurface";

function getPatientAppBaseUrl() {
  return getRequiredPublicAppOrigin();
}

export function buildBookingConfirmationUrl(bookingPublicId) {
  return `${getPatientAppBaseUrl()}/bookings/confirmation/${encodeURIComponent(bookingPublicId)}`;
}

export function buildBookingManageUrl(bookingPublicId, _manageToken) {
  // Security: route through sign-in instead of embedding a bearer token in
  // the URL.  The user must authenticate before viewing booking details.
  const confirmationPath = `/bookings/confirmation/${encodeURIComponent(bookingPublicId)}`;
  return `${getPatientAppBaseUrl()}/account/signin?callbackUrl=${encodeURIComponent(confirmationPath)}`;
}

function formatClinicAddress({
  clinicAddress,
  clinicCity,
  clinicState,
  clinicZip,
}) {
  const parts = [
    clinicAddress,
    [clinicCity, clinicState].filter(Boolean).join(" ").trim(),
    clinicZip,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return parts.join(", ");
}

function buildGoogleCalendarUrl({
  bookingPublicId,
  scanName,
  clinicName,
  appointmentDate,
  appointmentTime,
  clinicAddress,
  clinicCity,
  clinicState,
  clinicZip,
}) {
  if (!bookingPublicId || !appointmentDate || !appointmentTime) {
    return "";
  }

  const start = `${String(appointmentDate).slice(0, 10)}T${String(appointmentTime).slice(0, 8)}`;
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    return "";
  }

  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  const calendarStamp = (value) =>
    value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  const details = [
    `View your booking details: ${buildBookingManageUrl(bookingPublicId)}`,
    "",
    "If you need to make changes, sign in to Clearo before your appointment.",
  ].join("\n");

  const location = [clinicName, formatClinicAddress({
    clinicAddress,
    clinicCity,
    clinicState,
    clinicZip,
  })]
    .filter(Boolean)
    .join(", ");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${scanName || "Imaging appointment"} at ${clinicName || "your clinic"}`,
    dates: `${calendarStamp(startDate)}/${calendarStamp(endDate)}`,
    details,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatAppointmentDate(dateValue) {
  if (!dateValue) return "";

  const normalized =
    typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
      ? `${dateValue}T00:00:00`
      : dateValue;

  return new Date(normalized).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatAppointmentTime(timeValue) {
  if (!timeValue) return "";

  const normalized =
    typeof timeValue === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(timeValue)
      ? `1970-01-01T${timeValue}`
      : timeValue;

  return new Date(normalized).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getBookingStatusIntro({
  clinicName,
  appointmentDate,
  appointmentTime,
  referralStatus,
  safetyReviewStatus,
}) {
  if (safetyReviewStatus === "blocked") {
    return `We received your booking request for ${clinicName} on ${appointmentDate} at ${appointmentTime}, but it needs manual review before it can be confirmed.`;
  }

  if (safetyReviewStatus === "requires_review" || referralStatus === "pending_review") {
    return `We received your booking request for ${clinicName} on ${appointmentDate} at ${appointmentTime}. It is currently pending review.`;
  }

  return `Your booking at ${clinicName} on ${appointmentDate} at ${appointmentTime} is confirmed.`;
}

export async function sendBookingConfirmationEmail({
  to,
  bookingPublicId,
  manageToken,
  clinicName,
  scanName,
  appointmentDate,
  appointmentTime,
  referralStatus,
  safetyReviewStatus,
  expiryWindow = "7 days",
}) {
  return sendSystemEmail({
    slug: "booking-confirmation",
    to,
    mergeValues: {
      status_intro: getBookingStatusIntro({
        clinicName,
        appointmentDate: formatAppointmentDate(appointmentDate),
        appointmentTime: formatAppointmentTime(appointmentTime),
        referralStatus,
        safetyReviewStatus,
      }),
      scan_name: scanName,
      clinic_name: clinicName,
      appointment_date: formatAppointmentDate(appointmentDate),
      appointment_time: formatAppointmentTime(appointmentTime),
      manage_url: buildBookingManageUrl(bookingPublicId, manageToken),
      expiry_window: expiryWindow,
    },
  });
}

export async function sendBookingRescheduledEmail({
  to,
  bookingPublicId,
  manageToken,
  clinicName,
  scanName,
  appointmentDate,
  appointmentTime,
  expiryWindow = "7 days",
}) {
  return sendSystemEmail({
    slug: "booking-rescheduled",
    to,
    mergeValues: {
      scan_name: scanName,
      clinic_name: clinicName,
      appointment_date: formatAppointmentDate(appointmentDate),
      appointment_time: formatAppointmentTime(appointmentTime),
      manage_url: buildBookingManageUrl(bookingPublicId, manageToken),
      expiry_window: expiryWindow,
    },
  });
}

export async function sendBookingAutoCancelledEmail({
  to,
  bookingPublicId,
  manageToken,
  clinicName,
  scanName,
  appointmentDate,
  appointmentTime,
}) {
  return sendSystemEmail({
    slug: "booking-auto-cancelled",
    to,
    mergeValues: {
      scan_name: scanName,
      clinic_name: clinicName,
      appointment_date: formatAppointmentDate(appointmentDate),
      appointment_time: formatAppointmentTime(appointmentTime),
      manage_url: buildBookingManageUrl(bookingPublicId, manageToken),
    },
  });
}

export async function sendReferralDecisionEmail({
  to,
  referralStatus,
  bookingId,
  bookingPublicId,
  scanName = "",
  appointmentDate = "",
  appointmentTime = "",
  clinicName,
  clinicAddress = "",
  clinicCity = "",
  clinicState = "",
  clinicZip = "",
  clinicPhone = "",
}) {
  if (referralStatus !== "approved" && referralStatus !== "rejected") {
    return false;
  }

  const formattedClinicAddress = formatClinicAddress({
    clinicAddress,
    clinicCity,
    clinicState,
    clinicZip,
  });
  const manageUrl = bookingPublicId
    ? buildBookingManageUrl(bookingPublicId)
    : getPatientAppBaseUrl();
  const calendarUrl = buildGoogleCalendarUrl({
    bookingPublicId,
    scanName,
    clinicName,
    appointmentDate,
    appointmentTime,
    clinicAddress,
    clinicCity,
    clinicState,
    clinicZip,
  });

  return sendSystemEmail({
    slug: referralStatus === "approved" ? "referral-approved" : "referral-rejected",
    to,
    mergeValues: {
      booking_id: bookingId,
      scan_name: scanName,
      appointment_date: formatAppointmentDate(appointmentDate),
      appointment_time: formatAppointmentTime(appointmentTime),
      clinic_name: clinicName,
      clinic_address: formattedClinicAddress,
      clinic_phone: clinicPhone,
      clinic_phone_suffix: clinicPhone ? ` at ${clinicPhone}` : "",
      clinic_phone_line: clinicPhone ? `Phone: <a href="tel:${clinicPhone}">${clinicPhone}</a>` : "",
      manage_url: manageUrl,
      calendar_link: calendarUrl
        ? `<a href="${calendarUrl}">Add this appointment to your calendar</a>`
        : "",
    },
  });
}
