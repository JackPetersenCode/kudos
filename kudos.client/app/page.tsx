import HomepageCategorySlideshow from "@/components/HomepageCategorySlideshow";
import { getHomepageCategorySlides } from "@/lib/homepage";

export default async function HomePage() {
  const data = await getHomepageCategorySlides();

  return (
    <main style={{ padding: 24, maxWidth: 1240, margin: "0 auto" }}>
      <HomepageCategorySlideshow slides={data.slides} />
    </main>
  );
}