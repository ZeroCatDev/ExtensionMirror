# ExtensionMirror - 扩展镜像同步工具

一个用于同步和管理扩展的工具，支持40code和SharkPools两种模式。

## 项目结构

```
ExtensionMirror/
├── app.js                          # 统一入口文件
├── modules/                        # 模块目录
│   ├── 40code/                    # 40code相关模块
│   │   └── 40codeMirror.js       # 40code镜像处理器
│   └── sharkpools/                # SharkPools相关模块
│       └── sharkPoolsProcessor.js # SharkPools扩展处理器
├── components/                     # 共享组件
│   ├── extensionFetcher.js        # 扩展获取器
│   ├── extensionSyncService.js    # 扩展同步服务
│   └── zerocatApi.js             # ZeroCat API客户端
├── SharkPools-Extensions/         # SharkPools扩展库
└── env.example                    # 环境变量示例
```

## 功能特性

### 40code模式
- 同步指定扩展和作者的扩展
- 支持强制模式跳过差异比较
- 自动获取作者的所有扩展

### SharkPools模式
- 处理SharkPools扩展库
- 自动解析扩展头信息
- 支持SVG转PNG缩略图
- 文件变化监听

## 安装和配置

1. 安装依赖：
```bash
npm install
```

2. 复制环境变量文件：
```bash
cp env.example .env
```

3. 配置环境变量：
```env
ZEROCAT_BACKEND=your_backend_url
ZEROCAT_TOKEN_40CODE=your_40code_token
ZEROCAT_TOKEN_SHARKPOOL=your_sharkpool_token
```

## 使用方法

### 40code模式
```bash
# 正常模式（比较文件差异）
node app.js

# 强制模式（跳过差异比较）
node app.js --force
```

### SharkPools模式
```bash
# 处理SharkPools扩展
node app.js --sharkpools

# 强制模式处理SharkPools扩展
node app.js --sharkpools --force
```

## 配置说明

### 40code配置
在 `modules/40code/40codeMirror.js` 中修改配置：

```javascript
this.config = {
  targetExtensions: [
    // 在这里添加目标扩展ID
  ],
  targetAuthors: [
    "0832",
    "NOname",
    "40code",
    // 在这里添加目标作者列表
  ]
};
```

### SharkPools配置
SharkPools扩展需要放在 `SharkPools-Extensions/extension-code/` 目录下，并包含以下头信息：

```javascript
// Name: 扩展名称
// ID: 扩展ID
// Description: 扩展描述
// By: 作者名称
```

## 开发说明

### 模块化设计
- `app.js`: 统一入口，处理命令行参数和模式选择
- `modules/40code/`: 40code相关功能模块
- `modules/sharkpools/`: SharkPools相关功能模块
- `components/`: 共享组件，可被多个模块复用

### 扩展新功能
1. 在 `modules/` 下创建新的模块目录
2. 实现模块的主要功能类
3. 在 `app.js` 中添加新的模式支持

## 许可证

MIT License