/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const requireClinicMembershipMock = vi.fn();
const createClinicInvitationMock = vi.fn();
const resendClinicInvitationMock = vi.fn();
const revokeClinicInvitationMock = vi.fn();
const setClinicMembershipStatusMock = vi.fn();
const transferClinicOwnershipMock = vi.fn();
const updateClinicMembershipRoleMock = vi.fn();

vi.mock("@/app/api/utils/ddosProtection", () => ({
  withFullProtection: async (_request, _key, handler) => handler(),
  withFullProtectionAndCsrf: async (_request, _key, handler) => handler(),
}));

vi.mock("@/app/api/utils/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock("@/app/api/utils/clinicAuth", () => ({
  requireClinicMembership: requireClinicMembershipMock,
}));

vi.mock("@/app/api/utils/clinicInvitations", () => ({
  createClinicInvitation: createClinicInvitationMock,
  listClinicTeam: vi.fn(),
  resendClinicInvitation: resendClinicInvitationMock,
  revokeClinicInvitation: revokeClinicInvitationMock,
  setClinicMembershipStatus: setClinicMembershipStatusMock,
  transferClinicOwnership: transferClinicOwnershipMock,
  updateClinicMembershipRole: updateClinicMembershipRoleMock,
}));

describe("/api/clinic/invitations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("prevents managers from inviting owner role", async () => {
    requireClinicMembershipMock.mockResolvedValue({
      clinic: { id: 10 },
      clinicUser: { id: 20 },
      membership: { role: "manager" },
    });

    const { POST } = await import("@/app/api/clinic/invitations/route");
    const request = new Request("http://localhost/api/clinic/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinicId: "11111111-1111-4111-8111-111111111111",
        email: "owner@example.com",
        role: "owner",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(createClinicInvitationMock).not.toHaveBeenCalled();
  });

  it("returns the promoted-user message when an existing clinic user is granted access", async () => {
    requireClinicMembershipMock.mockResolvedValue({
      clinic: { id: 10 },
      clinicUser: { id: 20 },
      membership: { role: "owner" },
    });
    createClinicInvitationMock.mockResolvedValue({
      invite: { id: 30 },
      existingUserPromoted: true,
    });

    const { POST } = await import("@/app/api/clinic/invitations/route");
    const request = new Request("http://localhost/api/clinic/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinicId: "11111111-1111-4111-8111-111111111111",
        email: "staff@example.com",
        role: "staff",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.existingUserPromoted).toBe(true);
    expect(body.message).toContain("Existing clinic user added");
  });

  it("maps last-owner protection to a 409 response", async () => {
    requireClinicMembershipMock.mockResolvedValue({
      clinic: { id: 10 },
      clinicUser: { id: 20 },
      membership: { id: 1, role: "owner" },
    });
    setClinicMembershipStatusMock.mockRejectedValue(new Error("LastOwnerProtected"));

    const { PATCH } = await import("@/app/api/clinic/invitations/route");
    const request = new Request("http://localhost/api/clinic/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinicId: "11111111-1111-4111-8111-111111111111",
        action: "disable_member",
        membershipId: 77,
      }),
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("You cannot remove the last active clinic owner.");
  });

  it("allows ownership transfer for a valid target member", async () => {
    requireClinicMembershipMock.mockResolvedValue({
      clinic: { id: 10 },
      clinicUser: { id: 20 },
      membership: { id: 1, role: "owner" },
    });
    transferClinicOwnershipMock.mockResolvedValue({
      id: 77,
      clinic_user_id: 88,
      role: "owner",
    });

    const { PATCH } = await import("@/app/api/clinic/invitations/route");
    const request = new Request("http://localhost/api/clinic/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinicId: "11111111-1111-4111-8111-111111111111",
        action: "transfer_ownership",
        membershipId: 77,
      }),
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(transferClinicOwnershipMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 10,
        membershipId: 77,
        clinicUserId: 20,
      }),
    );
  });
});
