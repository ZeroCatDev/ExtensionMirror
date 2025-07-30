import axios from 'axios';

/**
 * 40Code扩展获取组件
 */
class ExtensionFetcher {
  constructor() {
    this.baseUrl = 'https://api.abc.520gxx.com/work/ext';
    this.codeBaseUrl = 'https://abc.520gxx.com/ext';
  }

  // 日志函数
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  // 获取扩展列表
  async getExtensions() {
    try {
      this.log('正在获取扩展列表...');
      const response = await axios.get(this.baseUrl);
      this.log(`成功获取 ${response.data.length} 个扩展`);
      return response.data;
    } catch (error) {
      this.log(`获取扩展列表失败: ${error.message}`, 'error');
      throw error;
    }
  }

  // 获取扩展代码
  async getExtensionCode(extId) {
    try {
      const response = await axios.get(`${this.codeBaseUrl}/${extId}.js`);
      return response.data;
    } catch (error) {
      this.log(`获取扩展代码失败 ${extId}: ${error.message}`, 'error');
      return null;
    }
  }

  // 过滤目标扩展
  filterTargetExtensions(extensions, targetExtensions, targetAuthors) {
    let targetExts = extensions.filter(ext =>
      targetExtensions.includes(ext.extId)
    );

    // 如果配置了目标作者，则添加该作者的所有扩展
    if (targetAuthors && targetAuthors.length > 0) {
      const authorExts = extensions.filter(ext =>
        targetAuthors.includes(ext.author)
      );

      // 合并两个列表，去重
      const allTargetExts = [...targetExts, ...authorExts];
      const uniqueExts = allTargetExts.filter((ext, index, self) =>
        index === self.findIndex(e => e.extId === ext.extId)
      );

      targetExts = uniqueExts;
      this.log(`通过扩展ID找到 ${extensions.filter(ext => targetExtensions.includes(ext.extId)).length} 个扩展`);
      this.log(`通过作者找到 ${authorExts.length} 个扩展`);
    }

    this.log(`总共找到 ${targetExts.length} 个目标扩展`);
    return targetExts;
  }

  // 比较代码内容
  compareCode(code1, code2) {
    return code1 === code2;
  }
}

export default ExtensionFetcher;