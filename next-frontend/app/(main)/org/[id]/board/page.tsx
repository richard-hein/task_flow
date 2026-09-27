"use client";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  createProjectMutationFn,
  createTaskMutationFn,
  deleteTaskMutationFn,
  moveTaskMutationFn,
  projectsQueryFn,
  tasksQueryFn,
  type TaskStatus,
  type TaskType,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "lucide-react";

const COLS: TaskStatus[] = ["todo", "doing", "done"];

function Column({
  orgId,
  projectId,
  status,
  tasks,
}: {
  orgId: string;
  projectId: string;
  status: TaskStatus;
  tasks: TaskType[];
}) {
  const qc = useQueryClient();
  const { mutate } = useMutation({ mutationFn: (v: { id: string; status: TaskStatus }) => moveTaskMutationFn(v.id, { status: v.status }) });
  const { mutate: del } = useMutation({ mutationFn: deleteTaskMutationFn });
  const refresh = () => qc.invalidateQueries({ queryKey: ["tasks", projectId] });
  const move = (id: string, s: TaskStatus) =>
    mutate(
      { id, status: s },
      {
        onSuccess: refresh,
        onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );

  return (
    <div
      className="flex-1 min-w-60 border rounded-md p-3 bg-muted/30"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const id = e.dataTransfer.getData("text/task-id");
        if (id) move(id, status);
      }}
    >
      <h3 className="font-bold capitalize mb-3">{status}</h3>
      <div className="space-y-2">
        {tasks.filter((t) => t.status === status).map((t) => (
          <div
            key={t._id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/task-id", t._id)}
            className="bg-background border rounded-md p-3 cursor-grab"
          >
            <p className="text-sm font-semibold">{t.title}</p>
            <div className="flex gap-1 mt-2">
              {COLS.filter((c) => c !== t.status).map((c) => (
                <Button key={c} size="sm" variant="outline" onClick={() => move(t._id, c)}>
                  →{c}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => del(t._id, { onSuccess: refresh })}
              >
                ✕
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orgId } = use(params);
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [projectName, setProjectName] = useState("");

  const projects = useQuery({ queryKey: ["projects", orgId], queryFn: () => projectsQueryFn(orgId) });
  const pid = projectId || projects.data?.projects?.[0]?._id || "";
  const tasks = useQuery({
    queryKey: ["tasks", pid],
    queryFn: () => tasksQueryFn(pid),
    enabled: !!pid,
  });

  const { mutate: createProject, isPending: creatingProject } = useMutation({
    mutationFn: (v: { name: string }) => createProjectMutationFn(orgId, v),
  });
  const { mutate: createTask, isPending: creatingTask } = useMutation({
    mutationFn: (v: { title: string }) => createTaskMutationFn(pid, v),
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/orgs" className="text-sm text-primary hover:underline">← Orgs</Link>
        <Link href={`/org/${orgId}/members`} className="text-sm text-primary hover:underline">Members</Link>
      </div>
      <h1 className="text-2xl font-extrabold mb-4">Board</h1>

      <div className="flex gap-2 mb-4">
        <Input placeholder="New project" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="max-w-60" />
        <Button
          disabled={!projectName.trim() || creatingProject}
          onClick={() =>
            createProject(
              { name: projectName.trim() },
              {
                onSuccess: () => {
                  setProjectName("");
                  qc.invalidateQueries({ queryKey: ["projects", orgId] });
                },
                onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
              }
            )
          }
        >
          {creatingProject && <Loader className="animate-spin" />} Add project
        </Button>
        <select
          className="border rounded-md px-2 text-sm bg-background"
          value={pid}
          onChange={(e) => setProjectId(e.target.value)}
        >
          {(projects.data?.projects ?? []).map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>

      {pid && (
        <form
          className="flex gap-2 mb-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            createTask(
              { title: title.trim() },
              {
                onSuccess: () => {
                  setTitle("");
                  qc.invalidateQueries({ queryKey: ["tasks", pid] });
                },
                onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
              }
            );
          }}
        >
          <Input placeholder="New task" value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-80" />
          <Button type="submit" disabled={creatingTask}>
            {creatingTask && <Loader className="animate-spin" />} Add task
          </Button>
        </form>
      )}

      {!pid ? (
        <p className="text-sm text-muted-foreground">Create a project to start.</p>
      ) : tasks.isLoading ? (
        <Loader className="animate-spin" />
      ) : (
        <div className="flex gap-3">
          {COLS.map((c) => (
            <Column key={c} orgId={orgId} projectId={pid} status={c} tasks={tasks.data?.tasks ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}
