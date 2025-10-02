import { cn } from "@/lib/utils";
import React from "react";

function HelperTextComponent({ className, text, error, success }) {
  if (!text) return null;

  return (
    <p
      className={cn(
        "mt-1 text-sm text-muted-foreground",
        error && "text-destructive",
        success && "text-success",
        className
      )}
    >
      {text}
    </p>
  );
}

export const HelperText = React.memo(HelperTextComponent);
