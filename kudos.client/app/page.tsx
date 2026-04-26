import HomepageCategorySlideshow from "@/components/HomepageCategorySlideshow";
import HomepageSections from "@/components/HomepageSections";
import { getHomepageCategorySlides } from "@/lib/homepage";
import SponsoredBanner from "@/components/SponsoredBanner";

export default async function HomePage() {
  const data = await getHomepageCategorySlides();

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">
            Discover businesses that<br />
            <span className="hero-accent">deserve recognition</span>
          </h1>
          <p className="hero-subtitle">
            Reputater is where great businesses get the praise they earn. Browse local favorites,
            celebrate standout staff, and share what made your experience special.
          </p>

          <div className="hero-cta">
            <div className="hero-badge">
              <span className="hero-badge-icon">✨</span>
              <span>Only positive reviews allowed — try posting a negative one and see what happens</span>
            </div>
          </div>

        </div>
      </section>

      <main className="page-container">
        <SponsoredBanner placementSlug="homepage-banner" />
        <HomepageCategorySlideshow slides={data.slides} />
        <HomepageSections />
      </main>

      <style>{`
        .hero {
          background: linear-gradient(180deg, var(--color-primary) 0%, #0f3460 100%);
          padding: 64px 24px 56px;
          text-align: center;
        }
        .hero-inner {
          max-width: 720px;
          margin: 0 auto;
        }
        .hero-title {
          color: white;
          font-size: 48px;
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin: 0 0 16px 0;
        }
        .hero-accent {
          color: var(--color-accent);
        }
        .hero-subtitle {
          color: rgba(255,255,255,0.7);
          font-size: 18px;
          line-height: 1.6;
          margin: 0 0 28px 0;
          max-width: 560px;
          margin-left: auto;
          margin-right: auto;
        }
        .hero-cta {
          display: flex;
          justify-content: center;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 999px;
          padding: 10px 20px;
          color: rgba(255,255,255,0.85);
          font-size: 14px;
          font-weight: 500;
          backdrop-filter: blur(4px);
        }
        .hero-badge-icon {
          font-size: 18px;
        }
        @media (max-width: 600px) {
          .hero {
            padding: 40px 16px 36px;
          }
          .hero-title {
            font-size: 32px;
          }
          .hero-subtitle {
            font-size: 16px;
          }
          .hero-badge {
            font-size: 13px;
            padding: 8px 14px;
          }
        }
      `}</style>
    </>
  );
}
