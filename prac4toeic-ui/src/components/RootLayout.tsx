import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppNav } from './AppNav';

export const RootLayout: React.FC = () => {
  return (
    <div className="h-screen w-full bg-slate-50/70 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col overflow-hidden antialiased">
      <AppNav />
      <main className="flex-1 flex flex-col w-full overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
