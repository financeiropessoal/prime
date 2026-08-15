import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[2px] border border-transparent bg-clip-padding text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[#d9480f] shadow-none",
        outline:
          "border-stone-300 bg-background text-stone-800 hover:bg-stone-100 hover:text-stone-900",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-stone-200 font-semibold",
        ghost:
          "hover:bg-stone-100 hover:text-stone-900 font-semibold text-stone-700",
        destructive:
          "bg-destructive text-white hover:bg-red-700",
        link: "text-primary underline-offset-4 hover:underline lowercase normal-case tracking-normal font-normal",
      },
      size: {
        default:
          "h-10 gap-2 px-4",
        xs: "h-7 gap-1 px-2.5 text-[10px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 text-[11px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-6 text-sm",
        icon: "size-10",
        "icon-xs":
          "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
