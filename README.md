## Data Manager 2.0 &middot; ![Build and Test](https://github.com/heartexlabs/dm2/workflows/Build%20and%20Test/badge.svg) &middot; [![npm version](https://badge.fury.io/js/%40heartexlabs%2Fdatamanager.svg)](https://badge.fury.io/js/%40heartexlabs%2Fdatamanager)

[Website](https://labelstud.io/) • [Docs](https://labelstud.io/guide) • [Twitter](https://twitter.com/heartexlabs) • [Join Slack Community](https://docs.google.com/forms/d/e/1FAIpQLSdLHZx5EeT1J350JPwnY2xLanfmvplJi6VZk65C2R4XSsRBHg/viewform?usp=sf_link)

[Label Studio][ls] 的数据浏览工具

<img src="https://raw.githubusercontent.com/heartexlabs/dm2/master/docs/image.png" height="500" align="center"/>

## 摘要

<img align="right" height="180" src="https://github.com/heartexlabs/label-studio/blob/master/images/heartex_icon_opossum_green@2x.png?raw=true" />

- [开始开始](#quick-start)
- [特性](#features-star2)
- [使用](#usage)
- [Under the hood](#under-the-hood)
- [构建并运行](#build-and-run)
- [发展](#development)
- [License](#license)

### 快速开始

```
npm install @heartexlabs/datamanager
```

### 特性

- 网格和列表视图可轻松浏览你的数据集
- 可定制的数据表示:选择你想要查看的数据以及如何显示
- 使用过滤器轻松地对数据进行切片，以便进行更精确的探索
- 与 Label Studio Frontend 深度集成

### 使用

你可以将DataManager作为独立模块使用。

**请记住，DataManager需要[后端api](#under-the-hood)才能运行。在独立使用的情况下，你需要自己实现后端。**

#### 安装

```
npm install @heartexlabs/datamanager
```

#### 初始化

```javascript
import { DataManager } from '@heartexlabs/datamanager';

const dm = new DataManager({
  // 将要在哪里渲染 DataManager
  root: document.querySelector('.app'),
  // API gateway
  apiGateway: 'https://example.com/api',
  // API settings
  apiEndpoints: {
    // here you can override API endpoints
    // 默认配置在 api-config.js
  },
  // 禁用请求模拟 moking？
  apiMockDisabled: process.env.NODE_ENV === 'production',
  // 传递参数到 Label Studio Frontend
  labelStudio: {
    user: { pk: 1, firstName: "James" }
  },
  // 设置表格展示
  table: {
    hiddenColumns: {/*...*/},
    visibleColumns: {/*...*/}
  },
  // 设置链接。空值将隐藏按钮
  links: {
    import: '/import',
    export: '/export',
  }
})
```

#### 事件

DataManager转发 Label Studio 中的大部分事件。

```js
dm.on('submitAnnotation', () => /* handle the submit process */)
```

#### API endpoints

To have access to the backend DataManager uses endpoints. Every endpoint is converted into a named method that DM will use under the hood. Full list of those method could be found [here](#under-the-hood).

每个 endpoint 可以是字符串或对象，endpoint 其实就是一个请求，比如 GET /projects 这样的请求。

API endpoint paths also support `:[parameter-name]` notation, e.g. `/tabs/:tabID/tasks`. These parameteres are required if specified. This means DM will throw an exception if the parameter is not present in the API call.

API endpoint 路径也支持 `:[parameter-name]` 符号，例如`/tabs/:tabID/tasks `。如果指定，这些参数是必需的。这意味着如果参数不在 API 调用中，DM 将抛出一个异常。

```js
// In this case DM will assume that api.columns() is a get request
apiEndpoints: {
	columns: "/api/columns",
}
```

对于 **GET** 以外的请求，请使用对象表示法:

```javascript
// If you want to specify a method, use oject instead
apiEndpoints: {
  updateTab: {
    path: "/api/tabs/:id",
    method: "post"
  }
}
```

###### 响应转换

```javascript
// 如果你已经有了api，但是响应不符合 DM 期望的格式
// 你可以即时转换响应
apiEndpoints: {
  tabs: {
    path: "/api/tabs",
    convert: (response) => {
			/* 实现任何你需要的响应 */
      /* 然后返回修改后的对象 */
      return response
    }
  }
}
```

###### 请求 mock

DataManager 支持请求模拟。这个特性对于开发来说非常方便。

```javascript
apiEndpoints: {
  columns: {
    path: "/api/columns",
    mock: (url, requestParams, request) => {
      // 在这里，你可以处理请求并返回响应
      // 可以使用 “apimockdabled:true” 来禁用此方法的执行`
    }
  }
}
```


### Under the hood

- [后端 API][api_docs]
- [架构][dm_architecture]

### 构建和运行

#### 使用服务器 API 在开发模式下运行

确保 Label Studio 正在运行，然后配置你的环境。将`.env.defaults` 的内容复制到 `.env` 并更改设置:

- `API_GATEWAY=http://localhost:8080/api/dm` 或者其他 API 地址
- `LS_ACCESS_TOKEN` — 要获取此令牌，请到LS，从右上角的头像中打开菜单，转到帐户页面，复制令牌

你也必须改变 `public/index.html` 中的 `data-project-id`，这是要使用的项目 ID。DM 总是一次只处理一个项目。

然后用简单的命令启动DM:

```
npm run start
```

#### 为生产和独立使用而构建

构建一个 CommonJS 兼容模块

```
npm run build:module
```

#### 为 Label Studio 构建

等到构建好完成，然后导航到 Label Studio 目录，并在命令行中执行以下命令:

```
node scripts/get-build.js dm [branch-name]
```

`branch-name` – optional, default: `master`

## 开发

### 先决条件

对于开发，需要安装 Label Studio 并运行，因为 DataManager 使用 LabelStudio API 进行操作。

如果你使用自己的后端，请确保 API 实现了 DataManager 要求的所有方法。

### 运行 DataManager 的本地版本

安装依赖，关于 npm ci 和 npm install 的区别请看[这篇文章](https://cloud.tencent.com/developer/section/1490280)

```
npm ci
```

运行 DataManager 的本地版本

```
npm start
```

### DataManager 和 Label Studio Frontend

默认情况下，DataManager 附带了 npm 上目前可用的 Label Studio Frontent 的最新版本。

如果你需要另一个版本，你有几个方式来连接它。

#### Using version from unpkg.com

You can take whatever version of LSF you need from unpkg.com and replace the existing one in `public/index.html`.

#### Using local clone

如果需要对更改进行更多的控制，或者您正在开发 DataManager 和 Label Studio 前端之间的某种集成，您将需要首先在本地克隆 `label-studio-frontend`。

1. 先按照[开发指南](https://github.com/heartexlabs/Label-Studio-Frontend#Development)，构建 Label Studio Frontend 的生产版。
2. 将 `label-studio-frontend` 的构建结果复制到 Data Manager 的 public 目录。
3. 编辑 `public/index.html`, 你需要替换这两行:

```diff
<!-- Label Studio Frontend -->
-    <link href="https://unpkg.com/label-studio@latest/build/static/css/" rel="stylesheet">
-    <script src="https://unpkg.com/label-studio@latest/build/static/js/main.js"></script>
+    <link href="./static/css/" rel="stylesheet">
+    <script src="./static/js/main.js"></script>
```

#### 在 Label Studio 中使用自己构建的 DM

您可以通过替换包文件将 DataManager 安装到 Label Studio 中。

首先，构建 DataManager 自身:

```bash
npm ci && npm run build:module
```

复制构建的结果到 Label Studio:

```bash
cp -r ./build/**/* [your-label-studio-path]/label-studio/static/dm/
```

启动 Label Studio 或刷新浏览器。

## 生态

| 项目 | 描述 |
|-|-|
| [label-studio][ls] | 服务端, 作为 pip 包分发 |
| [label-studio-frontend][lsf] | 前端, 用 JavaScript 和 React 编写，可以嵌入到您的应用程序中 |
| [label-studio-converter][lsc] | 将标签编码为您最喜欢的机器学习库的格式 |
| [label-studio-transformers][lst] | Transformers library connected and configured for use with label studio |
| datamanager | Data exploration tool for Label Studio |

## License

This software is licensed under the [Apache 2.0 LICENSE](/LICENSE) © [Heartex](https://www.heartex.ai/). 2020

<img src="https://github.com/heartexlabs/label-studio/blob/master/images/opossum_looking.png?raw=true" title="Hey everyone!" height="140" width="140" />

[ls]: https://github.com/heartexlabs/label-studio
[lsf]: https://github.com/heartexlabs/label-studio-frontend
[lsc]: https://github.com/heartexlabs/label-studio-converter
[lst]: https://github.com/heartexlabs/label-studio-transformers

[api_docs]: https://github.com/heartexlabs/dm2/blob/master/docs/api_reference.md
[lsf_dev]: https://github.com/heartexlabs/label-studio-frontend#development
[dm_architecture]: https://github.com/heartexlabs/dm2/blob/master/docs/dm_architecture_diagram.pdf
