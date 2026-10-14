import { requestKinds, requestStatuses, type RequestKind, type RequestStatus } from "@/lib/requests/form";

const statusStyles: Record<RequestStatus, string> = {
  new: "bg-honey/15 text-honey-dark ring-honey/30",
  in_progress: "bg-blue-50 text-blue-800 ring-blue-200",
  answered: "bg-green-50 text-green-800 ring-green-200",
  closed: "bg-sand text-muted ring-line",
};

export function RequestStatusPill({ status }: { status: RequestStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap ring-1 ring-inset ${statusStyles[status]}`}>
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {requestStatuses[status]}
    </span>
  );
}

const kindStyles: Record<RequestKind, string> = {
  contact: "bg-sand text-brown",
  quote: "bg-violet-50 text-violet-800",
  swarm: "bg-amber-100 text-amber-900",
};

export function RequestKindBadge({ kind }: { kind: RequestKind }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap ${kindStyles[kind]}`}>
      {requestKinds[kind].short}
    </span>
  );
}
