import { marketplaceApi } from '@/lib/api';
import HomeContent from './HomeContent';
import { Suspense } from 'react';

export const revalidate = 1800; // Refetch every 30 minutes

export default async function LandingPage() {
    let initialData = null;
    
    try {
        const [cats, trending, studios, revs] = await Promise.all([
            marketplaceApi.getCategories(),
            marketplaceApi.search({ uniquePerStudio: true, limit: 6 }),
            marketplaceApi.getStudios({ isRecommended: true, limit: 4 }),
            marketplaceApi.getReviews(3)
        ]);
        
        initialData = {
            categories: cats.data,
            trendingServices: trending.data.items || [],
            featuredPartners: Array.isArray(studios.data) ? studios.data : (studios.data.items || []),
            reviews: revs.data || []
        };
    } catch (err: any) {
        // This often happens during Vercel builds because the backend API isn't running yet.
        // We catch it so the build doesn't fail, and the client will fetch data on mount.
        console.warn('Marketplace pre-fetch skipped: Backend unreachable during build.', err.message);
        // initialData stays null, HomeContent handles fetching on mount
    }

    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <HomeContent initialData={initialData} />
        </Suspense>
    );
}
