import { sqlWithRLS } from "@/app/api/utils/sql";
import { auth } from "@/auth";
import logger from "@/app/api/utils/logger";
import {
  withFullProtection,
  withFullProtectionAndCsrf,
} from "@/app/api/utils/ddosProtection";
import { assertActivePatientAccount } from "@/app/api/utils/patientAccountStatus";

export async function GET(request) {
  return withFullProtection(request, "default", async () => {
    try {
      const session = await auth(request);
      if (!session || !session.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const userId = session.user.id;
      const accountAccess = await assertActivePatientAccount(userId);
      if (!accountAccess.ok) {
        return Response.json(
          { error: accountAccess.error },
          { status: accountAccess.statusCode },
        );
      }

      const [[baseUser]] = await sqlWithRLS(userId, "patient", (tx) => [
        tx`
          SELECT public_id as id, name, email, image, role 
          FROM auth_users 
          WHERE id = ${userId} 
          LIMIT 1
        `,
      ]);
      const user = baseUser
        ? {
            ...baseUser,
            is_staff_admin: false,
            staff_role: null,
          }
        : null;
      return Response.json({ user });
    } catch (err) {
      logger.error({ err }, "GET /api/user/profile error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}

export async function PUT(request) {
  return withFullProtectionAndCsrf(request, "default", async () => {
    try {
      const session = await auth(request);
      if (!session || !session.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const userId = session.user.id;
      const accountAccess = await assertActivePatientAccount(userId);
      if (!accountAccess.ok) {
        return Response.json(
          { error: accountAccess.error },
          { status: accountAccess.statusCode },
        );
      }

      const body = await request.json();
      const { role } = body || {};

      if (!role || role !== "patient") {
        return Response.json(
          { error: "Invalid role. Must be 'patient'" },
          { status: 400 },
        );
      }

      const [[updated]] = await sqlWithRLS(userId, "patient", (tx) => [
        tx`
          UPDATE auth_users 
          SET role = ${role}::user_role
          WHERE id = ${userId}
          RETURNING public_id as id, name, email, image, role
        `,
      ]);
      return Response.json({ user: updated });
    } catch (err) {
      logger.error({ err }, "PUT /api/user/profile error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}
