import { publicApi, marketplaceApi } from '@/lib/api';

export const revalidate = 3600; // Cache for 1 hour

export async function generateStaticParams() {
  try {
    const res = await marketplaceApi.getStudios({ limit: 100 }); // Fetch all studios
    const studios = res.data;
    // Handle both {items: []} and [] formats
    const items = Array.isArray(studios) ? studios : (studios.items || []);
    return items.map((studio: any) => ({
      slug: studio.slug,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
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
