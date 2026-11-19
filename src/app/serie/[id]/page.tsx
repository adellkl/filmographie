"use client";
import { useParams } from "next/navigation";
import { MediaDetail } from "@/components/MediaDetail";

export default function SeriePage() {
  const { id } = useParams<{ id: string }>();
  return <MediaDetail type="tv" id={id} />;
}
