import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import {
  selectImportData,
  selectImportFiles,
  selectOptions,
  setState,
  updateState,
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

export default function PreProcessOptions() {
  const [options, setOptions] = useState({
    delimiter: ",",
    removeCharacters: "",
    quote: '"',
  });
  const [isOpen, setIsOpen] = useState(true);
  const files = useSelector(selectImportFiles);
  const reduxOptions = useSelector(selectOptions);

  const dispatch = useDispatch();

  useEffect(() => {
    if (reduxOptions) setOptions(reduxOptions);
  }, [reduxOptions]);

  function handleChange(name, value) {
    if (name === "removeCharacters" && value.trim().includes(options.delimiter))
      return toast.error(
        "Remove Characters cannot include the delimiter character"
      );
    setOptions((prev) => ({ ...prev, [name]: value }));
  }

  async function applyOptions() {
    const data = await new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          let csvData = event.target.result;
          if (options.removeCharacters) {
            const regex = new RegExp(`[${options.removeCharacters}]`, "g");
            csvData = csvData.replace(regex, "");
          }
          const json = await csv({
            delimiter: options.delimiter,
            trim: true,
            quote: options.quote,
          }).fromString(csvData);

          console.log(json);
          resolve(json);
        };
        reader.readAsText(files[0]);
      } catch (e) {
        reject(e);
      }
    });

    dispatch(
      updateState({
        options,
        data,
      })
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`px-0 rounded-sm p-3`}>
        <CardHeader className={"px-0 " + (!isOpen && "gap-0 ")}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 cursor-pointer">
              {isOpen ? (
                <FaRegSquareMinus className="text-lg" />
              ) : (
                <FaRegSquarePlus className="text-lg" />
              )}
              <CardTitle>Options</CardTitle>
            </CollapsibleTrigger>

            <Button size="sm" onClick={applyOptions}>
              Apply
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <form className="grid grid-cols-3 gap-4">
              <div className="space-y-2 max-md:col-span-3">
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
              <div className="space-y-2 max-md:col-span-3">
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
              <div className="max-md:grid-cols-3">
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
              <div className="max-md:grid-cols-3"></div>
            </form>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
