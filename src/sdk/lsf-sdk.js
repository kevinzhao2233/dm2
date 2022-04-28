/** @typedef {import("../stores/Tasks").TaskModel} Task */
/** @typedef {import("label-studio").LabelStudio} LabelStudio */
/** @typedef {import("./dm-sdk").DataManager} DataManager */

/** @typedef {{
 * user: Dict
 * config: string,
 * interfaces: string[],
 * task: Task
 * labelStream: boolean,
 * interfacesModifier: function,
 * }} LSFOptions */

import { isDefined } from "../utils/utils";
// import { LSFHistory } from "./lsf-history";
import { annotationToServer, taskToLSFormat } from "./lsf-utils";
import annotationOperateStatus from '../utils/annotationOperateStatus';

const DEFAULT_INTERFACES = [
  "basic",
  "controls",
  "submit",
  "update",
  "predictions",
  "topbar",
  "predictions:menu", // right menu with prediction items
  "annotations:menu", // right menu with annotation items
  "annotations:current",
  "annotations:history",
  "side-column", // entity
  "edit-history", // undo/redo
];

// lsf 里 src/LabelStudio.js 定义的 LabelStudio 类
let LabelStudioDM;

const resolveLabelStudio = async () => {
  if (LabelStudioDM) {
    return LabelStudioDM;
  } else if (window.LabelStudio) {
    return (LabelStudioDM = window.LabelStudio);
  }
};

export class LSFWrapper {
  /** @type {HTMLElement} */
  root = null;

  /** @type {DataManager} */
  datamanager = null;

  /** @type {Task} */
  task = null;

  /** @type {Annotation} */
  initialAnnotation = null;

  /** @type {LabelStudio} */
  lsf = null;

  /** @type {LSFHistory} */
  // history = null;

  /** @type {boolean} */
  labelStream = false;

  /** @type {boolean} */
  isInteractivePreannotations = false;

  /** @type {function} */
  interfacesModifier = (interfaces) => interfaces;

  /**
   * 在 dm-sdk 中 initLSF() 方法中调用
   * @param {DataManager} dm，即 dm-sdk 中的 this
   * @param {HTMLElement} element .lsf-container
   * @param {LSFOptions} options  组装的参数
   */
  constructor(dm, element, options) {
    this.datamanager = dm;
    this.root = element;
    this.projectId = options.projectId;
    this.task = options.task;
    this.labelStream = options.isLabelStream ?? false;
    this.initialAnnotation = options.annotation;
    this.interfacesModifier = options.interfacesModifier;
    this.isInteractivePreannotations = options.isInteractivePreannotations ?? false;
    // this.history = this.labelStream ? new LSFHistory(this) : null;

    let interfaces = [...DEFAULT_INTERFACES];

    if (this.project.enable_empty_annotation === false) {
      interfaces.push("annotations:deny-empty");
    }
    // console.log('--->> new LSF\n', { 'this.datamanager': this.datamanager, element, options, project: this.project });
    if (this.labelStream) {
      interfaces.push("infobar");
      interfaces.push("topbar:prevnext");
      if (this.project.show_skip_button) {
        interfaces.push("skip");
      }
    } else {
      interfaces.push(
        "infobar", // 标注界面下方的信息栏
        "annotations:add-new", // 添加新的标注
        "annotations:view-all", // 查看所有标注
        "annotations:delete",
        "annotations:tabs", // 添加新标注那个下拉框
        "predictions:tabs",
      );
    }

    if (this.datamanager.hasInterface('instruction')) {
      interfaces.push('instruction');
    }

    if (!this.labelStream && this.datamanager.hasInterface('groundTruth')) {
      interfaces.push('ground-truth');
    }

    if (this.datamanager.hasInterface("autoAnnotation")) {
      interfaces.push("auto-annotation");
    }

    if (this.datamanager.hasInterface("review")) {
      interfaces.push("review");
      interfaces.push("annotations:tabs");
    }

    if (this.interfacesModifier) {
      interfaces = this.interfacesModifier(interfaces, this.labelStream);
    }

    const lsfProperties = {
      user: options.user,
      config: this.lsfConfig,
      projectId: this.projectId,
      task: taskToLSFormat(this.task),
      description: this.instruction,
      interfaces,
      users: dm.store.users.map(u => u.toJSON()),
      keymap: options.keymap,
      forceAutoAnnotation: this.isInteractivePreannotations,
      forceAutoAcceptSuggestions: this.isInteractivePreannotations,
      panels: this.datamanager.panels,
      /* EVENTS */
      onSubmitDraft: this.onSubmitDraft,
      onLabelStudioLoad: this.onLabelStudioLoad,
      onTaskLoad: this.onTaskLoad,
      onProjectFetch: this.onProjectFetch,
      onStorageInitialized: this.onStorageInitialized,
      onSubmitAnnotation: this.onSubmitAnnotation,
      onUpdateAnnotation: this.onUpdateAnnotation,
      onDeleteAnnotation: this.onDeleteAnnotation,
      onAcceptAnnotation: this.onAcceptAnnotation,
      onRejectAnnotation: this.onRejectAnnotation,
      onSkipTask: this.onSkipTask,
      onCancelSkippingTask: this.onCancelSkippingTask,
      onGroundTruth: this.onGroundTruth,
      onEntityCreate: this.onEntityCreate,
      onEntityDelete: this.onEntityDelete,
      onSelectAnnotation: this.onSelectAnnotation,
      onNextTask: this.onNextTask,
      onPrevTask: this.onPrevTask,
    };

    this.initLabelStudio(lsfProperties);
  }

  /** @private */
  async initLabelStudio(settings) {
    try {
      const LSF = await resolveLabelStudio();

      this.globalLSF = window.LabelStudio === LSF;
      // 实例化 lsf，类在 lsf/src/LabelStudio.js 中定义
      this.lsfInstance = new LSF(this.root, settings);

      const names = Array.from(this.datamanager.callbacks.keys())
        .filter(k => k.startsWith('lsf:'));

      names.forEach(name => {
        this.datamanager.getEventCallbacks(name).forEach(clb => {
          this.lsfInstance.on(name.replace(/^lsf:/, ''), clb);
        });
      });
    } catch (err) {
      console.error("初始化 LabelStudio 失败！settings:", settings);
      console.error(err);
    }
  }

  /** @private */
  async loadTask(taskID, annotationID, fromHistory = false) {

    console.log('dm - lsf-sdk.js loadTask');

    if (!this.lsf) {
      return console.error("请确保 LSF 被正确初始化");
    }

    const tasks = this.datamanager.store.taskStore;

    const newTask = await this.withinLoadingState(async () => {
      if (!isDefined(taskID)) {
        return tasks.loadNextTask({ review: this.datamanager.hasInterface("review") });
      } else {
        return tasks.loadTask(taskID);
      }
    });

    /* 如果 labelStream 中没有任务，则结束，让 noTask 为 true */
    if (this.labelStream && !newTask) {
      this.lsf.setFlags({ noTask: true });
      return;
    } else {
      // don't break the LSF - if user explores tasks after finishing labeling, show them
      // 不要破坏 LSF——如果用户在完成标记后探索任务，请展示它们
      this.lsf.setFlags({ noTask: false });
    }

    // 从接收的任务添加新数据
    if (newTask) this.selectTask(newTask, annotationID, fromHistory);
  }

  /**
   * 选择任务，dm-sdk 中 startLabeling() 调用了
   * @param {object} 当前选择的任务
   * @param {*} 最新的 annotationID 
   * @param {*} fromHistory 
   */
  selectTask(task, annotationID, fromHistory = false) {
    const needsAnnotationsMerge = task && this.task?.id === task.id;
    const annotations = needsAnnotationsMerge ? [...this.annotations] : [];

    this.task = task;

    if (needsAnnotationsMerge) {
      this.task.mergeAnnotations(annotations);
    }

    this.setLoading(false);

    if (task.history) {
      task.annotationHistory = task.history;
    }

    const lsfTask = taskToLSFormat(task);

    this.lsf.resetState();
    this.lsf.assignTask(task);
    this.lsf.initializeStore(lsfTask);
    this.setAnnotation(annotationID, fromHistory);
  }

  /**
   * 设置标注结果
   * @param {*} annotationID 
   * @param {*} fromHistory 
   */
  /** @private */
  setAnnotation(annotationID, fromHistory = false) {
    const id = annotationID ? annotationID.toString() : null;
    let { annotationStore: cs } = this.lsf;
    let annotation;
    const activeDrafts = cs.annotations.map(a => a.draftId).filter(Boolean);
    const isReview = this.datamanager.hasInterface("review");

    // 加载草稿，但在审核状态不加载
    if (this.task.drafts && !isReview) {
      for (const draft of this.task.drafts) {
        if (activeDrafts.includes(draft.id)) continue;
        let c;

        if (draft.annotation) {
          // Annotation existed - add draft to existed annotation
          const draftAnnotationPk = String(draft.annotation);

          c = cs.annotations.find(c => c.pk === draftAnnotationPk);
          if (c) {
            c.history.freeze();
            console.log("lsf-sdk/setAnnotation()  应用草稿");
            c.addVersions({ draft: draft.result });
            c.deleteAllRegions({ deleteReadOnly: true });
          } else {
            // that shouldn't happen
            console.error(`lsf-sdk/setAnnotation()  在 pk=${draftAnnotationPk} 中找不到 Annotation`);
            continue;
          }
        } else {
          // Annotation not found - create new annotation from draft
          c = cs.addAnnotation({
            draft: draft.result,
            userGenerate: true,
            createdBy: draft.created_username,
            createdAgo: draft.created_ago,
            createdDate: draft.created_at,
          });
        }
        cs.selectAnnotation(c.id);
        c.deserializeResults(draft.result);
        c.setDraftId(draft.id);
        c.history.safeUnfreeze();
      }
    }
    // 这里实在奇怪，this.annotations 里面确实有值，但是却取不到下标为 0 的那个
    const first = this.annotations[0];
    // if we have annotations created automatically, we don't need to create another one
    // automatically === created here and haven't saved yet, so they don't have pk
    // @todo because of some weird reason pk may be string uid, so check flags then
    // 如果我们有自动创建的 annotations，我们不需要再创建一个
    // automatically === created 并且还未保存，所以没有 pk ？？？啥意思
    // 由于某些奇怪的原因，pk可能是字符串uid，所以请检查标志
    const hasAutoAnnotations = !!first && (!first.pk || (first.userGenerate && first.sentUserGenerate === false));
    const showPredictions = this.project.show_collab_predictions === true;

    if (this.labelStream) {
      // 审核状态，不创建新的标注结果，也不加载 draft
      if (isReview) {
        if (isDefined(annotationID) && fromHistory) {
          annotation = this.annotations.find(({ pk }) => pk === annotationID);
        } else if (first) {
          annotation = first;
        }
      } else {
        if (first?.draftId) {
          // not submitted draft, most likely from previous labeling session
          annotation = first;
        } else if (isDefined(annotationID) && fromHistory) {
          annotation = this.annotations.find(({ pk }) => pk === annotationID);
        } else if (showPredictions && this.predictions.length > 0 && !this.isInteractivePreannotations) {
          annotation = cs.addAnnotationFromPrediction(this.predictions[0]);
        } else {
          annotation = cs.addAnnotation({ userGenerate: true });
        }
      }
    } else {
      if (this.annotations.length === 0 && this.predictions.length > 0 && !this.isInteractivePreannotations) {
        annotation = cs.addAnnotationFromPrediction(this.predictions[0]);
      } else if (this.annotations.length > 0 && id && id !== "auto") {
        annotation = this.annotations.find((c) => c.pk === id || c.id === id);
      } else if (this.annotations.length > 0 && (id === "auto" || hasAutoAnnotations)) {
        annotation = first;
      } else {
        annotation = cs.addAnnotation({ userGenerate: true });
      }
    }

    if (annotation) {
      cs.selectAnnotation(annotation.id);
      this.datamanager.invoke("annotationSet", annotation);
    }
  }

  // 这里的 ls 是 lsf 传来的 AppStore
  onLabelStudioLoad = async (ls) => {
    this.datamanager.invoke("labelStudioLoad", ls);
    this.lsf = ls;

    if (this.labelStream) {
      await this.loadTask();
    }
  };

  onProjectFetch = async () => {
    return await this.datamanager.apiCall("project");
  }

  /** @private */
  onTaskLoad = async (...args) => {
    this.datamanager.invoke("onSelectAnnotation", ...args);
  };

  onStorageInitialized = async (ls) => {
    this.datamanager.invoke("onStorageInitialized", ls);

    if (this.task && this.labelStream === false) {
      const annotationID =
        this.initialAnnotation?.pk ?? this.task.lastAnnotation?.pk ?? this.task.lastAnnotation?.id ?? "auto";

      this.setAnnotation(annotationID);
    }
  }

  /** @private */
  onSubmitAnnotation = async () => {
    await this.submitCurrentAnnotation("submitAnnotation", async (taskID, body) => {
      return await this.datamanager.apiCall("submitAnnotation", { taskID }, { body });
    });
  };

  /** @private */
  onUpdateAnnotation = async (ls, annotation) => {
    const { task } = this;
    const serializedAnnotation = this.prepareData(annotation);

    const result = await this.withinLoadingState(async () => {
      return this.datamanager.apiCall(
        "updateAnnotation",
        {
          taskID: task.id,
          annotationID: annotation.pk,
        },
        {
          body: serializedAnnotation,
        },
      );
    });

    this.datamanager.invoke("updateAnnotation", ls, annotation, result);

    await this.loadTask(this.task.id, annotation.pk, true);
  };

  // 删除草稿事件
  deleteDraft = async (id) => {
    const response = await this.datamanager.apiCall("deleteDraft", {
      draftID: id,
    });

    this.task.deleteDraft(id);
    return response;
  }

  // 删除标注结果事件
  /**@private */
  onDeleteAnnotation = async (ls, annotation) => {
    const { task } = this;
    let response;

    if (annotation.userGenerate && annotation.sentUserGenerate === false) {
      if (annotation.draftId) {
        response = await this.deleteDraft(annotation.draftId);
      } else {
        response = { ok: true };
      }
    } else {
      response = await this.withinLoadingState(async () => {
        return this.datamanager.apiCall("deleteAnnotation", {
          taskID: task.id,
          annotationID: annotation.pk,
        });
      });

      // this.task.deleteAnnotation(annotation);
      this.datamanager.invoke("deleteAnnotation", ls, annotation);
    }

    if (response.ok) {
      const lastAnnotation = this.annotations[this.annotations.length - 1] ?? {};
      const annotationID = lastAnnotation.pk ?? undefined;

      this.setAnnotation(annotationID);
    }
  };

  // 提交草稿事件
  onSubmitDraft = async (studio, annotation) => {
    const annotationDoesntExist = !annotation.pk;
    const data = { body: this.prepareData(annotation, { draft: true }) }; // serializedAnnotation

    if (annotation.draftId > 0) {
      // draft has been already created
      return this.datamanager.apiCall("updateDraft", { draftID: annotation.draftId }, data);
    } else {
      let response;

      if (annotationDoesntExist) {
        response = await this.datamanager.apiCall("createDraftForTask", { taskID: this.task.id }, data);
      } else {
        response = await this.datamanager.apiCall(
          "createDraftForAnnotation",
          { taskID: this.task.id, annotationID: annotation.pk },
          data,
        );
      }
      response?.id && annotation.setDraftId(response?.id);
    }
  };

  // 跳过事件
  onSkipTask = async () => {
    await this.submitCurrentAnnotation(
      "skipTask",
      (taskID, body) => {
        const { id, ...annotation } = body;
        const params = { taskID, annotationID: id };
        const options = { body: annotation };

        options.body.was_cancelled = true;

        if (id === undefined) {
          return this.datamanager.apiCall("submitAnnotation", params, options);
        } else {
          params.annotationID = id;
          return this.datamanager.apiCall("updateAnnotation", params, options);
        }
      },
      true,
    );
  };

  // 取消跳过事件
  onCancelSkippingTask = async () => {
    const { task, currentAnnotation } = this;

    if (!isDefined(currentAnnotation) && !isDefined(currentAnnotation.pk)) {
      console.error('Annotation 必须在 unskip 上');
      return;
    }

    await this.withinLoadingState(async () => {
      currentAnnotation.pauseAutosave();
      if (currentAnnotation.draftId > 0) {
        await this.datamanager.apiCall("updateDraft", {
          draftID: currentAnnotation.draftId,
        }, {
          body: { annotation: null },
        });
      } else {
        const annotationData = { body: this.prepareData(currentAnnotation) };

        await this.datamanager.apiCall("createDraftForTask", {
          taskID: this.task.id,
        }, annotationData);
      }
      await this.datamanager.apiCall("deleteAnnotation", {
        taskID: task.id,
        annotationID: currentAnnotation.pk,
      });
    });
    await this.loadTask(task.id);
    this.datamanager.invoke("cancelSkippingTask");
  };

  /**
   * 接受标注 事件
   * isDirty 会在可以撤销的时候为 true，也就是点了 “修复并接受”
   * @param {*} ls lsf 的整个 store
   * @param {*} params { isDirty, entity }
   */
  /** @private */
  onAcceptAnnotation = async (ls, annotation, isDirty) => {
    console.log('lsf-sdk onAcceptAnnotation');
    await this.submitCurrentAnnotation(
      "updateAnnotation",
      (taskID, body) => {
        const { id, ...annotation } = body;
        const params = { 
          taskID, 
          annotationID: id,
          review: isDirty ? annotationOperateStatus.TASK_FIX : annotationOperateStatus.TASK_PASS,
        };
        const options = { body: annotation };

        params.annotationID = id;
        return this.datamanager.apiCall("updateAnnotation", params, options);
      },
      true,
      true,
    );
  }

  /**
   * 拒绝标注结果 事件
   * @param {*} ls lsf 的整个 store
   * @param {*} params { isDirty, entity, comment }，其中 comment 是评论
   */
  /** @private */
  onRejectAnnotation = async (ls, { comment }) => {
    console.log('lsf-sdk onRejectAnnotation');
    await this.submitCurrentAnnotation(
      "updateAnnotation",
      (taskID, body) => {
        const { id, ...annotation } = body;
        const params = { 
          taskID, 
          annotationID: id,
          review: annotationOperateStatus.TASK_REJECT,
          review_text: comment || '',
        };
        const options = { body: {
          ...annotation,
          result: [],
          lead_time: null,
        } };

        params.annotationID = id;
        return this.datamanager.apiCall("updateAnnotation", params, options);
      },
      true,
      true,
    );
  }

  // Proxy events that are unused by DM integration
  onEntityCreate = (...args) => this.datamanager.invoke("onEntityCreate", ...args);
  onEntityDelete = (...args) => this.datamanager.invoke("onEntityDelete", ...args);
  onSelectAnnotation = (...args) =>
    this.datamanager.invoke("onSelectAnnotation", ...args);

  onNextTask = (nextTaskId, nextAnnotationId) => {
    console.log('dm lsf-sdk.js onNextTask', { nextTaskId, nextAnnotationId });

    this.loadTask(nextTaskId, nextAnnotationId, true);
  }
  onPrevTask = (prevTaskId, prevAnnotationId) => {
    console.log('dm lsf-skd.js onPrevTask', { prevTaskId, prevAnnotationId });

    this.loadTask(prevTaskId, prevAnnotationId, true);
  }

  async submitCurrentAnnotation(eventName, submit, includeId = false, loadNext = true) {
    const { taskID, currentAnnotation } = this;
    const serializedAnnotation = this.prepareData(currentAnnotation, { includeId });

    this.setLoading(true);
    const result = await this.withinLoadingState(async () => {
      const result = await submit(taskID, serializedAnnotation);

      return result;
    });

    if (result && result.id !== undefined) {
      const annotationId = result.id.toString();

      currentAnnotation.updatePersonalKey(annotationId);

      const eventData = annotationToServer(currentAnnotation);

      this.datamanager.invoke(eventName, this.lsf, eventData, result);

      // this.history?.add(taskID, currentAnnotation.pk);
    }

    this.setLoading(false);

    if (!loadNext || this.datamanager.isExplorer) {
      await this.loadTask(taskID, currentAnnotation.pk, true);
    } else {
      await this.loadTask();
    }
  }

  /** @private */
  prepareData(annotation, { includeId, draft } = {}) {
    const userGenerate =
      !annotation.userGenerate || annotation.sentUserGenerate;

    const result = {
      lead_time: (new Date() - annotation.loadedDate) / 1000, // task execution time
      // don't serialize annotations twice for drafts
      result: draft ? annotation.versions.draft : annotation.serializeAnnotation(),
      draft_id: annotation.draftId,
      parent_prediction: annotation.parent_prediction,
      parent_annotation: annotation.parent_annotation,
    };

    if (includeId && userGenerate) {
      result.id = parseInt(annotation.pk);
    }

    return result;
  }

  /** @private */
  setLoading(isLoading) {
    this.lsf.setFlags({ isLoading });
  }

  async withinLoadingState(callback) {
    let result;

    this.setLoading(true);
    if (callback) {
      result = await callback.call(this);
    }
    this.setLoading(false);

    return result;
  }

  destroy() {
    this.lsfInstance?.destroy?.();
  }

  get taskID() {
    return this.task.id;
  }

  get taskHistory() {
    return this.lsf.annotationStore.taskHistory;
  }

  get currentAnnotation() {
    try {
      return this.lsf.annotationStore.selected;
    } catch {
      return null;
    }
  }

  get annotations() {
    return this.lsf.annotationStore.annotations;
  }

  get predictions() {
    return this.lsf.annotationStore.predictions;
  }

  /** @returns {string|null} */
  get lsfConfig() {
    return this.datamanager.store.labelingConfig;
  }

  /** @returns {Dict} */
  get project() {
    return this.datamanager.store.project;
  }

  /** @returns {string|null} */
  get instruction() {
    return (this.project.instruction ?? this.project.expert_instruction ?? "").trim() || null;
  }
}
