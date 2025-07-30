# 配置说明

## 环境变量

### ZEROCAT_TOKEN_40CODE
- **类型**: 字符串
- **必需**: 是
- **说明**: API访问令牌，用于认证API请求
- **示例**: `your_api_ZEROCAT_TOKEN_40CODE_here`

### ZEROCAT_BACKEND
- **类型**: 字符串
- **必需**: 是
- **说明**: API服务器的基础URL
- **示例**: `https://your-api-host.com`

## 配置示例

创建 `.env` 文件：
```env
# API配置
ZEROCAT_TOKEN_40CODE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ZEROCAT_BACKEND=https://api.zerocat.com
```

## API接口说明

### 获取扩展列表
- **URL**: `https://api.abc.520gxx.com/work/ext`
- **方法**: GET
- **返回**: 扩展列表数组

### 检查项目是否存在
- **URL**: `{ZEROCAT_BACKEND}/namespace/{username}/{extId}`
- **方法**: GET
- **认证**: Bearer Token
- **返回**: 项目信息或404

### 创建项目
- **URL**: `{ZEROCAT_BACKEND}/project`
- **方法**: POST
- **认证**: Bearer Token
- **参数**:
  - `name`: 项目名称
  - `title`: 项目标题
  - `description`: 项目描述
  - `type`: 项目类型（text）
  - `state`: 项目状态（public/private）

### 初始化项目
- **URL**: `{ZEROCAT_BACKEND}/project/initlize?projectid={projectId}&type=text`
- **方法**: POST
- **认证**: Bearer Token
- **说明**: 初始化项目，创建默认分支和初始提交

### 保存文件
- **URL**: `{ZEROCAT_BACKEND}/project/savefile?json=true`
- **方法**: POST
- **认证**: Bearer Token
- **参数**:
  - `source`: 文件内容
- **返回**: `{ sha256, accessFileToken }`

### 获取项目提交
- **URL**: `{ZEROCAT_BACKEND}/project/{projectId}/commits`
- **方法**: GET
- **认证**: Bearer Token
- **返回**: 提交列表

### 创建提交
- **URL**: `{ZEROCAT_BACKEND}/project/commit/id/{projectId}`
- **方法**: PUT
- **认证**: Bearer Token
- **参数**:
  - `projectid`: 项目ID
  - `accessFileToken`: 文件访问令牌
  - `message`: 提交消息
  - `commit_description`: 提交描述
  - `branch`: 分支名称

## 目标扩展配置

程序会同步以下预定义的扩展列表：

```javascript
const targetExtensions = [
  'bitwiseoper', 'strmani', 'numeration', 'mathandgeom',
  'unicode', 'Calculation', 'DatabaseExtension', 'extensionmake',
  'extensionmaker', 'jsonandarrayexample', 'globalCoordinate',
  'Expression', 'openai', 'qxsckdataanalysis', 'qxsckvarandlist',
  'qxsckhighprecision', 'darkmode', 'cst1229zip', 'WitCatInput',
  'sbxconsole', 'python', 'notes', 'htmlonscratch', 'WitCatBBcode',
  'WitCatIndexedDB', 'Project', 'rxfs', 'lazyAudio', 'sLocalStorage',
  'MOTION', 'rsc', 'HtmlViewer', 'spacevar0832', 'stdenvargs',
  'veclist', 'crypto', 'matches', 'hanzi', 'r3d', 'requireproject',
  'BetterMsg', 'astar', 'OPERATION', 'imageProcessor', 'ginac'
];
```

## 用户名配置

程序使用固定的用户名 `40code`，项目将创建为 `40code/{extId}` 的形式。

## 错误处理

程序包含以下错误处理机制：

1. **网络错误**: 自动重试和跳过
2. **认证错误**: 检查ZEROCAT_TOKEN_40CODE有效性
3. **API错误**: 记录详细错误信息
4. **文件错误**: 跳过无法获取的扩展

## 性能优化

- 请求间隔: 1秒延迟避免过快请求
- 错误恢复: 单个扩展失败不影响其他扩展
- 智能比较: 避免重复提交相同代码