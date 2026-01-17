'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  RiHome5Line,
  RiRobot2Line,
  RiQuestionLine,
  RiCalendarLine,
  RiBarChartBoxLine,
  RiBookOpenLine,
  RiSettings3Line,
  RiLogoutBoxLine,
} from '@remixicon/react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const mainNav = [
  { name: 'Dashboard', href: '/dashboard', icon: RiHome5Line },
  { name: 'AI Tutor', href: '/dashboard/tutor', icon: RiRobot2Line },
  { name: 'Quiz', href: '/dashboard/quiz', icon: RiQuestionLine },
  { name: 'Study Planner', href: '/dashboard/planner', icon: RiCalendarLine },
  { name: 'Analytics', href: '/dashboard/analytics', icon: RiBarChartBoxLine },
];

const secondaryNav = [
  { name: 'Resources', href: '/dashboard/resources', icon: RiBookOpenLine },
  { name: 'Settings', href: '/dashboard/settings', icon: RiSettings3Line },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <RiBookOpenLine className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Shiksha AI</span>
            <span className="text-xs text-muted-foreground">Learn Smarter</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.name}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>More</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.name}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 rounded-md px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium">{user?.name || 'User'}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => logout()}
                className="shrink-0 group-data-[collapsible=icon]:hidden"
              >
                <RiLogoutBoxLine className="h-4 w-4" />
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
