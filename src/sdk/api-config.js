/** @type {import("../utils/api-proxy").APIProxyOptions} */
export const APIConfig = {
  gateway: "/api/dm",
  endpoints: {
    /** Project base info */
    project: "/project",

    /** users list */
    users: "/../users",

    /** Available columns/fields of the dataset */
    columns: "/columns",

    /** Tabs (materialized views) */
    tabs: "/views",

    /** Single tab */
    tab: "/views/:tabId",

    /** Creates a new tab */
    createTab: {
      path: "/views",
      method: "post",
    },

    /** Update particular tab (PATCH) */
    updateTab: {
      path: "/views/:tabID",
      method: "patch",
    },

    /** Delete particular tab (DELETE) */
    deleteTab: {
      path: "/views/:tabID",
      method: "delete",
    },

    /** List of tasks (samples) in the dataset */
    tasks: "/../tasks",

    /** Per-task annotations (annotations, predictions) */
    annotations: "/views/:tabID/annotations",

    /** Single task (sample) */
    task: "/../tasks/:taskID",

    /** Next task (labelstream, default sequential) */
    nextTask: "/tasks/next",

    /** Single annotation */
    annotation: "/tasks/:taskID/annotations/:id",

    /** Submit annotation */
    submitAnnotation: {
      path: "/../tasks/:taskID/annotations",
      method: "post",
    },

    /** Update annotation */
    updateAnnotation: {
      path: "/../annotations/:annotationID",
      method: "patch",
    },

    /** Delete annotation */
    deleteAnnotation: {
      path: "/../annotations/:annotationID",
      method: "delete",
    },

    /** Task drafts */
    taskDrafts: "/../tasks/:taskID/drafts",
    
    /** 为现有标注创建草稿 */
    createDraftForAnnotation: {
      path: "/../tasks/:taskID/annotations/:annotationID/drafts",
      method: "post",
    },

    /** Create draft for new annotation */
    createDraftForTask: {
      path: "/../tasks/:taskID/drafts",
      method: "post",
    },

    /** Update draft by id */
    updateDraft: {
      path: "/../drafts/:draftID",
      method: "patch",
    },

    /** Delete draft by id */
    deleteDraft: {
      path: "/../drafts/:draftID",
      method: "delete",
    },

    /** Override selected items list (checkboxes) */
    setSelectedItems: {
      path: "/views/:tabID/selected-items",
      method: "post",
    },

    /** Add item to the current selection */
    addSelectedItem: {
      path: "/views/:tabID/selected-items",
      method: "patch",
    },

    /** List of available actions */
    actions: "/actions",

    /** Subtract item from the current selection */
    deleteSelectedItem: {
      path: "/views/:tabID/selected-items",
      method: "delete",
    },

    /** 调用特定的动作，使用参数中的 id 来区分，比如 next_task, next_review */
    invokeAction: {
      path: "/actions",
      method: "post",
    },
  },
};
