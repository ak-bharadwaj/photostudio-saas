import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Studio booking page";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface StudioData {
  name: string;
  slug: string;
  logoUrl?: string | null;
  brandingConfig?: {
    tagline?: string;
    description?: string;
    city?: string;
    state?: string;
  } | null;
  services?: { id: string; name: string; price: number }[];
  portfolioItems?: { id: string; imageUrl: string }[];
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchStudio(slug: string): Promise<StudioData | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/public/studios/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<StudioData>;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const studio = await fetchStudio(slug);

  const studioName = studio?.name ?? "Photography Studio";
  const tagline =
    studio?.brandingConfig?.tagline ?? "Premium Photography Services";
  const location =
    studio?.brandingConfig?.city && studio?.brandingConfig?.state
      ? `${studio.brandingConfig.city}, ${studio.brandingConfig.state}`
      : null;
  const serviceCount = studio?.services?.length ?? 0;

  // Pick up to 3 hero portfolio images
  const heroImages = (studio?.portfolioItems ?? [])
    .slice(0, 3)
    .map((p) => p.imageUrl);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0c0c14 0%, #1a0a2e 50%, #2d0a4e 100%)",
          fontFamily: "'DM Sans', sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow orbs */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-120px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(219,39,119,0.25) 0%, transparent 70%)",
          }}
        />

        {/* Hero portfolio strip (if images available) */}
        {heroImages.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "380px",
              height: "630px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              opacity: 0.45,
            }}
          >
            {heroImages.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                style={{
                  width: "380px",
                  height: `${630 / heroImages.length}px`,
                  objectFit: "cover",
                }}
              />
            ))}
            {/* Gradient overlay over images */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to right, #0c0c14 0%, transparent 60%)",
              }}
            />
          </div>
        )}

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "72px 80px",
            flex: 1,
            maxWidth: heroImages.length > 0 ? "820px" : "1200px",
          }}
        >
          {/* Top badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                background:
                  "linear-gradient(135deg, #7c3aed, #db2777)",
                borderRadius: "100px",
                padding: "8px 20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Book a Session
              </span>
            </div>
            {location && (
              <span
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "14px",
                  marginLeft: "16px",
                }}
              >
                {location}
              </span>
            )}
          </div>

          {/* Studio name */}
          <div
            style={{
              fontSize: studioName.length > 24 ? "56px" : "72px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.05,
              marginBottom: "20px",
              letterSpacing: "-0.02em",
            }}
          >
            {studioName}
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: "22px",
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.4,
              marginBottom: "48px",
              maxWidth: "600px",
            }}
          >
            {tagline}
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "32px",
            }}
          >
            {serviceCount > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    fontSize: "36px",
                    fontWeight: 700,
                    color: "#a78bfa",
                    lineHeight: 1,
                  }}
                >
                  {serviceCount}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.45)",
                    marginTop: "4px",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {serviceCount === 1 ? "Service" : "Services"}
                </span>
              </div>
            )}

            {serviceCount > 0 && (
              <div
                style={{
                  width: "1px",
                  height: "40px",
                  background: "rgba(255,255,255,0.15)",
                }}
              />
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.45)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Instant Booking
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(to right, #7c3aed, #db2777, #f59e0b)",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
