import { GalleryPage, type GalleryPageProps } from "@/components/GalleryPage";
export const dynamic = "force-dynamic";
export default function Page(props: GalleryPageProps) {
  return <GalleryPage {...props} mode="salon" />;
}
