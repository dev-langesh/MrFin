import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Textarea } from "@/components/ui/textarea";

import { entrySchema } from "@/schemas/transaction.schema";
import { DatePicker } from "@/components/ui/DatePicker";

export default function EditEntryForm({ initialData, onSubmit, onCancel }) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      txnDate: initialData.txnDate || "",
      description: initialData.description || "",
      amount: String(initialData.amount || ""),
      txnType: initialData.txnType || "",
      category: initialData.category || "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Edit Entry</DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label>Date</Label>
          <Controller
            name="txnDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="YYYY-MM-DD"
              />
            )}
          />
          {errors.txnDate && (
            <p className="text-sm text-destructive">{errors.txnDate.message}</p>
          )}
        </div>

        <Input
          {...register("amount")}
          label="Amount"
          placeholder="Amount"
          error={!!errors.amount}
          helperText={errors.amount?.message}
          onChange={(e) => {
            const value = e.target.value;
            if (/^[0-9]*\.?[0-9]*$/.test(value)) {
              register("amount").onChange(e);
            }
          }}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Controller
              name="txnType"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  error={!!errors.txnType}
                  helperText={errors.txnType?.message}
                >
                  <SelectTrigger error={!!errors.txnType} className="w-full">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <Input
            {...register("category")}
            label="Category"
            placeholder="Category"
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            {...register("description")}
            placeholder="Description"
            className="min-h-[100px]"
          />
          {errors.description && (
            <p className="text-sm text-destructive">
              {errors.description.message}
            </p>
          )}
        </div>
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit">Save Changes</Button>
      </DialogFooter>
    </form>
  );
}
