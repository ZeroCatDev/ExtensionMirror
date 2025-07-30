import dotenv from 'dotenv';
import ExtensionSyncService from './components/extensionSyncService.js';
import SharkPoolsExtensionProcessor from './SharkPools.js';

/**
 * 扩展镜像同步工具
 *
 * 功能：
 * 1. 通过 targetExtensions 数组指定要同步的扩展ID
 * 2. 通过 targetAuthors 数组指定要同步的作者，会自动获取该作者的所有扩展
 * 3. 支持强制模式 (-f 或 --force) 跳过差异比较直接更新
 * 4. 支持SharkPools扩展处理模式 (--sharkpools)
 *
 * 使用方法：
 * - 在 config.targetExtensions 中添加扩展ID
 * - 在 config.targetAuthors 中添加作者名称
 * - 运行: node 40code-mirror.js 或 node 40code-mirror.js --force
 * - SharkPools模式: node 40code-mirror.js --sharkpools
 */

// 解析命令行参数
const args = process.argv.slice(2);
const forceMode = args.includes('-f') || args.includes('--force');
const sharkPoolsMode = args.includes('--sharkpools');

// 加载环境变量
dotenv.config();

// 配置
const config = {
  targetExtensions: [
  ],
  targetAuthors: ["0832","NOname","NOname-awa","NOname_awa","白猫","40code","多bug的啸天犬","makabakaKUN","TigerCoder","主核kernel"
    // 在这里添加目标作者列表
    // 例如: '40code', 'wuyuan', 'scratch'
    // 程序会自动获取这些作者的所有扩展并添加到同步列表中
  ]
};

// 主函数
async function main() {
  try {
    // 验证配置
    if (!process.env.ZEROCAT_TOKEN_40CODE || !process.env.ZEROCAT_BACKEND) {
      console.log('❌ 错误: 请设置环境变量 ZEROCAT_TOKEN_40CODE 和 ZEROCAT_BACKEND');
      process.exit(1);
    }

    // 如果是SharkPools模式
    if (sharkPoolsMode) {
      console.log('ℹ️ 运行模式: SharkPools扩展处理');
      const sharkPoolsProcessor = new SharkPoolsExtensionProcessor(
        process.env.ZEROCAT_TOKEN_40CODE,
        process.env.ZEROCAT_BACKEND
      );
      const success = await sharkPoolsProcessor.processAllExtensions();
      
      if (success) {
        console.log('✅ SharkPools扩展处理完成!');
        process.exit(0);
      } else {
        console.log('❌ SharkPools扩展处理失败');
        process.exit(1);
      }
    }

    // 40code扩展同步模式
    const extensionSyncService = new ExtensionSyncService(
      process.env.ZEROCAT_TOKEN_40CODE,
      process.env.ZEROCAT_BACKEND
    );

    // 显示运行模式
    if (forceMode) {
      console.log('ℹ️ 运行模式: 强制模式 (跳过差异比较)');
    } else {
      console.log('ℹ️ 运行模式: 正常模式 (比较文件差异)');
    }

    console.log('ℹ️ 开始扩展镜像同步...');

    // 使用新的同步服务
    await extensionSyncService.syncExtensions(
      config.targetExtensions,
      config.targetAuthors,
      forceMode
    );

    console.log('✅ 所有扩展同步完成!');
    process.exit(0);
  } catch (error) {
    console.log(`❌ 程序执行失败: ${error.message}`);
    process.exit(1);
  }
}

// 运行程序
  main();
