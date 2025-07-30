import ExtensionSyncService from '../../components/extensionSyncService.js';

/**
 * 40code扩展镜像处理器
 */
class FortyCodeMirror {
  constructor(apiToken = null, apiHost = null) {
    this.extensionSyncService = new ExtensionSyncService(apiToken, apiHost);

    // 40code配置
    this.config = {
      targetExtensions: [
        // 在这里添加目标扩展ID
      ],
      targetAuthors: [
        "0832",
        "NOname",
        "NOname-awa",
        "NOname_awa",
        "白猫",
        "40code",
        "多bug的啸天犬",
        "makabakaKUN",
        "TigerCoder",
        "主核kernel"
        // 在这里添加目标作者列表
        // 程序会自动获取这些作者的所有扩展并添加到同步列表中
      ]
    };
  }

  // 日志函数
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

    // 同步所有扩展
  async syncExtensions(forceMode = false) {
    try {
      this.log('开始40code扩展同步...');

      await this.extensionSyncService.syncExtensions(
        this.config.targetExtensions,
        this.config.targetAuthors,
        forceMode,
        '40code' // 传递40code项目前缀
      );

      this.log('40code扩展同步完成!', 'success');
      return true;
    } catch (error) {
      this.log(`40code扩展同步失败: ${error.message}`, 'error');
      throw error;
    }
  }

  // 获取配置
  getConfig() {
    return this.config;
  }

  // 更新配置
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

export default FortyCodeMirror;