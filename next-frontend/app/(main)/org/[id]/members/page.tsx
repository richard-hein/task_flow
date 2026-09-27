"use client";
import { use } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inviteMemberMutationFn,
  membersQueryFn,
  removeMemberMutationFn,
  updateMemberRoleMutationFn,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";

const schema = z.object({ email: z.string().trim().email("Invalid email") });

export default function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orgId } = use(params);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["members", orgId], queryFn: () => membersQueryFn(orgId) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["members", orgId] });
  const err = (e: { message: string }) =>
    toast({ title: "Error", description: e.message, variant: "destructive" });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });
  const { mutate: invite, isPending } = useMutation({
    mutationFn: (v: z.infer<typeof schema>) => inviteMemberMutationFn(orgId, v),
  });
  const { mutate: role } = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "member" }) =>
      updateMemberRoleMutationFn(orgId, v.userId, { role: v.role }),
  });
  const { mutate: remove } = useMutation({
    mutationFn: (userId: string) => removeMemberMutationFn(orgId, userId),
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/orgs" className="text-sm text-primary hover:underline">← Orgs</Link>
        <Link href={`/org/${orgId}/board`} className="text-sm text-primary hover:underline">Board</Link>
      </div>
      <h1 className="text-2xl font-extrabold mb-1">Members</h1>
      <p className="text-sm text-muted-foreground mb-6">Invite by email, change roles, remove.</p>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) =>
            invite(v, { onSuccess: () => { form.reset(); refresh(); }, onError: err })
          )}
          className="flex gap-2 mb-8"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input placeholder="teammate@acme.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader className="animate-spin" />} Invite
          </Button>
        </form>
      </Form>

      {isLoading ? (
        <Loader className="animate-spin" />
      ) : (
        <ul className="space-y-2">
          {(data?.members ?? []).map((m) => (
            <li key={m.userId} className="border rounded-md p-3 flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{m.email ?? m.userId}</span>
              <div className="flex items-center gap-2">
                <select
                  className="border rounded-md px-2 py-1 text-sm bg-background"
                  value={m.role}
                  onChange={(e) =>
                    role(
                      { userId: m.userId, role: e.target.value as "admin" | "member" },
                      { onSuccess: refresh, onError: err }
                    )
                  }
                >
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
                <Button size="sm" variant="outline" onClick={() => remove(m.userId, { onSuccess: refresh, onError: err })}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
          {!data?.members?.length && <p className="text-sm text-muted-foreground">No members yet.</p>}
        </ul>
      )}
    </div>
  );
}
