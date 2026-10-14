import type { NextRequest } from "next/server";
import { getAdminAccess } from "@/data/auth";
import { REQUEST_PHOTOS_BUCKET } from "@/data/requests";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound() {
  return new Response("Introuvable", { status: 404, headers: { "cache-control": "no-store" } });
}

// Photo jointe à une demande (bucket privé, CAHIER §12.1) : servie
// uniquement à l'admin connecté. Rien n'indique à un visiteur si la photo
// existe.
export async function GET(_request: NextRequest, ctx: RouteContext<"/admin/demandes/photo/[photoId]">) {
  const { photoId } = await ctx.params;
  if (!UUID.test(photoId)) return notFound();
  const access = await getAdminAccess();
  if (access.status !== "admin") return notFound();

  // Lecture avec la session (droits vérifiés par la base), puis fichier
  // téléchargé avec la clé serveur.
  const supabase = await createClient();
  const { data: photo } = await supabase.from("contact_request_photos").select("storage_path").eq("id", photoId).maybeSingle();
  if (!photo) return notFound();
  const { data: file, error } = await createAdminClient().storage.from(REQUEST_PHOTOS_BUCKET).download(photo.storage_path as string);
  if (error || !file) {
    console.error("Photo de demande", error?.message);
    return notFound();
  }
  return new Response(file, {
    headers: {
      "content-type": "image/webp",
      "content-disposition": "inline",
      // Gardée en mémoire du navigateur de l'admin seulement, jamais par un cache partagé.
      "cache-control": "private, max-age=600",
    },
  });
}
