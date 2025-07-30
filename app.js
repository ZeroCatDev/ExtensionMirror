import dotenv from 'dotenv';
import FortyCodeMirror from './modules/40code/40codeMirror.js';
import SharkPoolsProcessor from './modules/sharkpools/sharkPoolsProcessor.js';

/**
 * 扩展镜像同步工具 - 统一入口
 *
 * 功能：
 * 1. 40code模式：同步指定扩展和作者的扩展
 * 2. SharkPools模式：处理SharkPools扩展库
 * 3. 支持强制模式 (-f 或 --force) 跳过差异比较直接更新
 *
 * 使用方法：
 * - 40code模式: node app.js --40code
 * - SharkPools模式: node app.js --sharkpools
 * - 强制模式: 添加 -f 或 --force 参数
 *   例如: node app.js --40code --force 或 node app.js --sharkpools --force
 */

// 解析命令行参数
const args = process.argv.slice(2);
const forceMode = args.includes('-f') || args.includes('--force');
const sharkPoolsMode = args.includes('--sharkpools');
const fortyCodeMode = args.includes('--40code');

// 检查是否指定了模式
if (!sharkPoolsMode && !fortyCodeMode) {
  console.log('❌ 错误: 请指定运行模式');
  console.log('使用方法:');
  console.log('  - 40code模式: node app.js --40code');
  console.log('  - SharkPools模式: node app.js --sharkpools');
  console.log('  - 强制模式: 添加 -f 或 --force 参数');
  process.exit(1);
}

// 加载环境变量
dotenv.config();

// 主函数
async function main() {
  try {
    // 验证环境变量
    if (!process.env.ZEROCAT_BACKEND) {
      console.log('❌ 错误: 请设置环境变量 ZEROCAT_BACKEND');
      process.exit(1);
    }

    // 根据模式选择处理器
    if (sharkPoolsMode) {
      console.log('ℹ️ 运行模式: SharkPools扩展处理');

      if (!process.env.ZEROCAT_TOKEN_SHARKPOOL) {
        console.log('❌ 错误: SharkPools模式需要设置环境变量 ZEROCAT_TOKEN_SHARKPOOL');
        process.exit(1);
      }

      const sharkPoolsProcessor = new SharkPoolsProcessor(
        process.env.ZEROCAT_TOKEN_SHARKPOOL,
        process.env.ZEROCAT_BACKEND
      );

      // 显示运行模式
      if (forceMode) {
        console.log('ℹ️ 强制模式: 跳过差异比较');
      } else {
        console.log('ℹ️ 正常模式: 比较文件差异');
      }

      const success = await sharkPoolsProcessor.processAllExtensions();

      if (success) {
        console.log('✅ SharkPools扩展处理完成!');
        process.exit(0);
      } else {
        console.log('❌ SharkPools扩展处理失败');
        process.exit(1);
      }
    } else if (fortyCodeMode) {
      // 40code扩展同步模式
      console.log('ℹ️ 运行模式: 40code扩展同步');

      if (!process.env.ZEROCAT_TOKEN_40CODE) {
        console.log('❌ 错误: 40code模式需要设置环境变量 ZEROCAT_TOKEN_40CODE');
        process.exit(1);
      }

      const fortyCodeMirror = new FortyCodeMirror(
        process.env.ZEROCAT_TOKEN_40CODE,
        process.env.ZEROCAT_BACKEND
      );

      // 显示运行模式
      if (forceMode) {
        console.log('ℹ️ 强制模式: 跳过差异比较');
      } else {
        console.log('ℹ️ 正常模式: 比较文件差异');
      }

      console.log('ℹ️ 开始扩展镜像同步...');

      await fortyCodeMirror.syncExtensions(forceMode);

      console.log('✅ 所有扩展同步完成!');
      process.exit(0);
    }
  } catch (error) {
    console.log(`❌ 程序执行失败: ${error.message}`);
    process.exit(1);
  }
}

// 运行程序
main();