// Notification de test : envoyée aux appareils de l'utilisateur connecté.
export async function POST(request: Request) {
  const { admin, adminConfigured } = await import("@/lib/admin");
  const { pushConfigured, sendToUser } = await import("@/lib/push-server");
  if (!pushConfigured() || !adminConfigured()) return Response.json({ error: "PUSH_NOT_CONFIGURED" }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    const { uid } = await admin().auth.verifyIdToken(token);
    const r = await sendToUser(uid, { title: "Notifications activées ✓", body: "Tu seras prévenu des sorties et nouveaux épisodes.", url: "/nouveautes", tag: "test" });
    return Response.json(r);
  } catch {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}
