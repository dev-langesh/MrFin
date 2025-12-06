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
      }
      if (state.errorIndices && state.errorIndices.length > 0) {
        toast.error(
          `Please fix ${state.errorIndices.length} errors before proceeding.`
        );
        isValid = false;
      }
      break;
    default:
      isValid = true;
  }

  return isValid;
}
