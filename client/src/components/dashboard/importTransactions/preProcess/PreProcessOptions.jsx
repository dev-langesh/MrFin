import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import {
  selectImportFiles,
  selectOptions,
  updateState,
  setIsLoading,
  selectIsLoading,
} from "@/redux/slices/importTransactionsSlice";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import React, { useEffect, useState } from "react";
import { FaRegSquarePlus, FaRegSquareMinus } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import csv from "csvtojson";
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

export default function PreProcessOptions() {
  const [options, setOptions] = useState({
    delimiter: ",",
    removeCharacters: "",
    quote: '"',
  });
  const [isOpen, setIsOpen] = useState(true);
  const files = useSelector(selectImportFiles);
  const reduxOptions = useSelector(selectOptions);
  const isLoading = useSelector(selectIsLoading);

  const dispatch = useDispatch();

  useEffect(() => {
    if (reduxOptions) setOptions(reduxOptions);
  }, [reduxOptions]);

  // Auto-detect delimiter and quote when file changes
  useEffect(() => {
    if (files && files.length > 0) {
      detectAndProcess(files[0]);
    }
  }, [files]);

  async function detectAndProcess(file) {
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

      // Immediately process with detected options
      await processFile(file, newOptions);
    } catch (error) {
      console.error("Failed to auto-detect options:", error);
      toast.error("Failed to auto-detect CSV options.");
      dispatch(setIsLoading(false));
    }
  }

  function readFilePreview(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result.slice(0, 5000)); // Read first 5KB
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  function detectDelimiter(content) {
    const delimiters = [",", ";", "|", "\t", " "];
    const counts = delimiters.map((d) => ({
      delimiter: d,
      count: (content.match(new RegExp(`\\${d}`, "g")) || []).length,
    }));

    // Sort by count descending
    counts.sort((a, b) => b.count - a.count);
    return counts[0].count > 0 ? counts[0].delimiter : ",";
  }

  function detectQuote(content, delimiter) {
    // Simple heuristic: check if " is used more often near delimiters
    const quoteCount = (content.match(/"/g) || []).length;
    const singleQuoteCount = (content.match(/'/g) || []).length;
    return quoteCount >= singleQuoteCount ? '"' : "'";
  }

  function handleChange(name, value) {
    if (name === "removeCharacters" && value.trim().includes(options.delimiter))
      return toast.error(
        "Remove Characters cannot include the delimiter character"
      );
    setOptions((prev) => ({ ...prev, [name]: value }));
  }

  async function processFile(file, currentOptions) {
    dispatch(setIsLoading(true));
    try {
      const data = await new Promise((resolve, reject) => {
        try {
          const reader = new FileReader();
          reader.onload = async (event) => {
            let csvData = event.target.result;

            // Safe remove logic
            if (currentOptions.removeCharacters) {
              // Escape special regex characters
              const escapedChars = currentOptions.removeCharacters.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
              );
              const regex = new RegExp(`[${escapedChars}]`, "g");
              csvData = csvData.replace(regex, "");
            }

            try {
              const json = await csv({
                delimiter: currentOptions.delimiter,
                trim: true,
                quote: currentOptions.quote,
                checkType: true, // Auto-convert numbers/booleans
              }).fromString(csvData);

              // Validation: Check if parsing resulted in meaningful data
              if (json.length === 0) {
                throw new Error("Parsed data is empty.");
              }

              // Check if mostly single column (likely wrong delimiter)
              const keys = Object.keys(json[0]);
              if (
                keys.length < 2 &&
                csvData.includes(currentOptions.delimiter === "," ? ";" : ",")
              ) {
                // Heuristic warning, not blocking error
                toast.warning(
                  "Only 1 column detected. You might need to change the delimiter."
                );
              }

              resolve(json);
            } catch (parseError) {
              reject(
                new Error("Failed to parse CSV. Please check your options.")
              );
            }
          };
          reader.onerror = () => reject(new Error("Failed to read file."));
          reader.readAsText(file);
        } catch (e) {
          reject(e);
        }
      });

      dispatch(
        updateState({
          options: currentOptions,
          importedData: data,
        })
      );
      // Only show success toast if explicitly applied by user, or maybe just for errors?
      // For auto-detect, maybe silent success is better, but errors should be shown.
    } catch (error) {
      console.error("Process file error:", error);
      toast.error(error.message || "Failed to process file.");
      // Clear data on error so we don't show stale/bad data
      dispatch(updateState({ importedData: [] }));
    } finally {
      dispatch(setIsLoading(false));
    }
  }

  async function applyOptions() {
    await processFile(files[0], options);
    // toast.success("Options applied successfully.");
  }

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
