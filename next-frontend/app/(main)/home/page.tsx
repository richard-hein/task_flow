"use client";
import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, KanbanSquare, Lock, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { orgsQueryFn, sessionsQueryFn } from "@/lib/api";
import { useAuthContext } from "@/context/auth-provider";
import EnableMfa from "../_components/EnableMfa";

const Home = () => {
  const { user } = useAuthContext();
  const orgs = useQuery({ queryKey: ["orgs"], queryFn: orgsQueryFn });
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: sessionsQueryFn });
  const mfaOn = user?.userPreferences?.enable2FA;

  const stats = [
    { title: "Workspaces", value: orgs.data?.orgs?.length ?? "—", icon: Building2, href: "/orgs" },
    { title: "Sessions", value: sessions.data?.sessions?.length ?? "—", icon: Lock, href: "/sessions" },
    { title: "MFA", value: mfaOn ? "On" : "Off", icon: ShieldCheck, href: "#security" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Good day, {user?.name?.split(" ")[0] ?? "there"}</h1>
        <p className="text-sm text-muted-foreground">Taskflow overview across your workspaces.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
              <s.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              {s.title === "MFA" && (
                <Badge variant={mfaOn ? "default" : "secondary"} className="mt-2">
                  {mfaOn ? "Protected" : "Not enabled"}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent workspaces</CardTitle>
          <CardDescription>Jump back into a board or manage members.</CardDescription>
        </CardHeader>
        <CardContent>
          {(orgs.data?.orgs ?? []).slice(0, 5).map((o) => (
            <div key={o._id} className="flex items-center justify-between border-b py-2 last:border-0">
              <span className="text-sm font-medium">{o.name}</span>
              <div className="flex gap-2">
                <Link href={`/org/${o._id}/board`}>
                  <Button size="sm" variant="outline">
                    <KanbanSquare className="mr-1 size-4" /> Board
                  </Button>
                </Link>
                <Link href={`/org/${o._id}/members`}>
                  <Button size="sm" variant="ghost">Members</Button>
                </Link>
              </div>
            </div>
          ))}
          {!orgs.data?.orgs?.length && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">No workspaces yet.</p>
              <Link href="/orgs">
                <Button size="sm">Create one</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="security">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Two-factor authentication protects your workspaces.</CardDescription>
        </CardHeader>
        <CardContent>
          <EnableMfa />
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
