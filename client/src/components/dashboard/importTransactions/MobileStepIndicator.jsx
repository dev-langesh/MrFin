import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export function MobileStepIndicator({ currentStep, steps }) {
  const scrollContainerRef = useRef(null);
  const activeStepRef = useRef(null);

  useEffect(() => {
    if (activeStepRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeElement = activeStepRef.current;

      const containerWidth = container.offsetWidth;
      const activeElementWidth = activeElement.offsetWidth;
      const activeElementLeft = activeElement.offsetLeft;

      const scrollTo =
        activeElementLeft - containerWidth / 2 + activeElementWidth / 2;

      container.scrollTo({
        left: scrollTo,
        behavior: "smooth",
      });
    }
  }, [currentStep]);

  return (
    <div
      ref={scrollContainerRef}
      className="w-full overflow-x-auto no-scrollbar border-b border-gray-200"
    >
      <div className="flex min-w-max space-x-8 px-4">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div
              key={step.name}
              ref={isActive ? activeStepRef : null}
              className={cn(
                "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                isCompleted && "text-gray-900"
              )}
            >
              <div className="flex items-center gap-2">{step.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
