"use client";

import { AppBar } from "@/components/common/AppBar";

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AppBar />
      <main
        id="dashboard-main-content"
        className="flex-1 p-4 md:p-6 overflow-y-auto"
      >
        {children}
      </main>
    </div>
  );
}
