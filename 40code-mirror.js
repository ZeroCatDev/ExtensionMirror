import axios from 'axios';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * 扩展镜像同步工具
 *
 * 功能：
 * 1. 通过 targetExtensions 数组指定要同步的扩展ID
 * 2. 通过 targetAuthors 数组指定要同步的作者，会自动获取该作者的所有扩展
 * 3. 支持强制模式 (-f 或 --force) 跳过差异比较直接更新
 *
 * 使用方法：
 * - 在 config.targetExtensions 中添加扩展ID
 * - 在 config.targetAuthors 中添加作者名称
 * - 运行: node mirror.js 或 node mirror.js --force
 */

// 解析命令行参数
const args = process.argv.slice(2);
const forceMode = args.includes('-f') || args.includes('--force');

// 加载环境变量
dotenv.config();

// 配置
const config = {
  ZEROCAT_TOKEN_40CODE: process.env.ZEROCAT_TOKEN_40CODE,
  apiHost: process.env.ZEROCAT_BACKEND,
  username: '40code',
  targetExtensions: [
  ],
  targetAuthors: ["0832","NOname","NOname-awa","NOname_awa","白猫","40code","多bug的啸天犬","makabakaKUN","TigerCoder","主核kernel"
    // 在这里添加目标作者列表
    // 例如: '40code', 'wuyuan', 'scratch'
    // 程序会自动获取这些作者的所有扩展并添加到同步列表中
  ]
};

// 创建axios实例
const api = axios.create({
  baseURL: config.apiHost,
  headers: {
    'Authorization': `Bearer ${config.ZEROCAT_TOKEN_40CODE}`,
    'Content-Type': 'application/json'
  }
});

// 日志函数
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// 获取扩展列表
async function getExtensions() {
  try {
    log('正在获取扩展列表...');
    const response = await axios.get('https://api.abc.520gxx.com/work/ext');
    log(`成功获取 ${response.data.length} 个扩展`);
    return response.data;
  } catch (error) {
    log(`获取扩展列表失败: ${error.message}`, 'error');
    throw error;
  }
}

// 检查项目是否存在
async function checkProjectExists(extId) {
  try {
    const response = await api.get(`/project/namespace/${config.username}/40code-${extId}`);
    //console.log(response.data)
    return {
      exists: true,
      projectId: response.data.id,
      data: response.data
    };
  } catch (error) {
    console.log(error.response.data)
    if (error.response && error.response.status === 404) {
      return { exists: false };
    }
    throw error;
  }
}

// 创建项目
async function createProject(extId, name,ext) {
  try {
    log(`正在创建项目: ${extId}`);
    //console.log(ext)
    const response = await api.post('/project', {
      name: "40code-"+extId,
      title: `${name}(40code ${ext.author})`,
      description: `从 40code 镜像的 ${name} 扩展\n原作者：40code [${ext.author}](https://www.40code.com/#page=user&id=${ext.author_id})\n\n${ext.description}`,
      type: 'text',
      state: 'public'
    });

    // 检查返回的数据结构
    console.log('创建项目响应:', response.data);

    // 检查响应状态
    if (response.data.status === 'error') {
      throw new Error(`项目创建失败: ${response.data.message}`);
    }

    // 根据router_project.js，成功时返回的是 { status: "success", id: result.id }
    const projectId = response.data.id;
    if (!projectId) {
      throw new Error(`项目创建成功但未返回ID，响应数据: ${JSON.stringify(response.data)}`);
    }

    log(`项目创建成功: ${extId} (ID: ${projectId})`, 'success');
    return { id: projectId, ...response.data };
  } catch (error) {
    log(`创建项目失败 ${extId}: ${error.message}`, 'error');
    if (error.response) {
      console.log('错误响应状态:', error.response.status);
      console.log('错误响应数据:', error.response.data);
    }
    throw error;
  }
}

// 初始化项目
async function initializeProject(projectId) {
  try {
    log(`正在初始化项目: ${projectId}`);
    const response = await api.post(`/project/initlize?projectid=${projectId}&type=text`);

    // 检查返回的数据结构
    console.log('初始化项目响应:', response.data);

    // 检查响应状态
    if (response.data.status === 'error') {
      throw new Error(`项目初始化失败: ${response.data.message}`);
    }

    log(`项目初始化成功: ${projectId}`, 'success');
    return response.data;
  } catch (error) {
    log(`项目初始化失败 ${projectId}: ${error.message}`, 'error');
    if (error.response) {
      console.log('错误响应状态:', error.response.status);
      console.log('错误响应数据:', error.response.data);
    }
    throw error;
  }
}

// 获取项目主页分支的最后一次提交
async function getLastCommit(projectId) {
  try {
    const response = await api.get(`/project/commits?projectid=${projectId}`);
    //console.log(response.data)
    if (response.data && response.data.data.length > 0) {
      return response.data.data[0];
    }
    return null;
  } catch (error) {
    log(`获取最后提交失败: ${error.message}`, 'error');
    return null;
  }
}

// 获取扩展代码
async function getExtensionCode(extId) {
  try {
    const response = await axios.get(`https://abc.520gxx.com/ext/${extId}.js`);
    //console.log(response.data)
    return response.data;
  } catch (error) {
    log(`获取扩展代码失败 ${extId}: ${error.message}`, 'error');
    return null;
  }
}

// 获取文件内容
async function getFileContent(sha256, accessFileToken) {
  try {
    const response = await api.get(`/project/files/${sha256}?accessFileToken=${accessFileToken}&content=true`);
    return response.data;
  } catch (error) {
    log(`获取文件内容失败: ${error.message}`, 'error');
    return null;
  }
}

// 保存文件
async function saveFile(code) {
  try {
    log('正在保存文件...');
    const response = await api.post('/project/savefile', code, {
      headers: {
        'Content-Type': 'text/plain'
      }
    });
    log('文件保存成功', 'success');
    return response.data;
  } catch (error) {
    console.log(error)
    log(`保存文件失败: ${error.message}`, 'error');
    throw error;
  }
}

// 创建新提交
async function createCommit(projectId, extId, code, name) {
  try {
    log(`正在创建提交: ${extId}`);

    // 先保存文件
    const fileResult = await saveFile(code);
    const { sha256, accessFileToken } = fileResult;

    // 创建提交
    const response = await api.put(`/project/commit/id/${projectId}`, {
      projectid: projectId,
      accessFileToken: accessFileToken,
      message: `更新 ${name} 扩展`,
      commit_description: `同步 ${extId} 扩展`,
      branch: 'main'
    });

    log(`提交创建成功: ${extId}`, 'success');
    return response.data;
  } catch (error) {

    log(`创建提交失败 ${extId}: ${error.message}`, 'error');
    console.log(error)
    throw error;
  }
}

// 比较代码内容
function compareCode(code1, code2) {
  return code1 === code2;
}

// 主同步函数
async function syncExtension(extId, name,ext) {
  try {
    log(`开始同步扩展: ${extId} (${name})`);

    // 检查项目是否存在
    const projectCheck = await checkProjectExists(extId);

    if (!projectCheck.exists) {
      // 创建新项目
      const project = await createProject(extId, name,ext);
      const projectId = project.id;

      // 初始化项目
      await initializeProject(projectId);

      // 获取扩展代码
      const code = await getExtensionCode(extId);
      if (code) {
        await createCommit(projectId, extId, code, name);
      }
    } else {
      // 项目已存在，检查是否需要更新
      log(`项目已存在: ${extId}`);

      const lastCommit = await getLastCommit(projectCheck.projectId);
      const currentCode = await getExtensionCode(extId);
      //log(currentCode)
      //log(lastCommit)
      if (currentCode && lastCommit) {
        if (forceMode) {
          log(`强制模式：跳过差异比较，直接更新 ${extId}`, 'info');
          await createCommit(projectCheck.projectId, extId, currentCode, name);
        } else {
          // 获取最后一次提交的文件内容进行比较
          log(`正在比较文件差异: ${extId}`);

          // 获取文件访问令牌
          const fileTokenResponse = await api.get(`/project/commit?projectid=${projectCheck.projectId}&commitid=${lastCommit.id}`);
          if (fileTokenResponse.data.status === 'success') {
            const accessFileToken = fileTokenResponse.data.accessFileToken;
            const existingContent = await getFileContent(lastCommit.commit_file, accessFileToken);

            if (existingContent && compareCode(existingContent, currentCode)) {
              log(`代码相同，跳过更新: ${extId}`, 'success');
            } else {
              log(`代码不同，创建新提交: ${extId}`, 'info');
              await createCommit(projectCheck.projectId, extId, currentCode, name);
            }
          } else {
            log(`无法获取文件访问令牌，跳过差异比较: ${extId}`, 'error');
            await createCommit(projectCheck.projectId, extId, currentCode, name);
          }
        }
      } else if (currentCode) {
        // 没有之前的提交，创建初始提交
        log(`没有之前的提交，创建初始提交: ${extId}`, 'info');
        await createCommit(projectCheck.projectId, extId, currentCode, name);
      }
    }
  } catch (error) {
    log(`同步扩展失败 ${extId}: ${error.message}`, 'error');
  }
}

// 主函数
async function main() {
  try {
    // 验证配置
    if (!config.ZEROCAT_TOKEN_40CODE || !config.apiHost) {
      log('错误: 请设置环境变量 ZEROCAT_TOKEN_40CODE 和 ZEROCAT_BACKEND', 'error');
      process.exit(1);
    }

    // 显示运行模式
    if (forceMode) {
      log('运行模式: 强制模式 (跳过差异比较)', 'info');
    } else {
      log('运行模式: 正常模式 (比较文件差异)', 'info');
    }

    log('开始扩展镜像同步...');

    // 获取扩展列表
    const extensions = await getExtensions();

    // 过滤目标扩展
    let targetExts = extensions.filter(ext =>
      config.targetExtensions.includes(ext.extId)
    );

    // 如果配置了目标作者，则添加该作者的所有扩展
    if (config.targetAuthors && config.targetAuthors.length > 0) {
      const authorExts = extensions.filter(ext =>
        config.targetAuthors.includes(ext.author)
      );

      // 合并两个列表，去重
      const allTargetExts = [...targetExts, ...authorExts];
      const uniqueExts = allTargetExts.filter((ext, index, self) =>
        index === self.findIndex(e => e.extId === ext.extId)
      );

      targetExts = uniqueExts;
      log(`通过扩展ID找到 ${extensions.filter(ext => config.targetExtensions.includes(ext.extId)).length} 个扩展`);
      log(`通过作者找到 ${authorExts.length} 个扩展`);
    }

    log(`总共找到 ${targetExts.length} 个目标扩展`);

    // 同步每个扩展
    for (const ext of targetExts) {
      //console.log(ext)
      await syncExtension(ext.extId, ext.name,ext);
      // 添加延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    log('所有扩展同步完成!', 'success');
    process.exit(0);
  } catch (error) {
    log(`程序执行失败: ${error.message}`, 'error');
    process.exit(1);
  }
}

// 运行程序
  main();
