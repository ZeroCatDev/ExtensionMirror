import ZeroCatAPI from './zerocatApi.js';
import ExtensionFetcher from './extensionFetcher.js';

/**
 * 扩展同步服务
 */
class ExtensionSyncService {
  constructor(apiToken = null, apiHost = null) {
    this.zerocatApi = new ZeroCatAPI(apiToken, apiHost);
    this.extensionFetcher = new ExtensionFetcher();
  }

  // 日志函数
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  // 主同步函数
  async syncExtension(extId, name, ext, forceMode = false) {
    try {
      this.log(`开始同步扩展: ${extId} (${name})`);

      // 检查项目是否存在
      const projectName = `40code-${extId}`;
      const projectCheck = await this.zerocatApi.checkProjectExists(projectName);

      if (!projectCheck.exists) {
        // 创建新项目
        const project = await this.zerocatApi.createProject({
          extId,
          name,
          ext
        });
        const projectId = project.id;

        // 初始化项目
        await this.zerocatApi.initializeProject(projectId);

        // 获取扩展代码
        const code = await this.extensionFetcher.getExtensionCode(extId);
        if (code) {
          await this.zerocatApi.createCommit(projectId, extId, code, name);
        }
      } else {
        // 项目已存在，检查是否需要更新
        this.log(`项目已存在: ${extId}`);

        const lastCommit = await this.zerocatApi.getLastCommit(projectCheck.projectId);
        const currentCode = await this.extensionFetcher.getExtensionCode(extId);
        
        if (currentCode && lastCommit) {
          if (forceMode) {
            this.log(`强制模式：跳过差异比较，直接更新 ${extId}`, 'info');
            await this.zerocatApi.createCommit(projectCheck.projectId, extId, currentCode, name);
          } else {
            // 获取最后一次提交的文件内容进行比较
            this.log(`正在比较文件差异: ${extId}`);

            const accessFileToken = await this.zerocatApi.getFileAccessToken(projectCheck.projectId, lastCommit.id);
            if (accessFileToken) {
              const existingContent = await this.zerocatApi.getFileContent(lastCommit.commit_file, accessFileToken);

              if (existingContent && this.extensionFetcher.compareCode(existingContent, currentCode)) {
                this.log(`代码相同，跳过更新: ${extId}`, 'success');
              } else {
                this.log(`代码不同，创建新提交: ${extId}`, 'info');
                await this.zerocatApi.createCommit(projectCheck.projectId, extId, currentCode, name);
              }
            } else {
              this.log(`无法获取文件访问令牌，跳过差异比较: ${extId}`, 'error');
              await this.zerocatApi.createCommit(projectCheck.projectId, extId, currentCode, name);
            }
          }
        } else if (currentCode) {
          // 没有之前的提交，创建初始提交
          this.log(`没有之前的提交，创建初始提交: ${extId}`, 'info');
          await this.zerocatApi.createCommit(projectCheck.projectId, extId, currentCode, name);
        }
      }
    } catch (error) {
      this.log(`同步扩展失败 ${extId}: ${error.message}`, 'error');
    }
  }

  // 批量同步扩展
  async syncExtensions(targetExtensions, targetAuthors, forceMode = false) {
    try {
      // 获取扩展列表
      const extensions = await this.extensionFetcher.getExtensions();

      // 过滤目标扩展
      const targetExts = this.extensionFetcher.filterTargetExtensions(
        extensions, 
        targetExtensions, 
        targetAuthors
      );

      // 同步每个扩展
      for (const ext of targetExts) {
        await this.syncExtension(ext.extId, ext.name, ext, forceMode);
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.log('所有扩展同步完成!', 'success');
      return true;
    } catch (error) {
      this.log(`批量同步失败: ${error.message}`, 'error');
      throw error;
    }
  }
}

export default ExtensionSyncService;