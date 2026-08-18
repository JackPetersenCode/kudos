import { Sparkles } from "lucide-react";
import HomepageCategorySlideshow from "@/components/HomepageCategorySlideshow";
import HomepageSections from "@/components/HomepageSections";
import { getHomepageCategorySlides } from "@/lib/homepage";
import SponsoredBanner from "@/components/SponsoredBanner";

export default async function HomePage() {
  let data = { slides: [] as any[] };
  try {
    data = await getHomepageCategorySlides();
  } catch {
    // API unreachable — render page without slides
  }

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
              <span className="hero-badge-icon"><Sparkles size={16} /></span>
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
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(70% 120% at 12% -10%, rgba(240,165,0,0.22) 0%, transparent 55%),
            radial-gradient(55% 110% at 100% 0%, rgba(240,165,0,0.10) 0%, transparent 50%),
            linear-gradient(168deg, #1f1f1f 0%, #101010 100%);
          padding: 76px 24px 68px;
          text-align: center;
        }
        .hero-inner {
          max-width: 740px;
          margin: 0 auto;
          position: relative;
        }
        .hero-title {
          color: #fff;
          font-size: clamp(36px, 5.5vw, 54px);
          font-weight: 800;
          line-height: 1.06;
          letter-spacing: -0.03em;
          margin: 0 0 18px 0;
          text-wrap: balance;
        }
        .hero-accent {
          color: var(--color-accent);
        }
        .hero-subtitle {
          color: rgba(255,255,255,0.74);
          font-size: 18px;
          line-height: 1.6;
          margin: 0 auto 30px;
          max-width: 560px;
        }
        .hero-cta {
          display: flex;
          justify-content: center;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 999px;
          padding: 10px 20px;
          color: rgba(255,255,255,0.9);
          font-size: 14px;
          font-weight: 550;
          backdrop-filter: blur(4px);
        }
        .hero-badge-icon {
          display: inline-flex;
          align-items: center;
          color: var(--color-accent);
        }
        @media (max-width: 600px) {
          .hero {
            padding: 44px 16px 40px;
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
