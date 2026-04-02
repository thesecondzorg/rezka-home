'use client';

import React, { Suspense } from 'react';
import { DiscoveryContainer } from '@/components/discovery/DiscoveryContainer';

export default function HomePage() {
  return (
    <div className="w-full">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-12 h-12 border-4 border-gray-800 border-t-red-500 rounded-full animate-spin" />
          <p className="text-gray-500 font-medium animate-pulse">Loading Discovery...</p>
        </div>
      }>
        <DiscoveryContainer />
      </Suspense>
    </div>
  );
}
