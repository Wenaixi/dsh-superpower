# 纵深防御校验

## 概述

当你修复由非法数据引发的缺陷时，往往觉得在一个地方加校验就够了。但单点校验很容易被不同的代码路径、重构或 Mock 绕过。

**核心原则：** 在数据经过的每一层都做校验，让缺陷在结构上不可能发生。

## 为什么需要多层校验

单点校验：“我们修掉了这个缺陷”
多层校验：“我们让这类缺陷不可能发生”

不同层级捕获的问题不同：
- 入口校验能拦截大多数缺陷
- 业务逻辑校验能兜住边界情况
- 环境防护能避免特定上下文下的危险操作
- 调试日志能在其他层级失效时提供排查线索

## 四层模型

### 第一层：入口校验
**目的：** 在 API 边界拒绝明显非法的输入

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory cannot be empty');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
  }
  if (!statSync(workingDirectory).isDirectory()) {
    throw new Error(`workingDirectory is not a directory: ${workingDirectory}`);
  }
  // ... proceed
}
```

### 第二层：业务逻辑校验
**目的：** 确保数据在当前业务操作中是合理的

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error('projectDir required for workspace initialization');
  }
  // ... proceed
}
```

### 第三层：环境防护
**目的：** 在特定上下文中阻止危险操作

```typescript
async function gitInit(directory: string) {
  // In tests, refuse git init outside temp directories
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));

    if (!normalized.startsWith(tmpDir)) {
      throw new Error(
        `Refusing git init outside temp dir during tests: ${directory}`
      );
    }
  }
  // ... proceed
}
```

### 第四层：调试埋点
**目的：** 记录上下文，便于事后排查

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  logger.debug('About to git init', {
    directory,
    cwd: process.cwd(),
    stack,
  });
  // ... proceed
}
```

## 应用方法

当发现缺陷时：

1. **追踪数据流** - 非法值从哪里来？在哪里被使用？
2. **梳理所有检查点** - 列出数据经过的每一个关卡
3. **在每一层补充校验** - 入口、业务、环境、调试逐层加固
4. **逐层验证** - 尝试绕过第一层，确认第二层能否兜住

## 实战示例

缺陷：空的 `projectDir` 导致在源码目录下执行了 `git init`

**数据流：**
1. 测试初始化 → 空字符串
2. `Project.create(name, '')`
3. `WorkspaceManager.createWorkspace('')`
4. `git init` 在 `process.cwd()` 下执行

**补充的四层防护：**
- 第一层：`Project.create()` 校验非空、存在且可写
- 第二层：`WorkspaceManager` 校验 projectDir 非空
- 第三层：`WorktreeManager` 在测试环境下拒绝在 tmpdir 之外执行 git init
- 第四层：在 git init 前记录堆栈日志

**结果：** 1847 项测试全部通过，缺陷无法复现

## 核心洞察

四层缺一不可。在测试过程中，每一层都捕获了其他层级遗漏的问题：
- 不同的代码路径绕过了入口校验
- Mock 绕过了业务逻辑检查
- 不同平台的边界情况需要环境防护来兜底
- 调试日志帮助定位了结构性误用

**不要只在一个点做校验。** 在每一层都加上检查。
