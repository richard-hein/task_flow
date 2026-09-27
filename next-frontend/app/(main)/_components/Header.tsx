"use client";
import React from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, MoonStarIcon, SunIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { orgsQueryFn } from "@/lib/api";
import { useTheme } from "next-themes";

const Header = () => {
  const { theme, setTheme } = useTheme();
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const rawId = params?.id;
  const orgId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { data } = useQuery({ queryKey: ["orgs"], queryFn: orgsQueryFn });
  const active = data?.orgs?.find((o) => o._id === orgId);
  const crumbs = pathname.split("/").filter(Boolean);

  return (
    <div className="w-full sticky top-0 z-10 bg-background/95 backdrop-blur">
      <div className="flex h-[60px] items-center gap-2 border-b border-[#00002f26] px-3">
        <SidebarTrigger className="-ml-1" />
        <nav className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              <span className={i === crumbs.length - 1 ? "text-foreground font-medium capitalize" : "capitalize"}>{c}</span>
            </span>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {active?.name ?? "Switch workspace"}
                <ChevronsUpDown className="ml-1 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              {(data?.orgs ?? []).map((o) => (
                <DropdownMenuItem key={o._id} onClick={() => router.push(`/org/${o._id}/board`)}>
                  {o.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => router.push("/orgs")}>Manage…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            {theme === "light" ? <MoonStarIcon /> : <SunIcon />}
          </Button>
          <Link href="/orgs">
            <Button size="sm">New workspace</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Header;
