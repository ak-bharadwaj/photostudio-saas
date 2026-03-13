import { publicApi } from '@/lib/api';
import { StudioContent } from './StudioContent';
import { notFound } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import { Suspense } from 'react';

// Static params for ISR (configured in layout.tsx, but good to have here too if needed)
export const revalidate = 3600; 

export default async function StudioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let studio = null;
  try {
    const res = await publicApi.getStudio(slug);
    studio = res.data;
  } catch (error: any) {
    // Gracefully handle build-time unavailability
    console.warn(`Studio pre-fetch skipped for slug "${slug}": Backend unreachable.`, error.message);
  }

  if (!studio) {
    return notFound();
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black">
        <div className="skeleton h-screen w-full opacity-20" />
      </div>
    }>
      <StudioContent initialStudio={studio} />
    </Suspense>
  );
}
