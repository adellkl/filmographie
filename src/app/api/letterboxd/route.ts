import { fetchLetterboxdDiary } from "@/lib/letterboxd";

export async function GET(request: Request) {
  const user =
    new URL(request.url).searchParams.get("user")?.trim() || process.env.NEXT_PUBLIC_LETTERBOXD_USER || "adelkl";
  if (!/^[a-z0-9_-]{1,40}$/i.test(user)) return Response.json({ error: "BAD_USER" }, { status: 400 });
  try {
    const entries = await fetchLetterboxdDiary(user);
    return Response.json({ user, entries });
  } catch (e) {
    return Response.json({ error: String(e), entries: [] }, { status: 502 });
  }
}
