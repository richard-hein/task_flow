"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createOrgMutationFn, orgsQueryFn } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";

const schema = z.object({ name: z.string().trim().min(1, "Name is required") });

export default function OrgsPage() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ["orgs"], queryFn: orgsQueryFn });
  const { mutate, isPending } = useMutation({ mutationFn: createOrgMutationFn });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const onSubmit = (v: z.infer<typeof schema>) =>
    mutate(v, {
      onSuccess: () => {
        form.reset();
        refetch();
      },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-extrabold">Workspaces</h1>
      <p className="text-sm text-muted-foreground mb-6">Create or switch org. Active org lives in the URL.</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2 mb-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input placeholder="Acme Inc" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader className="animate-spin" />} Create
          </Button>
        </form>
      </Form>
      {isLoading ? (
        <Loader className="animate-spin" />
      ) : (
        <ul className="space-y-2">
          {(data?.orgs ?? []).map((o) => (
            <li key={o._id} className="border rounded-md p-4 flex items-center justify-between">
              <span className="font-semibold">{o.name}</span>
              <div className="flex gap-2">
                <Link href={`/org/${o._id}/board`}>
                  <Button size="sm">Board</Button>
                </Link>
                <Link href={`/org/${o._id}/members`}>
                  <Button size="sm" variant="outline">Members</Button>
                </Link>
              </div>
            </li>
          ))}
          {!data?.orgs?.length && <p className="text-sm text-muted-foreground">No workspaces yet.</p>}
        </ul>
      )}
    </div>
  );
}
