// Télécharge une image TMDB en pleine résolution (les liens cross-origin ignorent l'attribut download).
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const path = sp.get("path") ?? "";
  if (!/^\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(path)) return new Response("Bad path", { status: 400 });
  const name = (sp.get("name") ?? "image").replace(/[^\p{L}\p{N} _-]+/gu, "").trim().slice(0, 80) || "image";
  const res = await fetch(`https://image.tmdb.org/t/p/original${path}`, { next: { revalidate: 86400 } });
  if (!res.ok || !res.body) return new Response("Not found", { status: 404 });
  const ext = path.split(".").pop();
  return new Response(res.body, {
    headers: {
      "content-type": res.headers.get("content-type") ?? "image/jpeg",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${name}.${ext}`)}`,
      "cache-control": "private, max-age=86400",
    },
  });
}
