/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const sendSystemEmailMock = vi.fn();
const getRequiredPublicAppOriginMock = vi.fn();

vi.mock("@/app/api/utils/emailTemplates", () => ({
  sendSystemEmail: sendSystemEmailMock,
}));

vi.mock("@/utils/siteSurface", () => ({
  getRequiredPublicAppOrigin: getRequiredPublicAppOriginMock,
}));

describe("sendReferralDecisionEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getRequiredPublicAppOriginMock.mockReturnValue("https://www.clearo.com.au");
    sendSystemEmailMock.mockResolvedValue(true);
  });

  it("sends approved referral emails with patient-facing booking details and links", async () => {
    const { sendReferralDecisionEmail } = await import(
      "@/app/api/utils/bookingNotifications"
    );

    await sendReferralDecisionEmail({
      to: "taylor@example.com",
      referralStatus: "approved",
      bookingId: 42,
      bookingPublicId: "7d96a6a4-3097-4882-947c-29be1f265f42",
      scanName: "MRI Brain",
      appointmentDate: "2026-04-01",
      appointmentTime: "09:00:00",
      clinicName: "Northside Imaging",
      clinicAddress: "123 George Street",
      clinicCity: "Sydney",
      clinicState: "NSW",
      clinicZip: "2000",
      clinicPhone: "1300 000 000",
    });

    expect(sendSystemEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "referral-approved",
        to: "taylor@example.com",
        mergeValues: expect.objectContaining({
          scan_name: "MRI Brain",
          clinic_name: "Northside Imaging",
          clinic_address: "123 George Street, Sydney NSW, 2000",
          clinic_phone: "1300 000 000",
          manage_url:
            "https://www.clearo.com.au/account/signin?callbackUrl=%2Fbookings%2Fconfirmation%2F7d96a6a4-3097-4882-947c-29be1f265f42",
          calendar_link: expect.stringContaining("calendar.google.com"),
        }),
      }),
    );
  });
});
