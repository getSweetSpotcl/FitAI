import React from 'react';
import { DocsSidebar, DocsHeader } from '@/components/docs';

export const metadata = {
  title: 'Documentación FitAI',
  description: 'Guías completas, referencias API y recursos para dominar FitAI',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <DocsSidebar className="w-80 flex-shrink-0" />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <DocsHeader />
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}