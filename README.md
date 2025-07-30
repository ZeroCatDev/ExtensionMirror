# Extension Mirror Tool

这是一个用于同步扩展项目的命令行工具，可以从 abc.520gxx.com 获取扩展列表并同步到目标平台。

## 功能特性

- 从 https://api.abc.520gxx.com/work/ext 获取扩展列表
- 支持通过扩展ID列表指定要同步的扩展
- 支持通过作者列表自动获取该作者的所有扩展
- 检查目标扩展是否已存在
- 自动创建新项目（如果不存在）
- 同步扩展代码并创建提交
- 智能比较代码内容，避免重复提交
- 支持批量处理多个扩展

## 安装

1. 进入 ExtensionMirror 目录：
```bash
cd ExtensionMirror
```

2. 安装依赖：
```bash
npm install
```

## 配置

1. 复制环境变量示例文件：
```bash
cp env.example .env
```

2. 编辑 `.env` 文件，设置你的配置：
```env
ZEROCAT_TOKEN_40CODE=your_api_ZEROCAT_TOKEN_40CODE_here
ZEROCAT_BACKEND=https://your-api-host.com
```

## 使用方法

### 基本使用
运行同步程序：
```bash
npm start
```

或者直接运行：
```bash
node mirror.js
```

### 强制模式
跳过差异比较，强制更新所有扩展：
```bash
node mirror.js -force
```

或者：
```bash
node mirror.js --force
```

## 配置说明

### 目标扩展配置

程序支持两种方式指定要同步的扩展：

1. **通过扩展ID列表** (`targetExtensions`): 直接指定要同步的扩展ID
2. **通过作者列表** (`targetAuthors`): 自动获取指定作者的所有扩展

在 `mirror.js` 文件中配置：

```javascript
const config = {
  // ... 其他配置
  targetExtensions: [
    'bitwiseoper',
    'strmani',
    // ... 更多扩展ID
  ],
  targetAuthors: [
    '40code',    // 获取 40code 作者的所有扩展
    'wuyuan',    // 获取 wuyuan 作者的所有扩展
    // ... 更多作者
  ]
};
```
=

## 工作流程

1. **获取扩展列表**: 从 abc.520gxx.com 的API获取所有可用扩展
2. **过滤目标扩展**:
   - 处理 `targetExtensions` 列表中指定的扩展ID
   - 处理 `targetAuthors` 列表中指定作者的所有扩展
   - 自动去重，避免重复处理同一扩展
3. **检查项目存在性**: 检查 `40code/扩展名` 是否已存在
4. **创建项目**: 如果不存在，创建新项目（类型为text）
5. **初始化项目**: 调用 `/project/initlize` 接口初始化项目
6. **获取代码**: 从 abc.520gxx.com/ext/扩展名.js 获取最新代码
7. **保存文件**: 调用 `/project/savefile` 接口保存文件，获取 accessFileToken
8. **创建提交**: 使用 accessFileToken 创建新提交

## 日志输出

程序会输出详细的日志信息：
- ℹ️ 信息日志
- ✅ 成功日志
- ❌ 错误日志

## 注意事项

- 确保你有足够的API权限来创建项目和提交
- 程序会在请求之间添加1秒延迟，避免请求过快
- 如果扩展代码获取失败，会跳过该扩展并继续处理其他扩展
- 用户名固定为 "40code"，项目名使用扩展的 extId