'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { ModernSidebar } from '@/components/ModernSidebar';

export function SidebarWrapper() {
    const pathname = usePathname();
    const isMainPage = pathname === '/' || pathname === '/discover';

    if (!isMainPage) return null;

    return (
        <div className="hidden lg:block w-80 shrink-0 z-50">
           <ModernSidebar />
        </div>
    );
}
