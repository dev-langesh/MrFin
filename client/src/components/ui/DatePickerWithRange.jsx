"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/Calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { Button } from "@/components/ui/button";

export function DatePickerWithRange({ value, onChange }) {
  const [date, setDate] = React.useState(
    value || { from: undefined, to: undefined }
  );

  function handleChange(newValue) {
    setDate(newValue);
    onChange && onChange(newValue);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal border-border"
        >
          {date?.from ? (
            date.to ? (
              <>
                {date.from.toLocaleDateString("en-GB")} -{" "}
                {date.to.toLocaleDateString("en-GB")}
              </>
            ) : (
              date.from.toLocaleDateString("en-GB")
            )
          ) : (
            "Pick a date range"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={date}
          onSelect={handleChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
