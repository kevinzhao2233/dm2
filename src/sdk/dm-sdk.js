/** @global LSF */

/**
 * @typedef {{
 *  hiddenColumns?: {
 *    labeling?: string[],
 *    explore?: string[],
 *  },
 *  visibleColumns?: {
 *    labeling?: string[],
 *    explore?: string[],
 *  }
 * }} TableConfig
 */

/**
 * @typedef {{
 * root: HTMLElement,
 * polling: boolean,
 * apiGateway: string | URL,
 * apiEndpoints: import("../utils/api-proxy").Endpoints,
 * apiMockDisabled: boolean,
 * apiHeaders?: Dict<string>,
 * settings: Dict<any>,
 * labelStudio: Dict<any>,
 * env: "development" | "production",
 * mode: "labelstream" | "explorer",
 * table: TableConfig,
 * links: Dict<string|null>,
 * showPreviews: boolean,
 * projectId: number,
 * interfaces: Dict<boolean>,
 * instruments: Dict<any>,
 * toolbar?: string,
 * panels?: Record<string, any>[]
 * spinner?: import("react").ReactNode
 * apiTransform?: Record<string, Record<string, Function>
 * }} DMConfig
 */

import { inject, observer } from "mobx-react";
import { destroy } from "mobx-state-tree";
import { unmountComponentAtNode } from "react-dom";
import { toCamelCase } from "strman";
import { instruments } from "../components/DataManager/Toolbar/instruments";
import { APIProxy } from "../utils/api-proxy";
import { objectToMap } from "../utils/helpers";
import { packJSON } from "../utils/packJSON";
import { isDefined } from "../utils/utils";
import { APIConfig } from "./api-config";
import { createApp } from "./app-create";
import { LSFWrapper } from "./lsf-sdk";
import { taskToLSFormat } from "./lsf-utils";

const DEFAULT_TOOLBAR = "actions columns filters ordering label-button loading-possum error-box | refresh import-button export-button view-toggle";

const prepareInstruments = (instruments) => {
  const result = Object
    .entries(instruments)
    .map(([name, builder]) => [name, builder({ inject, observer })]);

  return objectToMap(Object.fromEntries(result));
};

export class DataManager {
  /** @type {HTMLElement} */
  root = null;

  /** @type {APIProxy} */
  api = null;

  /** @type {import("./lsf-sdk").LSFWrapper} */
  lsf = null;

  /** @type {Dict} */
  settings = {};

  /** @type {import("../stores/AppStore").AppStore} */
  store = null;

  /** @type {Dict<any>} */
  labelStudioOptions = {};

  /** @type {"development" | "production"} */
  env = "development";

  /**
   * mode 是切换标注状态的工具
   */
  /** @type {"explorer" | "labelstream"} */
  mode = "explorer";

  /** @type {TableConfig} */
  tableConfig = {};

  /** @type {Dict<string|null>} */
  links = {
    import: "/import",
    export: "/export",
    settings: "./settings",
  };

  /**
   * @private
   * @type {Map<String, Set<Function>>}
   */
  callbacks = new Map();

  /**
   * @private
   * @type {Map<String, Set<Function>>}
   */
  actions = new Map();

  /** @type {Number} */
  apiVersion = 1;

  /** @type {boolean} */
  showPreviews = false;

  /** @type {boolean} */
  polling = true;

  /** @type {boolean} */
  started = false;

  instruments = new Map();

  /**
   * Constructor
   * @param {DMConfig} config
   */
  constructor(config) {
    this.root = config.root;
    this.projectId = config.projectId;
    this.settings = config.settings;
    this.labelStudioOptions = config.labelStudio;
    this.env = config.env ?? process.env.NODE_ENV ?? this.env;
    this.mode = config.mode ?? this.mode;
    this.tableConfig = config.table ?? {};
    this.apiVersion = config?.apiVersion ?? 1;
    this.links = Object.assign(this.links, config.links ?? {});
    this.showPreviews = config.showPreviews ?? false;
    this.polling = config.polling;
    this.toolbar = config.toolbar ?? DEFAULT_TOOLBAR;
    this.panels = config.panels;
    this.spinner = config.spinner;
    this.spinnerSize = config.spinnerSize;
    this.instruments = prepareInstruments(config.instruments ?? {}),
    this.apiTransform = config.apiTransform ?? {};
    // interfaces 的文档：https://labelstud.io/guide/frontend_reference.html#interfaces
    this.interfaces = objectToMap({
      tabs: true,
      toolbar: true,
      import: true,
      export: true,
      labelButton: true,
      backButton: true,
      labelingHeader: false,
      groundTruth: false, // 社区版没法用这个功能
      instruction: false,
      autoAnnotation: false,
      ...config.interfaces,
    });

    this.api = new APIProxy(
      this.apiConfig({
        apiGateway: config.apiGateway,
        apiEndpoints: config.apiEndpoints,
        apiMockDisabled: config.apiMockDisabled,
        apiSharedParams: config.apiSharedParams,
        apiHeaders: config.apiHeaders,
      }),
    );

    if (config.actions) {
      config.actions.forEach(([action, callback]) => {
        if (!isDefined(action.id)) {
          throw new Error("每个操作都必须提供唯一的标识");
        }
        this.actions.set(action.id, { action, callback });
      });
    }

    this.initApp();
  }

  get isExplorer() {
    return this.mode === "labeling";
  }

  get isLabelStream() {
    return this.mode === "labelstream";
  }

  get projectId() {
    return (this._projectId = this._projectId ?? this.root?.dataset?.projectId);
  }

  set projectId(value) {
    this._projectId = value;
  }

  apiConfig({
    apiGateway,
    apiEndpoints,
    apiMockDisabled,
    apiSharedParams,
    apiHeaders,
  }) {
    const config = Object.assign({}, APIConfig);

    config.gateway = apiGateway ?? config.gateway;
    config.mockDisabled = apiMockDisabled;
    config.commonHeaders = apiHeaders;

    Object.assign(config.endpoints, apiEndpoints ?? {});
    Object.assign(config, {
      sharedParams: {
        project: this.projectId,
        ...(apiSharedParams ?? {}),
      },
    });

    return config;
  }

  /**
   * @param {impotr("../stores/Action.js").Action} action
   */
  addAction(action, callback) {
    const { id } = action;

    if (!id) throw new Error("Action must provide a unique ID");

    this.actions.set(id, { action, callback });
    this.store.addActions(action);
  }

  removeAction(id) {
    this.actions.delete(id);
    this.store.removeAction(id);
  }

  getAction(id) {
    return this.actions.get(id)?.callback;
  }

  installActions() {
    this.actions.forEach(({ action, callback }) => {
      this.addAction(action, callback);
    });
  }

  // 注册工具，貌似并没有被调用
  registerInstrument(name, initializer) {
    if (instruments[name]) {
      return console.warn(`不能覆盖已有的工具：${name}`);
    }

    this.instruments.set(name, initializer({
      store: this.store,
      observer,
      inject,
    }));

    this.store.updateInstruments();
  }

  /**
   * 派发事件处理程序
   * @param {string} eventName
   * @param {Function} callback
   */
  on(eventName, callback) {
    if (this.lsf && eventName.startsWith('lsf:')) {
      const evt = toCamelCase(eventName.replace(/^lsf:/, ''));

      this.lsf?.lsfInstance?.on(evt, callback);
    }

    const events = this.getEventCallbacks(eventName);

    events.add(callback);
    this.callbacks.set(eventName, events);
  }

  /**
   * Remove an event handler
   * If no callback provided, all assigned callbacks will be removed
   * @param {string} eventName
   * @param {Function?} callback
   */
  off(eventName, callback) {
    if (this.lsf && eventName.startsWith('lsf:')) {
      const evt = toCamelCase(eventName.replace(/^lsf:/, ''));

      this.lsf?.lsfInstance?.off(evt, callback);
    }

    const events = this.getEventCallbacks(eventName);

    if (callback) {
      events.delete(callback);
    } else {
      events.clear();
    }
  }

  removeAllListeners() {
    const lsfEvents = Array.from(this.callbacks.keys()).filter(evt => evt.startsWith('lsf:'));

    lsfEvents.forEach(evt => {
      const callbacks = Array.from(this.getEventCallbacks(evt));
      const eventName = toCamelCase(evt.replace(/^lsf:/, ''));

      callbacks.forEach(clb => this.lsf?.lsfInstance?.off(eventName, clb));
    });

    this.callbacks.clear();
  }

  /**
   * Check if an event has at least one handler
   * @param {string} eventName Name of the event to check
   */
  hasHandler(eventName) {
    return this.getEventCallbacks(eventName).size > 0;
  }

  /**
   * Check if interface is enabled
   * @param {string} name Name of the interface
   */
  interfaceEnabled(name) {
    return this.store.interfaceEnabled(name);
  }

  /**
   *
   * @param {"explorer" | "labelstream"} mode
   */
  setMode(mode) {
    const modeChanged = mode !== this.mode;

    this.mode = mode;
    this.store.setMode(mode);

    if (modeChanged) this.invoke('modeChanged', this.mode);
  }

  /**
   * Invoke handlers assigned to an event
   * @param {string} eventName
   * @param {any[]} args
   */
  async invoke(eventName, ...args) {
    if (eventName.startsWith('lsf:')) return;

    this.getEventCallbacks(eventName).forEach((callback) =>
      callback.apply(this, args),
    );
  }

  /**
   * Get callbacks set for a particular event
   * @param {string} eventName
   */
  getEventCallbacks(eventName) {
    return this.callbacks.get(eventName) ?? new Set();
  }

  /** @private */
  async initApp() {
    this.store = await createApp(this.root, this);
    this.invoke('ready', [this]);
  }

  initLSF(element) {
    if (this.lsf) return;

    this.lsf = new LSFWrapper(this, element, {
      ...this.labelStudioOptions,
      projectId: this.projectId,
      task: this.store.taskStore.selected,
      // annotation: this.store.annotationStore.selected,
      isLabelStream: this.mode === 'labelstream',
    });
  }

  /**
   * 初始化 LSF 或使用已初始化的实例。
   * 渲染 LSF interface 并加载用于标记的任务。
   * @param {HTMLElement} element LSF 要渲染的根元素
   * @param {import("../stores/Tasks").TaskModel} task
   */
  async startLabeling() {
    if (!this.lsf) return;
    // 当前选择的任务和标注结果
    let [task, annotation] = [
      this.store.taskStore.selected,
      this.store.annotationStore.selected,
    ];

    const isLabelStream = this.mode === 'labelstream';
    const taskExists = isDefined(this.lsf.task) && isDefined(task);
    const taskSelected = this.lsf.task?.id === task?.id;

    // 如果已经选择了任务，则不执行任何操作
    if (taskExists && taskSelected) {
      return;
    }

    if (!isLabelStream && (!taskSelected || isDefined(annotation))) {
      const annotationID = annotation?.id ?? task.lastAnnotation?.id;

      // this.lsf.loadTask(task.id, annotationID);
      this.lsf.selectTask(task, annotationID);
    }
  }

  destroyLSF() {
    this.lsf?.destroy();
    this.lsf = undefined;
  }

  destroy(detachCallbacks = true) {
    unmountComponentAtNode(this.root);

    if (this.store) {
      destroy(this.store);
    }

    if (detachCallbacks) {
      this.callbacks.forEach((callbacks) => callbacks.clear());
      this.callbacks.clear();
    }
  }

  reload() {
    this.destroy(false);
    this.initApp();
    this.installActions();
  }

  async apiCall(...args) {
    return this.store.apiCall(...args);
  }

  getInstrument(name) {
    return instruments[name] ?? this.instruments.get(name) ?? null;
  }

  hasInterface(name) {
    return this.interfaces.get(name) === true;
  }

  get toolbarInstruments() {
    const sections = this.toolbar.split("|").map(s => s.trim());

    const instrumentsList = sections.map(section => {
      return section.split(" ").filter((instrument) => {
        const nativeInstrument = !!instruments[instrument];
        const customInstrument = !!this.instruments.has(instrument);

        if (!nativeInstrument && !customInstrument) {
          console.warn(`未检查到工具: ${instrument}. 是否忘记注册了?`);
        }

        return nativeInstrument || customInstrument;
      });
    });

    return instrumentsList;
  }
  static packJSON = packJSON;
  static taskToLSFormat = taskToLSFormat
}
