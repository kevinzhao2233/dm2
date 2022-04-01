import { format, isValid } from "date-fns";
import { zhCN } from "date-fns/locale";
import React from "react";

export const DateTimeCell = (column) => {
  const date = new Date(column.value);
  const dateFormat = "yyyy-MM-dd HH:mm:ss";

  return column.value ? (
    <div style={{ whiteSpace: "nowrap" }}>
      {isValid(date) ? format(date, dateFormat, { locale: zhCN }) : ""}
    </div>
  ) : (
    ""
  );
};

DateTimeCell.displayType = false;
