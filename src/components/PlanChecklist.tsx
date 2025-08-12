import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import React from "react";

type Task = { title: string; description?: string; done: boolean };

export default function PlanChecklist({ planId, title, tasks }: { planId: string; title: string; tasks: Task[] }) {
  const toggle = useMutation(api.plans.toggleTask);

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-zinc-900">
      <div className="font-semibold mb-2">{title}</div>
      <ul className="space-y-2">
        {tasks.map((t, i) => (
          <li key={i} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={t.done}
              onChange={(e) => toggle({ planId, index: i, done: e.target.checked })}
              className="mt-1"
            />
            <div>
              <div className={`font-medium ${t.done ? "line-through opacity-60" : ""}`}>{t.title}</div>
              {t.description ? <div className="text-sm opacity-80">{t.description}</div> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}


