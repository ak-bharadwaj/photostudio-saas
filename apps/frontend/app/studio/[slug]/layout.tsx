import type { Metadata } from "next";
import type { ReactNode } from "react";

interface StudioData {
  name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  city?: string | null;
  state?: string | null;
  brandingConfig?: {
    tagline?: string;
    description?: string;
  } | null;
  services?: { id: string; name: string }[];
  portfolioItems?: { id: string; imageUrl: string }[];
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchStudio(slug: string): Promise<StudioData | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/public/studios/${slug}`, {
      next: { revalidate: 3600 }, // ISR: re-fetch once per hour
    });
    if (!res.ok) return null;
    return res.json() as Promise<StudioData>;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const studio = await fetchStudio(slug);

  if (!studio) {
    return {
      title: "Studio Not Found",
      description: "This photography studio could not be found.",
    };
  }

  const tagline =
    studio.brandingConfig?.tagline ??
    `Premium photography services by ${studio.name}`;
  const description =
    studio.brandingConfig?.description ??
    `Book a session with ${studio.name}. ${tagline}`;
  const location =
    studio.city && studio.state
      ? ` · ${studio.city}, ${studio.state}`
      : "";
  const serviceCount = studio.services?.length ?? 0;
  const ogTitle = `${studio.name}${location}`;
  const ogDescription =
    description.length > 160
      ? description.slice(0, 157) + "..."
      : description;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const ogImageUrl = `${siteUrl}/studio/${slug}/opengraph-image`;

  return {
    title: ogTitle,
    description: ogDescription,
    openGraph: {
      type: "website",
      url: `${siteUrl}/studio/${slug}`,
      title: ogTitle,
      description: ogDescription,
      siteName: studio.name,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${studio.name} — photography studio`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogImageUrl],
    },
    // Structured data hints for search engines
    other: {
      "og:locale": "en_IN",
      ...(serviceCount > 0 && {
        "og:see_also": `${siteUrl}/studio/${slug}`,
      }),
    },
  };
}

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
