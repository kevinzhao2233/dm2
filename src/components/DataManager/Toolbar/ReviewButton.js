import { inject } from "mobx-react";
import { Button } from "../../Common/Button/Button";

const injector = inject(({ store }) => {
  const { dataStore, currentView } = store;
  const totalTasks = store.project?.task_count ?? 0;
  const foundTasks = dataStore?.total ?? 0;

  return {
    store,
    canReview: (totalTasks > 0 || foundTasks > 0) && store.project.annotation_count > 0,
    target: currentView?.target ?? "tasks",
    selectedCount: currentView?.selectedCount,
    allSelected: currentView?.allSelected,
  };
});

export const ReviewButton = injector(({ store, size, canReview, target, selectedCount }) => {
  // const all = selectedCount === 0 || allSelected;
  console.log('reviewButton comp', { store, canReview, size, target, selectedCount });

  const disabled = target === "annotations";

  const onReview = () => {
    localStorage.setItem("dm:labelstream:mode", "all");
    store.startReviewStream();
  };

  const primaryStyle = {
    width: 130,
    padding: 0,
  };

  return canReview ? (
    <Button
      size={size}
      disabled={disabled}
      mod={{ size: "medium", look: "primary", disabled }}
      style={primaryStyle}
      onClick={onReview}
    >
      审核{selectedCount ? " " + selectedCount + " 个" : "所有"}任务
    </Button>
  ) : null;
});