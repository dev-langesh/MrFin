import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./Label";
import { HelperText } from "./HelperText";
import Info from "./info";

const TextArea = React.forwardRef(
  (
    {
      className,
      success,
      error,
      helperText,
      label,
      value,
      onChange,
      info,
      ...props
    },
    ref
  ) => {
    return (
      <div>
        {label && (
          <Label className="pb-2" info={info}>
            {label}
          </Label>
        )}

        <div className="relative w-full">
          <div className="flex items-center gap-2 w-full">
            <textarea
              ref={ref}
              value={value}
              onChange={onChange}
              className={cn(
                "placeholder:text-muted-foreground border border-border w-full min-w-0 rounded-[6px] px-3 py-2 text-sm shadow-xs transition-[color] outline-none resize-none",
                "focus-visible:border-border-active focus-visible:ring-ring/50 focus-visible:ring-[3px] hover:border-border-active",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-disabled disabled:border-none disabled:shadow-none text-sm",
                "read-only:opacity-70 read-only:focus-visible:ring-0 read-only:focus-visible:border-border read-only:hover:border-border",
                error &&
                  "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20 hover:border-destructive shadow-none",
                success &&
                  "border-success focus-visible:border-success focus-visible:ring-success/20 hover:border-success shadow-none",
                className
              )}
              {...props}
            />
            {!label && info && <Info info={info} />}
          </div>
        </div>

        <HelperText text={helperText} error={error} success={success} />
      </div>
    );
  }
);

export { TextArea };
