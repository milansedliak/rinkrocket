import { FRAME_TEMPLATES } from "@/lib/frame";

import { FrameCard } from "./frame-card";

export function FrameSidebar() {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-slate-200 bg-slate-50/70">
      <header className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Frames</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Drag onto the canvas to add a playing surface.
        </p>
      </header>
      <ul className="flex-1 space-y-2 overflow-y-auto p-3">
        {FRAME_TEMPLATES.map((template) => (
          <li key={template.kind}>
            <FrameCard template={template} />
          </li>
        ))}
      </ul>
    </aside>
  );
}
