import React from "react";

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: string;
  className?: string;
  children: React.ReactNode;
}

export function ScrollArea({
  type,
  className = "",
  children,
  style,
  ...props
}: ScrollAreaProps) {
  return (
    <div
      className={`overflow-y-auto ${className}`}
      style={{
        overflowY: "auto",
        scrollbarWidth: "thin",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export default ScrollArea;
