"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/Sheet";
import { Menu } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/common/Sidebar";

export default function Layout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden fixed top-4 right-4 z-50"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-64 p-0">
          <Sidebar mobile />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64 p-2 max-lg:pt-10 h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  );
}
