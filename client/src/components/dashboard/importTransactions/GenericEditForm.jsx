import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { memo, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from "@/components/ui/DatePicker";

function GenericEditForm({
  initialData,
  onSubmit,
  onCancel,
  title = "Edit Entry",
  schema,
  fieldConfig = {},
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm({
    defaultValues: initialData || {},
    resolver: schema ? zodResolver(schema) : undefined,
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  const keys = Object.keys(initialData || {}).filter(
    (key) => key !== "errors" && key !== "id" && key !== "_originalIndex"
  );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto px-1">
        {keys.map((key) => {
          const config = fieldConfig[key] || {};
          if (config.hidden) return null;
          const isDate = config.type === "date";

          if (isDate) {
            return (
              <div key={key} className="space-y-2">
                <Label>{config.label || key}</Label>
                <Controller
                  control={control}
                  name={key}
                  render={({ field }) => (
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={`Select ${config.label || key}`}
                    />
                  )}
                />
                {errors[key] && (
                  <p className="text-sm text-red-500">{errors[key].message}</p>
                )}
              </div>
            );
          }

          return (
            <div key={key} className="space-y-2">
              <Input
                label={config.label || key}
                {...register(key)}
                placeholder={`Enter ${config.label || key}`}
                error={!!errors[key]}
                helperText={errors[key]?.message}
                type={config.type || "text"}
              />
            </div>
          );
        })}
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

export default memo(GenericEditForm);
