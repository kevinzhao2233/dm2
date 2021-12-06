import { inject, observer } from "mobx-react";
import { RadioGroup } from "../../Common/RadioGroup/RadioGroup";
import { Tooltip } from "../../Common/Tooltip/Tooltip";

const viewInjector = inject(({ store }) => ({
  view: store.currentView,
}));

export const ViewToggle = viewInjector(observer(({ view, size, ...rest }) => {
  return (
    <RadioGroup
      size={size}
      value={view.type}
      onChange={(e) => view.setType(e.target.value)}
      {...rest}
    >
      <RadioGroup.Button value="list">
        <Tooltip title="列表视图">
          <span>列表</span>
        </Tooltip>
      </RadioGroup.Button>
      <RadioGroup.Button value="grid">
        <Tooltip title="卡片试图">
          <span>卡片</span>
        </Tooltip>
      </RadioGroup.Button>
    </RadioGroup>
  );
}));

export const DataStoreToggle = viewInjector(({ view, size, ...rest }) => {
  return (
    <RadioGroup
      value={view.target}
      size={size}
      onChange={(e) => view.setTarget(e.target.value)}
      {...rest}
    >
      <RadioGroup.Button value="tasks">
        Tasks
      </RadioGroup.Button>
      <RadioGroup.Button value="annotations" disabled>
        Annotations
      </RadioGroup.Button>
    </RadioGroup>
  );
});
