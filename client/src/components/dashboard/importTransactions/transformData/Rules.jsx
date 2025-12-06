import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import React, { useEffect, useState, useCallback, memo } from "react";
import { FaRegSquarePlus, FaRegSquareMinus } from "react-icons/fa6";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import AddRuleForm from "./AddRuleForm";
import { useDispatch, useSelector } from "react-redux";
import {
  selectMappedData,
  selectImportData,
  selectMappedFields,
  updateState,
  setIsLoading,
  selectRules,
  setRules,
} from "@/redux/slices/importTransactionsSlice";
import { applyRulesToData } from "@/utils/ruleEngine";
import RuleList from "./RuleList";

function Rules() {
  const [open, setOpen] = useState(true);
  const [editingRuleIndex, setEditingRuleIndex] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const mappedData = useSelector(selectMappedData);
  const importedData = useSelector(selectImportData);
  const mappedFields = useSelector(selectMappedFields);
  const rules = useSelector(selectRules);

  const dispatch = useDispatch();

  useEffect(() => {
    if (rules.length === 0 && mappedFields) {
      dispatch(
        setRules([
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
            name: "Set Revenue Type",
            source: mappedFields.credit,
            operation: "exists",
            operationValue: "",
            action: "update",
            target: "txnType",
            targetValue: "revenue",
          },
        ])
      );
    }
  }, [mappedFields, rules.length, dispatch]);

  useEffect(() => {
    const applyRules = async () => {
      if (mappedData?.length > 0) {
        dispatch(setIsLoading(true));
        await new Promise((resolve) => setTimeout(resolve, 100));

        try {
          const finalData = applyRulesToData(
            mappedData,
            rules,
            mappedFields,
            importedData
          );
          dispatch(updateState({ transformedData: finalData }));
        } catch (error) {
          console.error("Failed to apply rules:", error);
        } finally {
          dispatch(setIsLoading(false));
        }
      }
    };

    applyRules();
  }, [mappedData, rules, mappedFields, importedData, dispatch]);

  const handleAddRule = useCallback(
    (rule) => {
      dispatch(setRules([...rules, rule]));
    },
    [dispatch, rules]
  );

  const handleUpdateRule = useCallback(
    (rule) => {
      const newRules = [...rules];
      newRules[editingRuleIndex] = rule;
      dispatch(setRules(newRules));
    },
    [dispatch, rules, editingRuleIndex]
  );

  const handleDelete = useCallback(
    (index) => {
      dispatch(setRules(rules.filter((_, i) => i !== index)));
    },
    [dispatch, rules]
  );

  const handleEdit = useCallback((index) => {
    setEditingRuleIndex(index);
    setIsDialogOpen(true);
  }, []);

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
