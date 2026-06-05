import { redirect } from "next/navigation";

// Pengalaman nonton sekarang dipindah ke feed swipe vertikal ala Melolo.
// URL lama /watch/<id>/<ep> tetap valid → diarahkan ke /feed/<id>?ep=<ep>.
export default async function WatchPage(props: PageProps<"/watch/[id]/[ep]">) {
  const { id, ep } = await props.params;
  redirect(`/feed/${id}?ep=${ep}`);
}
