"use client";

import * as React from "react";
import { X, Check } from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
  CommandEmpty,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { getColorForValue } from "@/utils/uiUtils";
import { ChevronDownIcon } from "lucide-react";

export function MultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = "Select options...",
  variant = "ghost",
  ...props
}) {
  console.log("MultiSelect Render", { selected, options });
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (item) => {
    onChange(selected.filter((i) => i !== item));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen} {...props}>
        <PopoverTrigger asChild>
          <div
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex w-full items-center justify-between rounded-[6px] border border-border bg-transparent px-3 py-2 text-sm transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-border-active hover:border-border-active cursor-pointer",
              selected.length === 0 && "text-muted-foreground",
              className // Allow overriding but keep base styles
            )}
          >
            <span className="truncate">
              {selected.length > 0
                ? `${selected.length} selected`
                : placeholder}
            </span>
            <ChevronDownIcon className="h-4 w-4 opacity-50 shrink-0" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 min-w-[200px]" align="start">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>No item found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      onChange(
                        selected.includes(option.value)
                          ? selected.filter((item) => item !== option.value)
                          : [...selected, option.value]
                      );
                      // keep open for multi select
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 ",
                        selected.includes(option.value)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="first-letter:capitalize">
                      {option.label}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Items List Below */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => {
            const label =
              options.find((opt) => opt.value === item)?.label || item;
            const colorClass =
              variant === "coloured" ? getColorForValue(item) : "";

            return (
              <Badge
                key={item}
                variant="secondary"
                className={cn("cursor-pointer", colorClass)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnselect(item);
                }}
              >
                {label}
                <X className="ml-1 h-3 w-3 hover:text-foreground opacity-70" />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
