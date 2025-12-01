import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { TextArea } from "@/components/ui/text-area";
import { transformedEntrySchema } from "@/schemas/transformedEntry.schema";

export default function EditTransformedEntryForm({
  initialData,
  onSubmit,
  onCancel,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm({
    defaultValues: initialData || {},
    resolver: zodResolver(transformedEntrySchema),
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Edit Transformed Entry</DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto px-1">
        {/* Transaction Date */}
        <div className="space-y-2">
          <Label>Transaction Date</Label>
          <Controller
            control={control}
            name="txnDate"
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="Select Transaction Date"
              />
            )}
          />
          {errors.txnDate && (
            <p className="text-sm text-red-500">{errors.txnDate.message}</p>
          )}
        </div>

        {/* Flex Row: Transaction Type & Category */}
        <div className="grid grid-cols-2 gap-4">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <Controller
              control={control}
              name="txnType"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.txnType && (
              <p className="text-sm text-red-500">{errors.txnType.message}</p>
            )}
          </div>

          {/* Category */}
          <Input
            label="Category"
            {...register("category")}
            placeholder="Enter Category"
            error={!!errors.category}
            helperText={errors.category?.message}
          />
        </div>

        {/* Amount */}
        <Input
          label="Amount"
          {...register("amount")}
          placeholder="Enter Amount"
          error={!!errors.amount}
          helperText={errors.amount?.message}
        />

        {/* Description (Textarea at bottom) */}
        <TextArea
          label="Description"
          {...register("description")}
          placeholder="Enter Description"
          error={!!errors.description}
          helperText={errors.description?.message}
          className="min-h-[80px] mb-[4px]"
        />
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit">Update</Button>
      </DialogFooter>
    </form>
  );
}
