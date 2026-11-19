"use client";
import { useParams } from "next/navigation";
import { MediaDetail } from "@/components/MediaDetail";

export default function FilmPage() {
  const { id } = useParams<{ id: string }>();
  return <MediaDetail type="movie" id={id} />;
}
