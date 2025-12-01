import { toast } from "sonner";

export function validateStepData(step, state) {
  let isValid = true;
  switch (step) {
    case 1:
      if (state.files?.length < 1) {
        toast.error("Please upload a file.");
        isValid = false;
      }
      break;
    case 2:
      break;
    case 3:
      if (state.mappedData.length === 0) {
        toast.error("No valid data to import. Please check the mapped fields.");
        isValid = false;
      } else {
        // Optimized single-pass validation
        const errorIds = [];
        let globalErrors = false;

        for (let i = 0; i < state.mappedData.length; i++) {
          const entry = state.mappedData[i];
          if (Object.keys(entry.errors || {}).length > 0) {
            errorIds.push(i + 1);
          }
          if (entry.errors?.amount) {
            globalErrors = true;
          }
        }

        if (errorIds.length > 0) {
          toast.error(
            `There are errors in the mapped data at IDs: ${errorIds
              .slice(0, 10)
              .join(", ")}. Please fix them before proceeding.`
          );
          isValid = false;
        }

        if (globalErrors) {
          toast.error(
            "Some entries are missing both Credit and Debit values. Please check your mapping."
          );
          isValid = false;
        }
      }
      break;
    case 4:
    default:
      isValid = true;
  }

  return isValid;
}
