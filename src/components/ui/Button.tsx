import { forwardRef } from "react";
import { BTN, BTN_SIZE, cn, type BtnVariant, type BtnSize } from "@/lib/design-tokens";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: BtnSize;
  fullWidth?: boolean;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", fullWidth, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 transition-colors disabled:cursor-not-allowed",
        BTN[variant],
        BTN_SIZE[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Button;
