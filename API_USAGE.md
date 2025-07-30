# ZeroCat API 使用说明

## 新功能特性

### 1. 自动获取用户信息
ZeroCatAPI 现在会自动调用 `/user/me` 接口获取用户信息，无需手动传入用户名。

### 2. 灵活的项目创建参数
`createProject` 方法现在支持完全自定义的项目参数：

```javascript
const zerocatApi = new ZeroCatAPI(apiToken, apiHost);

// 基本用法（向后兼容）
await zerocatApi.createProject({
  extId: 'myExtension',
  name: 'My Extension',
  ext: {
    author: 'AuthorName',
    author_id: 'author123',
    description: 'Extension description'
  }
});

// 完全自定义
await zerocatApi.createProject({
  extId: 'myExtension',
  name: 'My Extension', 
  ext: { /* ... */ },
  projectName: 'custom-project-name',      // 自定义项目名称
  title: 'Custom Project Title',           // 自定义项目标题
  description: 'Custom description',       // 自定义项目描述
  type: 'text',                           // 项目类型
  state: 'public'                         // 项目状态
});
```

### 3. 灵活的项目检查
`checkProjectExists` 方法支持检查任意用户的项目：

```javascript
// 检查当前用户的项目
await zerocatApi.checkProjectExists('project-name');

// 检查指定用户的项目
await zerocatApi.checkProjectExists('project-name', 'target-username');
```

## 使用示例

### 初始化
```javascript
import ZeroCatAPI from './components/zerocatApi.js';

// 使用环境变量
const api = new ZeroCatAPI();

// 手动指定参数
const api = new ZeroCatAPI('your-api-token', 'https://api.example.com');
```

### 获取用户信息
```javascript
const userInfo = await api.getUserInfo();
console.log(`用户: ${userInfo.display_name} (@${userInfo.username})`);
```

### 创建和管理项目
```javascript
// 检查项目是否存在
const exists = await api.checkProjectExists('my-project');

if (!exists.exists) {
  // 创建项目
  const project = await api.createProject({
    projectName: 'my-project',
    title: 'My Awesome Project',
    description: 'A great extension',
    type: 'text',
    state: 'public'
  });
  
  // 初始化项目
  await api.initializeProject(project.id);
  
  // 创建提交
  await api.createCommit(project.id, 'my-ext', 'console.log("Hello");', 'My Extension');
}
```

### SharkPools 扩展处理
```javascript
import SharkPoolsExtensionProcessor from './SharkPools.js';

const processor = new SharkPoolsExtensionProcessor();
await processor.processAllExtensions();
```

## 环境变量

确保设置以下环境变量：

```bash
ZEROCAT_TOKEN_40CODE=your-api-token
ZEROCAT_BACKEND=https://your-api-host.com
```

## 命令行使用

```bash
# 40code 扩展同步
node 40code-mirror.js
npm run 40code

# SharkPools 扩展处理  
node 40code-mirror.js --sharkpools
npm run sharkpools

# 强制模式
node 40code-mirror.js --force
```