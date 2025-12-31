import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import {
  selectImportFileData,
  selectOptions,
  updateState,
  setIsLoading,
  fetchSettings,
  selectDeletedRowUids,
} from "@/redux/slices/importTransactionsSlice";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import React, { useEffect, useState, useCallback } from "react";
import { FaRegSquarePlus, FaRegSquareMinus } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { delimiterOptions, quoteOptions } from "./constants";
import { toast } from "sonner";
import {
  detectDelimiter,
  detectQuote,
  processFile,
} from "@/components/dashboard/importTransactions/utils/csvUtils";

function PreProcessOptions() {
  const dispatch = useDispatch();
  const fileData = useSelector(selectImportFileData);
  const options = useSelector(selectOptions);
  const deletedRowUids = useSelector(selectDeletedRowUids);

  const [isOpen, setIsOpen] = useState(true);

  const handleChange = useCallback(
    (name, value) => {
      if (
        name === "removeCharacters" &&
        value.trim().includes(options.delimiter)
      ) {
        return toast.error(
          "Remove Characters cannot include the delimiter character"
        );
      }
      dispatch(updateState({ options: { ...options, [name]: value } }));
    },
    [dispatch, options]
  );

  const handleProcessFile = useCallback(
    async (fileContent, currentOptions) => {
      if (!fileContent) return;

      try {
        dispatch(setIsLoading(true));
        let data = await processFile(fileContent, currentOptions);

        // Generate UIDs and Filter
        const headerOffset = currentOptions.hasHeader ? 1 : 0;

        data = data
          .map((row, index) => ({
            ...row,
            uid: `row-${index + headerOffset}`,
          }))
          .filter((row) => !deletedRowUids.includes(row.uid));

        dispatch(
          updateState({
            preProcessedData: data,
          })
        );
      } catch (error) {
        console.error("Process file error:", error);
        toast.error(error.message || "Failed to process file.");
      } finally {
        dispatch(setIsLoading(false));
      }
    },
    [dispatch, deletedRowUids]
  );

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  // Effect 1: Auto-process when options change
  useEffect(() => {
    if (fileData.length > 0) {
      handleProcessFile(fileData[0].content, options);
    }
  }, [fileData, options, handleProcessFile]);

  // Effect 2: Initial Detection
  useEffect(() => {
    if (fileData.length > 0) {
      const content = fileData[0].content;
      const delimiter = detectDelimiter(content);
      const quote = detectQuote(content, delimiter);

      // Prevent infinite loop: Only update if different
      if (options.delimiter !== delimiter || options.quote !== quote) {
        dispatch(updateState({ options: { ...options, delimiter, quote } }));
      }
    }
  }, [fileData, options.delimiter, options.quote, dispatch]); // Added specific option dependencies

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`px-0 rounded-sm py-3 md:py-5 relative gap-2`}>
        <CardHeader className={"max-md:px-3 " + (!isOpen && "gap-0 ")}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 cursor-pointer">
              {isOpen ? (
                <FaRegSquareMinus className="text-lg" />
              ) : (
                <FaRegSquarePlus className="text-lg" />
              )}
              <CardTitle className="text-base font-semibold">Options</CardTitle>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="max-md:px-4">
            <form className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2 w-full md:w-[calc(33.33%-1rem)]">
                <Label
                  htmlFor="delimiter"
                  info={"The character used to separate values in the CSV"}
                >
                  Delimiter
                </Label>
                <Select
                  value={options.delimiter}
                  onValueChange={(value) => handleChange("delimiter", value)}
                >
                  <SelectTrigger id="delimiter" className="w-full rounded-sm">
                    <SelectValue placeholder="Select Delimiter" />
                  </SelectTrigger>
                  <SelectContent>
                    {delimiterOptions.map((d, i) => (
                      <SelectItem key={`d-${i}`} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 w-full md:w-[calc(33.33%-1rem)]">
                <Label
                  htmlFor="quote"
                  info="The character used to quote fields in the CSV"
                >
                  Quote
                </Label>
                <Select
                  value={options.quote}
                  onValueChange={(value) => handleChange("quote", value)}
                >
                  <SelectTrigger id="quote" className="w-full rounded-sm">
                    <SelectValue placeholder="Select Quote" />
                  </SelectTrigger>
                  <SelectContent>
                    {quoteOptions.map((q, i) => (
                      <SelectItem key={`q-${i}`} value={q.value}>
                        {q.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-[calc(33.33%-1rem)]">
                <Input
                  type="text"
                  name="removeCharacters"
                  label="Remove Characters"
                  placeholder="Remove Characters"
                  value={options.removeCharacters}
                  onChange={(e) =>
                    handleChange("removeCharacters", e.target.value)
                  }
                  maxLength={10}
                  info="Characters to remove from the data (e.g., = \ ' )"
                />
              </div>

              <div className="flex items-center space-x-2 w-full md:w-[calc(33.33%-1rem)] h-10 mt-2">
                <Checkbox
                  id="hasHeader"
                  checked={options.hasHeader}
                  onCheckedChange={(checked) =>
                    handleChange("hasHeader", checked)
                  }
                />
                <label
                  htmlFor="hasHeader"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  File contains header row
                </label>
              </div>
            </form>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default React.memo(PreProcessOptions);
