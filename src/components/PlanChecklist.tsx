import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import React from "react";

type Task = { title: string; description?: string; done: boolean };

export default function PlanChecklist({ planId, title, tasks }: { planId: string; title: string; tasks: Task[] }) {
  const plan = useQuery(api.plans.get as any, { planId } as any) as any;
  const toggle = useMutation(api.plans.toggleTask);
  const approve = useMutation(api.plans.approve);

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-zinc-900">
      <div className="font-semibold mb-2">{plan?.title || title}</div>
      <ul className="space-y-2">
        {(plan?.tasks || tasks).map((t: Task, i: number) => (
          <li key={i} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={!!t.done}
              onChange={(e) => toggle({ planId: plan?._id || (planId as any), index: i, done: e.target.checked })}
              className="mt-1"
            />
            <div>
              <div className={`font-medium ${t.done ? "line-through opacity-60" : ""}`}>{t.title}</div>
              {t.description ? <div className="text-sm opacity-80">{t.description}</div> : null}
            </div>
          </li>
        ))}
      </ul>
      {plan?.status === "draft" && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => approve({ planId: plan._id })}
            className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Approve & Start
          </button>
        </div>
      )}
    </div>
  );
}


