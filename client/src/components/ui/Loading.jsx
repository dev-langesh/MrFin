import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import React from "react";

const containerVariants = cva(
  "flex items-center justify-center gap-2 text-muted-foreground",
  {
    variants: {
      size: {
        default: "text-base",
        sm: "text-sm",
        lg: "text-lg",
        xl: "text-xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const spinnerVariants = cva("animate-spin", {
  variants: {
    size: {
      default: "w-6 h-6",
      sm: "w-4 h-4",
      lg: "w-8 h-8",
      xl: "w-12 h-12",
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
  variant = "spinner",
  size,
  color,
  className,
  text,
  ...props
}) {
  if (variant === "spinner") {
    return (
      <div className={cn(containerVariants({ size, className }))} {...props}>
        <Loader2 className={spinnerVariants({ size, color })} />
        {text && <span className="font-medium">{text}</span>}
      </div>
    );
  }

  return null;
}
