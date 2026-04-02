import { ReactNode } from "react";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-base font-semibold text-stone-700 mb-1">{title}</h3>
      <p className="text-sm text-stone-400 mb-5 max-w-xs">{description}</p>
      {action}
    </div>
  );
}
