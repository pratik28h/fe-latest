import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { 
  Home, 
  Upload, 
  TableProperties, 
  MessageSquare, 
  LayoutDashboard, 
  Settings,
  Database,
  Plus
} from "lucide-react";
import { Link, useLocation } from "wouter";

export function AppSidebar() {
  const [location] = useLocation();

  const menuItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Upload, label: "Data Upload", href: "/upload" },
    { icon: TableProperties, label: "Data Preview", href: "/preview" },
    { icon: MessageSquare, label: "Chat with Data", href: "/chat" },
    { icon: LayoutDashboard, label: "Dashboard Builder", href: "/builder" },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 font-display font-bold text-lg text-sidebar-primary">
          <div className="size-8 rounded-md bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
            <Database className="size-5" />
          </div>
          MDM Platform
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          <div className="px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Workspace
          </div>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton 
                  isActive={location === item.href}
                  tooltip={item.label}
                  className="font-medium"
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <SidebarMenu className="mt-6">
          <div className="px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider flex items-center justify-between group">
            Projects
            <button className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-sidebar-accent rounded p-0.5">
              <Plus className="size-3" />
            </button>
          </div>
          {["Q1 Sales Analysis", "Customer Churn Model", "Marketing ROI 2024"].map((project) => (
            <SidebarMenuItem key={project}>
              <SidebarMenuButton className="text-sidebar-foreground/80">
                <span className="truncate">{project}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenuButton className="h-12">
          <div className="size-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold">
            JD
          </div>
          <div className="flex flex-col text-left text-sm leading-tight">
            <span className="font-semibold">John Doe</span>
            <span className="text-xs text-sidebar-foreground/70">Data Analyst</span>
          </div>
          <Settings className="ml-auto size-4" />
        </SidebarMenuButton>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
