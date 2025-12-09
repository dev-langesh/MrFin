import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { Spinner } from "@/components/ui/spinner";
import React from "react";

const containerVariants = cva("flex items-center justify-center gap-2", {
  variants: {
    size: {
      default: "text-base",
      sm: "text-sm",
      lg: "text-lg",
      xl: "text-xl",
    },
    layout: {
      row: "flex-row",
      col: "flex-col",
    },
  },
  defaultVariants: {
    size: "default",
    layout: "row",
  },
});

const spinnerVariants = cva("", {
  variants: {
    size: {
      default: "size-6",
      sm: "size-4",
      lg: "size-8",
      xl: "size-12",
    },
    color: {
      black: "text-black",
      white: "text-white",
      primary: "text-primary",
      muted: "text-muted-foreground",
    },
  },
  defaultVariants: {
    size: "default",
    color: "black",
  },
});

export default function Loading({
  size = "default",
  color,
  className,
  text,
  layout = "row",
  ...props
}) {
  return (
    <div
      className={cn(containerVariants({ size, layout, className }))}
      {...props}
    >
      <Spinner className={cn(spinnerVariants({ size, color }))} />
      {text && <span className="font-medium">{text}</span>}
    </div>
  );
}
