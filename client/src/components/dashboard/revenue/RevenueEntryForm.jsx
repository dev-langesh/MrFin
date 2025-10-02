"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { DialogFooter } from "@/components/ui/Dialog";
import { Calendar } from "@/components/ui/Calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

export default function RevenueEntryForm({ editingEntry = null }) {
  const [formData, setFormData] = useState({
    date: editingEntry?.date ? new Date(editingEntry.date) : new Date(),
    amount: editingEntry?.amount || "",
    source: editingEntry?.source || "",
    paymentProcessor: editingEntry?.paymentProcessor || "",
    description: editingEntry?.description || "",
  });

  function handleSubmit(e) {
    e.preventDefault();
    console.log("Form Data:", formData);
    // TODO: Replace console.log with your API call or Redux dispatch
  }

  function handleChange(name, value) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Row 1: Date & Amount */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.date ? format(formData.date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.date}
                onSelect={(date) => date && handleChange("date", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (₹)</Label>
          <Input
            id="amount"
            type="number"
            placeholder="Enter amount"
            value={formData.amount}
            onChange={(e) => handleChange("amount", e.target.value)}
            required
          />
        </div>
      </div>

      {/* Row 2: Source & Processor */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Select
            value={formData.source}
            onValueChange={(value) => handleChange("source", value)}
          >
            <SelectTrigger id="source">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GPay">GPay</SelectItem>
              <SelectItem value="Fiverr">Fiverr</SelectItem>
              <SelectItem value="PayPal">PayPal</SelectItem>
              <SelectItem value="Payoneer">Payoneer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentProcessor">Payment Processor</Label>
          <Select
            value={formData.paymentProcessor}
            onValueChange={(value) => handleChange("paymentProcessor", value)}
          >
            <SelectTrigger id="paymentProcessor">
              <SelectValue placeholder="Select processor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GPay">GPay</SelectItem>
              <SelectItem value="PayPal">PayPal</SelectItem>
              <SelectItem value="Payoneer">Payoneer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 3: Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="Enter description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          required
        />
      </div>

      {/* Footer */}
      <DialogFooter>
        <Button type="submit">
          {editingEntry ? "Update Entry" : "Add Entry"}
        </Button>
      </DialogFooter>
    </form>
  );
}
