import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import {
  selectImportFiles,
  selectOptions,
  updateState,
  setIsLoading,
  selectIsLoading,
  fetchSettings,
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
import Loading from "@/components/ui/Loading";
import {
  detectDelimiter,
  detectQuote,
  readFilePreview,
  processFile,
} from "@/utils/csvUtils";

function PreProcessOptions() {
  const dispatch = useDispatch();
  const files = useSelector(selectImportFiles);
  const reduxOptions = useSelector(selectOptions);
  const isLoading = useSelector(selectIsLoading);

  const [options, setOptions] = useState(reduxOptions);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    setOptions(reduxOptions);
  }, [reduxOptions]);

  useEffect(() => {
    if (files.length > 0) {
      detectAndProcess(files[0]);
    }
  }, [files]);

  const handleChange = useCallback(
    (name, value) => {
      if (
        name === "removeCharacters" &&
        value.trim().includes(options.delimiter)
      )
        return toast.error(
          "Remove Characters cannot include the delimiter character"
        );
      setOptions((prev) => ({ ...prev, [name]: value }));
    },
    [options.delimiter]
  );

  const handleProcessFile = useCallback(
    async (file, currentOptions) => {
      dispatch(setIsLoading(true));
      try {
        const data = await processFile(file, currentOptions);

        dispatch(
          updateState({
            options: currentOptions,
            importedData: data,
          })
        );
      } catch (error) {
        console.error("Process file error:", error);
        toast.error(error.message || "Failed to process file.");
        dispatch(updateState({ importedData: [] }));
      } finally {
        dispatch(setIsLoading(false));
      }
    },
    [dispatch]
  );

  const detectAndProcess = useCallback(
    async (file) => {
      try {
        dispatch(setIsLoading(true));
        const content = await readFilePreview(file);
        const detectedDelimiter = detectDelimiter(content);
        const detectedQuote = detectQuote(content, detectedDelimiter);

        const newOptions = {
          ...options,
          delimiter: detectedDelimiter,
          quote: detectedQuote,
        };

        setOptions(newOptions);

        await handleProcessFile(file, newOptions);
      } catch (error) {
        console.error("Failed to auto-detect options:", error);
        toast.error("Failed to auto-detect CSV options.");
        dispatch(setIsLoading(false));
      }
    },
    [dispatch, options, handleProcessFile]
  );

  const applyOptions = useCallback(async () => {
    await handleProcessFile(files[0], options);
    // toast.success("Options applied successfully.");
  }, [files, options, handleProcessFile]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`px-0 rounded-sm py-5`}>
        <CardHeader className={"" + (!isOpen && "gap-0 ")}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 cursor-pointer">
              {isOpen ? (
                <FaRegSquareMinus className="text-lg" />
              ) : (
                <FaRegSquarePlus className="text-lg" />
              )}
              <CardTitle>Options</CardTitle>
            </CollapsibleTrigger>

            <Button size="sm" onClick={applyOptions} disabled={isLoading}>
              {isLoading ? <Loading size="sm" text="Applying..." /> : "Apply"}
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <form className="flex flex-wrap gap-4 ">
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
            </form>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default React.memo(PreProcessOptions);
