import { publicApi } from '@/lib/api';
import { StudioContent } from '../../studio/[slug]/StudioContent';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

export const revalidate = 3600; 

export default async function WidgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let studio = null;
  try {
    const res = await publicApi.getStudio(slug);
    studio = res.data;
  } catch (error: any) {
    console.warn(`Widget pre-fetch skipped for slug "${slug}": Backend unreachable.`, error.message);
  }

  if (!studio) {
    return notFound();
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-transparent">
        <div className="skeleton h-screen w-full opacity-20" />
      </div>
    }>
      {/* Passing isWidget=true to alter the internal rendering (hiding big headers/footers) */}
      <StudioContent initialStudio={studio} isWidget={true} />
    </Suspense>
  );
}
