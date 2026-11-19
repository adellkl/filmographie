"use client";

import { useParams } from "next/navigation";
import { PublicLibraryProvider } from "@/lib/public-library";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { handle } = useParams<{ handle: string }>();
  return <PublicLibraryProvider handle={decodeURIComponent(handle)}>{children}</PublicLibraryProvider>;
}
