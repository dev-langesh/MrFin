import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import React, { useEffect, useState } from "react";
import { FaRegSquarePlus, FaRegSquareMinus } from "react-icons/fa6";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import AddRuleForm from "./AddRuleForm";
import { Edit2, Trash2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectMappedData,
  selectImportData,
  selectMappedFields,
  updateState,
} from "@/redux/slices/importTransactionsSlice";

export default function Rules() {
  const [open, setOpen] = useState(true);
  const [editingRuleIndex, setEditingRuleIndex] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rules, setRules] = useState([]);
  const mappedData = useSelector(selectMappedData);
  const importedData = useSelector(selectImportData);
  const mappedFields = useSelector(selectMappedFields);
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize default rules if not already set and mappedFields are available
    if (rules.length === 0 && mappedFields) {
      setRules([
        {
          name: "Set Expense Type",
          source: mappedFields.debit || "Debit", // Use mapped field or fallback
          operation: "exists",
          operationValue: "",
          action: "update",
          target: "txnType",
          targetValue: "expense",
        },
        {
          name: "Set Revenue Type",
          source: mappedFields.credit || "Credit", // Use mapped field or fallback
          operation: "exists",
          operationValue: "",
          action: "update",
          target: "txnType",
          targetValue: "revenue",
        },
      ]);
    }
  }, [mappedFields, rules.length]);

  useEffect(() => {
    if (mappedData?.length > 0) {
      applyRules();
    }
  }, [mappedData, rules]);

  function handleAddRule(rule) {
    setRules((prev) => [...prev, rule]);
  }

  function handleUpdateRule(rule) {
    setRules((prev) => {
      const newRules = [...prev];
      newRules[editingRuleIndex] = rule;
      return newRules;
    });
  }

  function applyRules(e) {
    e?.stopPropagation();
    if (!mappedData) return;

    // Pre-compute keys for faster access
    const creditKey = mappedFields.credit;
    const debitKey = mappedFields.debit;
    const txnDateKey = mappedFields.txnDate;
    const descKey = mappedFields.description;

    const finalData = [];

    // Single pass optimization: O(N * R) instead of O(R * 2N)
    for (let i = 0; i < mappedData.length; i++) {
      // Create a mutable copy of the row with original index
      let row = { ...mappedData[i], _originalIndex: i };
      let keepRow = true;
      let rowAppliedRules = [];

      for (let j = 0; j < rules.length; j++) {
        const rule = rules[j];
        const matches = checkCondition(row, rule, importedData);

        if (rule.action === "delete") {
          if (matches) {
            keepRow = false;
            break; // Stop processing rules for this row if deleted
          }
        } else if (rule.action === "update") {
          if (matches) {
            row[rule.target] = rule.targetValue;
            rowAppliedRules.push({ index: j + 1, name: rule.name });
          }
        }
      }

      if (keepRow) {
        // Transform logic
        const credit = parseFloat(
          String(row[creditKey] || "0").replace(/,/g, "")
        );
        const debit = parseFloat(
          String(row[debitKey] || "0").replace(/,/g, "")
        );
        const amount = Math.abs(credit > 0 ? credit : debit > 0 ? -debit : 0);

        finalData.push({
          txnDate: row[txnDateKey],
          description: row[descKey],
          amount: amount,
          txnType: row.txnType,
          category: row.category,
          _originalIndex: row._originalIndex,
          appliedRules: rowAppliedRules,
        });
      }
    }

    dispatch(updateState({ transformedData: finalData }));
  }

  function checkCondition(row, rule, importedData) {
    // If source is in row (mappedData), use it. Otherwise use importedData.
    // row has _originalIndex.
    let value = row[rule.source];

    if (value === undefined) {
      // Not in mapped data, check imported data
      const originalIndex = row._originalIndex;
      if (
        originalIndex !== undefined &&
        importedData &&
        importedData[originalIndex]
      ) {
        value = importedData[originalIndex][rule.source];
      }
    }

    const opValue = rule.operationValue;

    const numValue = Number(String(value).replace(/,/g, ""));
    const numOpValue = Number(String(opValue).replace(/,/g, ""));

    switch (rule.operation) {
      case "=":
        return value == opValue;
      case "!=":
        return value != opValue;
      case "<":
        return !isNaN(numValue) && !isNaN(numOpValue) && numValue < numOpValue;
      case "<=":
        return !isNaN(numValue) && !isNaN(numOpValue) && numValue <= numOpValue;
      case ">":
        return !isNaN(numValue) && !isNaN(numOpValue) && numValue > numOpValue;
      case ">=":
        return !isNaN(numValue) && !isNaN(numOpValue) && numValue >= numOpValue;
      case "contains":
        return String(value)
          .toLowerCase()
          .includes(String(opValue).toLowerCase());
      case "not-contain":
        return !String(value)
          .toLowerCase()
          .includes(String(opValue).toLowerCase());
      case "starts-with":
        return String(value)
          .toLowerCase()
          .startsWith(String(opValue).toLowerCase());
      case "ends-with":
        return String(value)
          .toLowerCase()
          .endsWith(String(opValue).toLowerCase());
      case "exists":
        return value !== undefined && value !== null && value !== "";
      case "not-exists":
        return value === undefined || value === null || value === "";
      default:
        return false;
    }
  }

  function handleDelete(index) {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className=" rounded-sm p-3">
        <CardHeader className={"px-1 " + (!open && "gap-0 ")}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 cursor-pointer">
              {open ? (
                <FaRegSquareMinus className="text-lg" />
              ) : (
                <FaRegSquarePlus className="text-lg" />
              )}
              <CardTitle>Transform Rules</CardTitle>
            </CollapsibleTrigger>
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) setEditingRuleIndex(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm">Add Rule</Button>
                </DialogTrigger>
                <DialogContent className="w-full md:max-w-[720px]">
                  <AddRuleForm
                    close={() => setIsDialogOpen(false)}
                    initialData={
                      editingRuleIndex !== null
                        ? rules[editingRuleIndex]
                        : undefined
                    }
                    index={
                      editingRuleIndex !== null ? editingRuleIndex : undefined
                    }
                    onSubmit={
                      editingRuleIndex !== null
                        ? handleUpdateRule
                        : handleAddRule
                    }
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="flex flex-col gap-4 items-start">
              {rules.length === 0 && (
                <div className="text-muted-foreground text-sm">
                  No rules added yet.
                </div>
              )}
              {rules.map((rule, index) => (
                <div
                  key={index}
                  className="px-4 py-2 border rounded-sm w-full shadow-sm flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="font-mono text-sm text-muted-foreground bg-muted w-6 h-6 flex items-center justify-center rounded-[2px] shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex flex-col overflow-hidden">
                      <h3 className="font-medium truncate" title={rule.name}>
                        {rule.name}
                      </h3>
                      <p
                        className="text-xs text-muted-foreground truncate"
                        title={`If ${rule.source} ${rule.operation} ${
                          rule.operationValue
                        } then ${rule.action} ${
                          rule.action === "update"
                            ? `${rule.target} to ${rule.targetValue}`
                            : ""
                        }`}
                      >
                        If <span className="font-semibold">{rule.source}</span>{" "}
                        {rule.operation}{" "}
                        <span className="font-semibold">
                          {rule.operationValue}
                        </span>{" "}
                        then {rule.action}{" "}
                        {rule.action === "update" && (
                          <>
                            <span className="font-semibold">{rule.target}</span>{" "}
                            to{" "}
                            <span className="font-semibold">
                              {rule.targetValue}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingRuleIndex(index);
                        setIsDialogOpen(true);
                      }}
                      className="text-black hover:text-black/80 rounded-[2px] h-8 w-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(index)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 rounded-[2px] h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
