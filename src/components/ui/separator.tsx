import React from "react";

export function Separator({
  orientation = "horizontal",
  className = "",
  style,
  ...props
}: {
  orientation?: "horizontal" | "vertical";
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}) {
  const isVertical = orientation === "vertical";
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      style={{
        width: isVertical ? "1px" : "100%",
        height: isVertical ? "60%" : "1px",
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        margin: isVertical ? "0 4px" : "4px 0",
        alignSelf: "center",
        ...style,
      }}
      className={className}
      {...props}
    />
  );
}

export default Separator;

