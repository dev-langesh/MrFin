import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import React, { useEffect, useState, useCallback, memo } from "react";
import { FaRegSquarePlus, FaRegSquareMinus } from "react-icons/fa6";
import { RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import AddRuleForm from "./AddRuleForm";
import { useDispatch, useSelector } from "react-redux";
import {
  selectMappedData,
  selectPreProcessedData,
  selectMappedFields,
  updateState,
  setIsLoading,
  selectRules,
  selectDefaultRules,
  setRules,
  setDefaultRules,
} from "@/redux/slices/importTransactionsSlice";
import { applyRulesToData } from "@/components/dashboard/importTransactions/utils/ruleEngine";
import RuleList from "./RuleList";

function Rules() {
  const [open, setOpen] = useState(true);
  const [defaultRulesOpen, setDefaultRulesOpen] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState(null);
  const [isEditingDefaultRule, setIsEditingDefaultRule] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const mappedData = useSelector(selectMappedData);
  const preProcessedData = useSelector(selectPreProcessedData);
  const mappedFields = useSelector(selectMappedFields);
  const rules = useSelector(selectRules);
  const defaultRules = useSelector(selectDefaultRules);

  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize default rules if not present and fields are mapped
    if (
      defaultRules.length === 0 &&
      mappedFields.debit &&
      mappedFields.credit
    ) {
      const defaults = [
        {
          name: "Set Expense Type",
          source: mappedFields.debit,
          operation: "exists",
          operationValue: "",
          action: "update",
          target: "txnType",
          targetValue: "expense",
        },
        {
          name: "Set Income Type",
          source: mappedFields.credit,
          operation: "exists",
          operationValue: "",
          action: "update",
          target: "txnType",
          targetValue: "income",
        },
      ];
      dispatch(setDefaultRules(defaults));
    }
  }, [mappedFields, dispatch]);

  useEffect(() => {
    const hasLegacyDefaults = rules.some(
      (r) => r.name === "Set Expense Type" || r.name === "Set Income Type"
    );

    if (hasLegacyDefaults) {
      const cleanedRules = rules.filter(
        (r) => r.name !== "Set Expense Type" && r.name !== "Set Income Type"
      );
      dispatch(setRules(cleanedRules));
    }
  }, [rules, dispatch]);

  const applyRules = async () => {
    if (mappedData?.length > 0) {
      dispatch(setIsLoading(true));
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        const finalData = applyRulesToData(
          mappedData,
          [...defaultRules, ...rules],
          mappedFields,
          preProcessedData
        );
        dispatch(updateState({ transformedData: finalData }));
      } catch (error) {
        console.error("Failed to apply rules:", error);
      } finally {
        dispatch(setIsLoading(false));
      }
    }
  };

  useEffect(() => {
    applyRules();
  }, [
    mappedData,
    rules,
    defaultRules,
    mappedFields,
    preProcessedData,
    dispatch,
  ]);

  const handleAddRule = useCallback(
    (rule) => {
      dispatch(setRules([...rules, rule]));
    },
    [dispatch, rules]
  );

  const handleUpdateRule = useCallback(
    (rule) => {
      if (isEditingDefaultRule) {
        const newDefaults = [...defaultRules];
        newDefaults[editingRuleIndex] = rule;
        dispatch(setDefaultRules(newDefaults));
      } else {
        const newRules = [...rules];
        newRules[editingRuleIndex] = rule;
        dispatch(setRules(newRules));
      }
    },
    [dispatch, rules, editingRuleIndex, isEditingDefaultRule, defaultRules]
  );

  const handleDelete = useCallback(
    (index) => {
      dispatch(setRules(rules.filter((_, i) => i !== index)));
    },
    [dispatch, rules]
  );

  const handleDeleteDefaultRule = useCallback(
    (index) => {
      const newDefaults = defaultRules.filter((_, i) => i !== index);
      dispatch(setDefaultRules(newDefaults));
    },
    [dispatch, defaultRules]
  );

  const handleResetDefaultRules = useCallback(() => {
    if (mappedFields.debit && mappedFields.credit) {
      const defaults = [
        {
          name: "Set Expense Type",
          source: mappedFields.debit,
          operation: "exists",
          operationValue: "",
          action: "update",
          target: "txnType",
          targetValue: "expense",
        },
        {
          name: "Set Income Type",
          source: mappedFields.credit,
          operation: "exists",
          operationValue: "",
          action: "update",
          target: "txnType",
          targetValue: "income",
        },
      ];
      dispatch(setDefaultRules(defaults));
    }
  }, [mappedFields, dispatch]);

  const handleEdit = useCallback((index) => {
    setEditingRuleIndex(index);
    setIsEditingDefaultRule(false);
    setIsDialogOpen(true);
  }, []);

  const handleEditDefaultRule = useCallback((index) => {
    setEditingRuleIndex(index);
    setIsEditingDefaultRule(true);
    setIsDialogOpen(true);
  }, []);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="px-0 rounded-sm py-3 md:py-5 relative gap-2">
        <CardHeader className={"max-md:px-3 " + (!open ? "gap-0" : "")}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 cursor-pointer">
              {open ? (
                <FaRegSquareMinus className="text-lg" />
              ) : (
                <FaRegSquarePlus className="text-lg" />
              )}
              <CardTitle className="text-base font-semibold">
                Transform Rules ({rules.length + defaultRules.length})
              </CardTitle>
            </CollapsibleTrigger>
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) {
                    setEditingRuleIndex(null);
                    setIsEditingDefaultRule(false);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm">Add Rule</Button>
                </DialogTrigger>
                <DialogContent className="w-full md:max-w-[720px]">
                  <AddRuleForm
                    close={() => {
                      setIsDialogOpen(false);
                      setEditingRuleIndex(null);
                      setIsEditingDefaultRule(false);
                    }}
                    initialData={
                      editingRuleIndex !== null
                        ? isEditingDefaultRule
                          ? defaultRules[editingRuleIndex]
                          : rules[editingRuleIndex]
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
          <CardContent className="max-md:px-3 space-y-4 max-h-[200px] overflow-y-auto">
            {/* Default Rules Collapsible */}
            <Collapsible
              open={defaultRulesOpen}
              onOpenChange={setDefaultRulesOpen}
              className="border rounded-sm p-3 bg-muted/30"
            >
              <div className="flex items-center justify-between w-full">
                <CollapsibleTrigger className="flex items-center gap-2 cursor-pointer flex-1">
                  {defaultRulesOpen ? (
                    <FaRegSquareMinus className="text-sm text-muted-foreground" />
                  ) : (
                    <FaRegSquarePlus className="text-sm text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium text-muted-foreground">
                    Default Rules ({defaultRules.length})
                  </span>
                </CollapsibleTrigger>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResetDefaultRules();
                      }}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reset Default Rules</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CollapsibleContent className="pt-3">
                <RuleList
                  rules={defaultRules}
                  onEdit={handleEditDefaultRule}
                  onDelete={handleDeleteDefaultRule}
                  className="max-h-[200px]"
                />
              </CollapsibleContent>
            </Collapsible>

            <RuleList
              rules={rules}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default memo(Rules);
