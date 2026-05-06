import sql from "@/app/api/utils/sql";
import logger from "@/app/api/utils/logger";
import { withFullProtection } from "@/app/api/utils/ddosProtection";
import { requireClinicMembership } from "@/app/api/utils/clinicAuth";

export async function GET(request) {
  return withFullProtection(request, "clinic-admin-read", async () => {
    try {
      const { searchParams } = new URL(request.url, "http://localhost");
      const clinicPublicId = searchParams.get("clinicId");
      const month = searchParams.get("month"); // YYYY-MM

      if (!clinicPublicId || !month) {
        return Response.json(
          { error: "Missing clinicId or month" },
          { status: 400 },
        );
      }

      const membershipResult = await requireClinicMembership(request, clinicPublicId);
      if (membershipResult instanceof Response) return membershipResult;
      const clinicId = membershipResult.clinic.id;

      // Parse month into first and last day
      const [year, mon] = month.split("-").map(Number);
      const startDate = `${year}-${String(mon).padStart(2, "0")}-01`;
      const lastDay = new Date(year, mon, 0).getDate();
      const endDate = `${year}-${String(mon).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      // Slot aggregates per day
      const slotRows = await sql`
        SELECT
          s.slot_date,
          COUNT(*)::int as total_slots,
          SUM(CASE WHEN s.is_available THEN 1 ELSE 0 END)::int as available_slots,
          SUM(CASE WHEN NOT s.is_available THEN 1 ELSE 0 END)::int as booked_slots
        FROM available_slots s
        WHERE s.clinic_id = ${clinicId}
          AND s.slot_date >= ${startDate}
          AND s.slot_date <= ${endDate}
        GROUP BY s.slot_date
        ORDER BY s.slot_date ASC
      `;

      // Booking counts per day (including status breakdown)
      const bookingRows = await sql`
        SELECT
          b.appointment_date,
          COUNT(*)::int as total_bookings,
          SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END)::int as confirmed,
          SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END)::int as pending,
          SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END)::int as cancelled
        FROM bookings b
        WHERE b.clinic_id = ${clinicId}
          AND b.appointment_date >= ${startDate}
          AND b.appointment_date <= ${endDate}
        GROUP BY b.appointment_date
        ORDER BY b.appointment_date ASC
      `;

      // Quick stats: today's bookings, pending referrals, utilization
      const todayISO = new Date().toISOString().slice(0, 10);

      const [todayStats] = await sql`
        SELECT
          COUNT(*)::int as today_bookings,
          SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END)::int as today_confirmed,
          SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END)::int as today_pending
        FROM bookings b
        WHERE b.clinic_id = ${clinicId}
          AND b.appointment_date = ${todayISO}
          AND b.status != 'cancelled'
      `;

      const [pendingReferrals] = await sql`
        SELECT COUNT(*)::int as count
        FROM bookings b
        WHERE b.clinic_id = ${clinicId}
          AND b.referral_status = 'pending_review'
          AND b.status != 'cancelled'
      `;

      const [monthUtilization] = await sql`
        SELECT
          COUNT(*)::int as total_slots,
          SUM(CASE WHEN NOT s.is_available THEN 1 ELSE 0 END)::int as booked_slots
        FROM available_slots s
        WHERE s.clinic_id = ${clinicId}
          AND s.slot_date >= ${startDate}
          AND s.slot_date <= ${endDate}
      `;

      const [upcomingCount] = await sql`
        SELECT COUNT(*)::int as count
        FROM bookings b
        WHERE b.clinic_id = ${clinicId}
          AND b.appointment_date >= ${todayISO}
          AND b.status != 'cancelled'
      `;

      return Response.json({
        slots: slotRows,
        bookings: bookingRows,
        stats: {
          todayBookings: todayStats?.today_bookings || 0,
          todayConfirmed: todayStats?.today_confirmed || 0,
          todayPending: todayStats?.today_pending || 0,
          pendingReferrals: pendingReferrals?.count || 0,
          monthTotalSlots: monthUtilization?.total_slots || 0,
          monthBookedSlots: monthUtilization?.booked_slots || 0,
          upcomingBookings: upcomingCount?.count || 0,
        },
      });
    } catch (err) {
      logger.error({ err }, "GET /api/clinic-admin/slots/calendar error");
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}
