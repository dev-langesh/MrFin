import { cn } from "@/lib/utils";

export function MobileStepIndicator({ currentStep, steps }) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar border-b border-gray-200">
      <div className="flex min-w-max space-x-8 px-4">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div
              key={step.name}
              className={cn(
                "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                isCompleted && "text-gray-900"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                      ? "bg-primary/10 text-primary"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {stepNumber}
                </span>
                {step.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
