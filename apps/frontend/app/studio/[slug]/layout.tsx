import { publicApi, marketplaceApi } from '@/lib/api';

export const revalidate = 3600; // Cache for 1 hour

export async function generateStaticParams() {
  try {
    // During Vercel build, the backend API might not be available yet.
    // We catch errors to prevent the build from failing entirely.
    const res = await marketplaceApi.getStudios({ limit: 100 });
    const studios = res?.data;
    
    if (!studios) return [];

    // Handle both {items: []} and [] formats
    const items = Array.isArray(studios) ? studios : (studios.items || []);
    return items.map((studio: any) => ({
      slug: studio.slug,
    }));
  } catch (error: any) {
    // Fail gracefully during build if backend is unreachable
    console.warn('Skipping static param generation: Backend unreachable during build.', error.message);
    return [];
  }
}

export default async function StudioLayout({ 
  children,
  params
}: { 
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  // We await params here to comply with Next.js 16 Server Component requirements
  await params;
  
  return <>{children}</>;
}
