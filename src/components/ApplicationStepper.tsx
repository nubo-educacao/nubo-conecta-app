"use client";

import { Check, X } from "lucide-react";

type ApplicationStatus = "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED";

interface ApplicationStepperProps {
  status: ApplicationStatus;
  compact?: boolean;
}

const STEPS = [
  { label: "Candidatura\nEnviada", key: "SUBMITTED" },
  { label: "Em\nAnálise", key: "IN_REVIEW" },
  { label: "Aprovado", key: "APPROVED" },
];

const STATUS_STEP_INDEX: Record<ApplicationStatus, number> = {
  DRAFT: -1,
  SUBMITTED: 0,
  IN_REVIEW: 1,
  APPROVED: 2,
  REJECTED: 1, // currently on IN_REVIEW step but rejected
};

export default function ApplicationStepper({ status, compact }: ApplicationStepperProps) {
  const currentIndex = STATUS_STEP_INDEX[status];
  const isRejected = status === "REJECTED";
  const sz = compact ? "size-5 text-[8px]" : "size-6 text-[10px]";
  const labelSz = compact ? "text-[8px]" : "text-[9px]";
  const lineH = compact ? "h-px" : "h-0.5";

  return (
    <div className="flex items-center justify-between w-full px-1">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex || (i <= currentIndex && !isRejected && i < 2) || status === "APPROVED";
        const isCurrent = i === currentIndex;
        const isFuture = i > currentIndex;
        const isLast = i === STEPS.length - 1;

        // Determine circle appearance
        let circleClass = "";
        let circleContent: React.ReactNode;

        if (isRejected && isCurrent) {
          circleClass = "bg-red-500";
          circleContent = <X size={compact ? 10 : 12} className="text-white" strokeWidth={3} />;
        } else if (isDone || (isCurrent && !isRejected)) {
          circleClass = "bg-[#25d366]";
          circleContent = <span className="text-white font-bold">✓</span>;
        } else {
          circleClass = "bg-gray-200";
          circleContent = <span className="text-gray-500 font-bold">{i + 1}</span>;
        }

        const lineColor = isDone && !isLast
          ? "bg-[#25d366]"
          : "bg-gray-200";

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`${sz} rounded-full flex items-center justify-center shrink-0 ${circleClass}`}>
                <span className={`${labelSz} leading-none`}>{circleContent}</span>
              </div>
              <p
                className={`${labelSz} font-semibold text-center whitespace-pre-line leading-tight ${
                  isDone || isCurrent
                    ? "text-[#3a424e]"
                    : "text-gray-400 font-normal"
                }`}
                style={{ width: compact ? 56 : 64 }}
              >
                {step.label}
              </p>
            </div>

            {!isLast && (
              <div className={`${lineH} mx-2 flex-1 min-w-[24px] ${lineColor}`} style={{ width: compact ? 24 : 32 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
