import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import React, { useState } from "react";
import { FaRegSquarePlus, FaRegSquareMinus } from "react-icons/fa6";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import AddRuleForm from "./AddRuleForm";
import { Edit2, Trash2 } from "lucide-react";

export default function Rules() {
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState([]);

  function applyRules(e) {
    e.stopPropagation();
  }

  return (
    <Collapsible>
      <Card className=" rounded-sm p-3">
        <CardHeader className={"px-1 " + (!open && "gap-0 ")}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger
              className="flex items-center gap-2 flex-1 cursor-pointer"
              onClick={() => setOpen((p) => !p)}
            >
              {open ? (
                <FaRegSquareMinus className="text-lg" />
              ) : (
                <FaRegSquarePlus className="text-lg" />
              )}
              <CardTitle>Transform Rules</CardTitle>
              {/* <Button onClick={saveRules} size="sm" variant="outline">
                Save Rules
                </Button> */}
            </CollapsibleTrigger>

            <Dialog onClick={(e) => e.stopPropagation()}>
              <DialogTrigger>
                <Button size="sm">Add Rule</Button>
              </DialogTrigger>
              <DialogContent className="w-full md:max-w-[720px]">
                <AddRuleForm setRules={setRules} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="flex flex-col gap-4 items-start">
              {rules.map((rule, index) => (
                <div
                  key={index}
                  className="px-4 py-1 border rounded-sm w-full shadow-sm flex items-center justify-between gap-4"
                >
                  <h3 className="text-muted-foreground">{rule.name}</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRows([i])}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRows([i])}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Edit2 className="w-4 h-4" />
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
