"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";

export function AutoSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  onCreate,
  className,
  disabled,
}) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(inputValue.toLowerCase())
  );

  const showCreate =
    inputValue &&
    !options.some(
      (option) => option.toLowerCase() === inputValue.toLowerCase()
    );

  const handleSelect = (currentValue) => {
    onChange(currentValue === value ? "" : currentValue);
    setOpen(false);
    setInputValue("");
  };

  const handleCreate = () => {
    if (onCreate) {
      onCreate(inputValue);
    }
    onChange(inputValue);
    setOpen(false);
    setInputValue("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between hover:bg-transparent hover",
            className
          )}
          disabled={disabled}
        >
          {value ? (
            value
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCreate) {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              {showCreate ? (
                <div
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent rounded-sm"
                  onClick={handleCreate}
                >
                  <Plus className="h-4 w-4" />
                  <span>Create "{inputValue}"</span>
                </div>
              ) : (
                "No results found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
