import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";

function RuleList({ rules, onEdit, onDelete }) {
  if (rules.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">No rules added yet.</div>
    );
  }

  return (
    <div className="flex flex-col gap-4 items-start w-full">
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
                <span className="font-semibold">{rule.operationValue}</span>{" "}
                then {rule.action}{" "}
                {rule.action === "update" && (
                  <>
                    <span className="font-semibold">{rule.target}</span> to{" "}
                    <span className="font-semibold">{rule.targetValue}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(index)}
              className="text-black hover:text-black/80 rounded-[2px] h-8 w-8"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(index)}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 rounded-[2px] h-8 w-8"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(RuleList);
