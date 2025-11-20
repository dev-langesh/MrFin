"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import Info from "./info";

function LabelComponent({ className, children, info, ...props }) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {info && <Info info={info} />}
    </label>
  );
}

export const Label = React.memo(LabelComponent);
