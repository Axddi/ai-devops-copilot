'use client';

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Menu, Search, Bell } from 'lucide-react';
import { logout } from "@/lib/logout";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavbarProps {
  onMenuToggle: () => void;
  onOpenAlerts: () => void;
}

export function Navbar({ onMenuToggle, onOpenAlerts }: NavbarProps) {
  const { data: session } = useSession();
  return (
    <div className="border-b border-border bg-card h-16 px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="text-muted-foreground hover:text-foreground"
        >
          <Menu className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            AD
          </div>
          <span className="font-semibold text-sm">AI DevOps Copilot</span>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search pods, events, logs..."
            className="pl-10 bg-secondary border-border text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/chat">
          <Button variant="ghost" size="icon" aria-label="Open AI assistant">
            <MessageSquare className="h-5 w-5" />
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label="View cluster alerts"
          onClick={onOpenAlerts}
        >
          <Bell className="w-5 h-5" />
        </Button>

<DropdownMenu>
    <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer w-8 h-8">
            <AvatarFallback>
                {session?.user?.name?.charAt(0) ?? "U"}
            </AvatarFallback>
        </Avatar>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end">

        {session ? (
            <>
                <DropdownMenuItem disabled>
                    {session.user?.name}
                </DropdownMenuItem>

                <DropdownMenuItem disabled>
                    {session.user?.email}
                </DropdownMenuItem>

                <DropdownMenuItem disabled>
                    Role: {session.user?.role ?? "Unassigned"}
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={logout}
                >
                    Logout
                </DropdownMenuItem>
            </>
        ) : (
            <DropdownMenuItem disabled>Authentication required</DropdownMenuItem>
        )}

    </DropdownMenuContent>
</DropdownMenu>
      </div>
    </div>
  );
}
