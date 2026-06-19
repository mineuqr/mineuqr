import { SidebarProvider } from "@/components/ui/sidebar";
import { useCallback, useState, type ReactNode } from "react";
import {
  readRestaurantSidebarOpen,
  writeRestaurantSidebarOpen,
} from "./restaurantSidebarStorage";

export function RestaurantSidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(() => readRestaurantSidebarOpen());

  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    writeRestaurantSidebarOpen(next);
  }, []);

  return (
    <SidebarProvider open={open} onOpenChange={onOpenChange}>
      {children}
    </SidebarProvider>
  );
}
