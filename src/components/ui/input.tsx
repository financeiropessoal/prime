import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[2px] border border-stone-300 bg-white px-3 py-2 text-sm transition-colors outline-none placeholder:text-stone-400 focus-visible:border-[#e8590c] focus-visible:ring-1 focus-visible:ring-[#e8590c]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-stone-100 disabled:opacity-70 text-stone-900",
        className
      )}
      {...props}
    />
  )
}

export { Input }
