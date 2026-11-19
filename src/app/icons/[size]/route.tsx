import { appIcon } from "@/lib/app-icon";

const SIZES = new Set([192, 512]);

export async function GET(request: Request, ctx: RouteContext<"/icons/[size]">) {
  const size = Number((await ctx.params).size);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  const maskable = new URL(request.url).searchParams.get("maskable") === "1";
  const res = appIcon(size, maskable);
  res.headers.set("cache-control", "public, max-age=604800, immutable");
  return res;
}
