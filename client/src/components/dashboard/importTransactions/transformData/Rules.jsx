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
  updateState,
} from "@/redux/slices/importTransactionsSlice";
import { useAuth } from "@/context/AuthProvider";

export default function Rules() {
  const [open, setOpen] = useState(true);
  const [editingRuleIndex, setEditingRuleIndex] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rules, setRules] = useState([
    {
      name: "Set Expense Type",
      source: "debit",
      operation: "exists",
      operationValue: "",
      action: "update",
      target: "txnType",
      targetValue: "expense",
    },
    {
      name: "Set Revenue Type",
      source: "credit",
      operation: "exists",
      operationValue: "",
      action: "update",
      target: "txnType",
      targetValue: "revenue",
    },
  ]);
  const mappedData = useSelector(selectMappedData);
  const { auth } = useAuth();
  const dispatch = useDispatch();

  useEffect(() => {
    if (mappedData?.length > 0) {
      applyRules();
    }
  }, [mappedData, rules, auth]);

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
    let newData = [...mappedData];

    rules.forEach((rule) => {
      newData = newData.filter((row) => {
        if (rule.action === "delete") {
          return !checkCondition(row, rule);
        }
        return true;
      });

      newData = newData.map((row) => {
        if (rule.action === "update") {
          if (checkCondition(row, rule)) {
            return { ...row, [rule.target]: rule.targetValue };
          }
        }
        return row;
      });
    });

    // Filter fields and format amount
    newData = newData.map((row) => {
      const credit = parseFloat(String(row.credit || "0").replace(/,/g, ""));
      const debit = parseFloat(String(row.debit || "0").replace(/,/g, ""));
      const amount = Math.abs(credit > 0 ? credit : debit > 0 ? -debit : 0);

      return {
        txnDate: row.txnDate,
        description: row.description,
        amount: amount,
        txnType: row.txnType,
        category: row.category,
        userId: auth?.user?._id,
      };
    });

    dispatch(updateState({ transformedData: newData }));
  }

  function checkCondition(row, rule) {
    const value = row[rule.source];
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
