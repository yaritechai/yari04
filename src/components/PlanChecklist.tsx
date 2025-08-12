import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import React from "react";

type Task = { title: string; description?: string; done: boolean };

export default function PlanChecklist({ planId, title, tasks }: { planId: string; title: string; tasks: Task[] }) {
  const plan = useQuery(api.plans.get as any, { planId } as any) as any;
  const toggle = useMutation(api.plans.toggleTask);
  const approve = useMutation(api.plans.approve);

  return (
    <div className="rounded-2xl border border-border p-4 sm:p-5 bg-card">
      <div className="font-semibold text-foreground mb-3 sm:mb-4">{plan?.title || title}</div>
      <ul className="space-y-3">
        {(plan?.tasks || tasks).map((t: Task, i: number) => (
          <li key={i} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={!!t.done}
              onChange={(e) => toggle({ planId: plan?._id || (planId as any), index: i, done: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-border bg-background text-primary focus:ring-0"
            />
            <div>
              <div className={`font-medium text-foreground ${t.done ? "line-through opacity-60" : ""}`}>{t.title}</div>
              {t.description ? <div className="text-sm text-muted-foreground">{t.description}</div> : null}
            </div>
          </li>
        ))}
      </ul>
      {plan?.status === "draft" && (
        <div className="mt-4 flex items-center justify-end">
          <button
            onClick={() => approve({ planId: plan._id })}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted text-foreground"
          >
            Approve & Start
          </button>
        </div>
      )}
    </div>
  );
}


