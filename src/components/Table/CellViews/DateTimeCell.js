import { format, isValid } from "date-fns";
import React from "react";

export const DateTimeCell = (column) => {
  const date = new Date(column.value);
  const dateFormat = "yyyy-MM-dd HH:mm:ss";

  return column.value ? (
    <div style={{ whiteSpace: "nowrap" }}>
      {isValid(date) ? format(date, dateFormat) : ""}
    </div>
  ) : (
    ""
  );
};

DateTimeCell.displayType = false;
