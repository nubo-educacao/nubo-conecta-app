import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Phase {
    id: string;
    name: string;
    sort_order: number;
}

interface OpportunityPhaseStepperProps {
    phases: Phase[];
    currentPhaseId: string | null;
    initialStepLabel?: string;
    className?: string;
    compact?: boolean;
}

export function OpportunityPhaseStepper({ 
    phases, 
    currentPhaseId, 
    initialStepLabel = "Candidatura Enviada", 
    className,
    compact = true
}: OpportunityPhaseStepperProps) {
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    if (!phases || phases.length === 0) return null;

    let sortedPhases = [...phases].sort((a, b) => a.sort_order - b.sort_order);
    
    if (initialStepLabel) {
        sortedPhases = [
            { id: "__initial_step__", name: initialStepLabel, sort_order: -1 },
            ...sortedPhases
        ];
    }
    
    const currentIndex = currentPhaseId 
        ? sortedPhases.findIndex(p => p.id === currentPhaseId) 
        : (initialStepLabel ? 0 : -1);

    // Limit displayed steps to avoid truncation
    const MAX_STEPS = isMobile ? 3 : 4;
    let startIdx = 0;
    
    if (sortedPhases.length > MAX_STEPS) {
        if (currentIndex <= 0) {
            startIdx = 0;
        } else if (currentIndex + MAX_STEPS > sortedPhases.length) {
            startIdx = sortedPhases.length - MAX_STEPS;
        } else {
            // Start at the last checked item (currentIndex)
            startIdx = currentIndex;
        }
    }
    
    const endIdx = startIdx + MAX_STEPS;
    const visiblePhases = sortedPhases.slice(startIdx, endIdx);

    const sz = compact ? "size-5 text-[8px]" : "size-6 text-[10px]";
    const labelSz = compact ? "text-[8px]" : "text-[9px]";
    const lineH = compact ? "h-px" : "h-0.5";

    return (
        <div className={cn("flex items-center justify-between w-full px-1", className)}>
            {visiblePhases.map((phase, i) => {
                const actualIndex = startIdx + i;
                const isCompleted = currentIndex > -1 && actualIndex < currentIndex;
                const isCurrent = actualIndex === currentIndex;
                const isLast = i === visiblePhases.length - 1;

                let circleClass = "";
                let circleContent: React.ReactNode;

                if (isCompleted || isCurrent) {
                    circleClass = "bg-[#25d366]";
                    circleContent = <span className="text-white font-bold">✓</span>;
                } else {
                    circleClass = "bg-gray-200";
                    circleContent = <span className="text-gray-500 font-bold">{actualIndex + 1}</span>;
                }

                const lineColor = isCompleted && !isLast
                    ? "bg-[#25d366]"
                    : "bg-gray-200";

                return (
                    <div key={phase.id} className="flex items-center">
                        <div className="flex flex-col items-center gap-1">
                            <div className={cn(
                                "flex items-center justify-center rounded-full shrink-0", 
                                sz, circleClass
                            )}>
                                <span className={cn(labelSz, "leading-none")}>{circleContent}</span>
                            </div>
                            <p
                                className={cn(
                                    "font-semibold text-center whitespace-pre-line leading-tight",
                                    labelSz,
                                    (isCompleted || isCurrent) ? "text-[#3a424e]" : "text-gray-400 font-normal"
                                )}
                                style={{ width: compact ? 56 : 64 }}
                            >
                                {phase.name}
                            </p>
                        </div>

                        {!isLast && (
                            <div 
                                className={cn("mx-2 flex-1 min-w-[24px]", lineH, lineColor)} 
                                style={{ width: compact ? 24 : 32 }} 
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
