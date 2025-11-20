import React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import { FaCircleInfo } from 'react-icons/fa6';
import { cn } from '@/lib/utils';

export default function Info({ info ,className}) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <FaCircleInfo className={cn("text-muted-foreground size-3", className)} />
      </TooltipTrigger>
      <TooltipContent>{info}</TooltipContent>
    </Tooltip>
  );
}
