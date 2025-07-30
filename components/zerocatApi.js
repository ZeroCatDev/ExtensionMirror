import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * ZeroCat社区API交互组件
 */
class ZeroCatAPI {
  constructor(apiToken = null, apiHost = null) {
    this.config = {
      apiToken: apiToken || process.env.ZEROCAT_TOKEN_40CODE,
      apiHost: apiHost || process.env.ZEROCAT_BACKEND,
      username: null,
      userInfo: null
    };

    this.api = axios.create({
      baseURL: this.config.apiHost,
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    // 初始化时获取用户信息
    this.initialized = false;
  }

  // 日志函数
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  // 获取用户信息
  async getUserInfo() {
    try {
      if (!this.config.apiToken || !this.config.apiHost) {
        throw new Error('API token 或 API host 未配置');
      }

      this.log('正在获取用户信息...');
      const response = await this.api.get('/user/me');
      
      if (response.data.status === 'success') {
        this.config.userInfo = response.data.data;
        this.config.username = response.data.data.username;
        this.initialized = true;
        this.log(`用户信息获取成功: ${this.config.userInfo.display_name} (@${this.config.username})`, 'success');
        return this.config.userInfo;
      } else {
        throw new Error(`获取用户信息失败: ${response.data.message || '未知错误'}`);
      }
    } catch (error) {
      this.log(`获取用户信息失败: ${error.message}`, 'error');
      throw error;
    }
  }

  // 确保已初始化
  async ensureInitialized() {
    if (!this.initialized) {
      await this.getUserInfo();
    }
  }

  // 检查项目是否存在
  async checkProjectExists(projectName, username = null) {
    try {
      await this.ensureInitialized();
      const targetUsername = username || this.config.username;
      
      const response = await this.api.get(`/project/namespace/${targetUsername}/${projectName}`);
      return {
        exists: true,
        projectId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.log(error.response?.data);
      if (error.response && error.response.status === 404) {
        return { exists: false };
      }
      throw error;
    }
  }

  // 创建项目
  async createProject(options = {}) {
    try {
      await this.ensureInitialized();
      
      const {
        extId,
        name,
        ext,
        projectName = null,
        title = null,
        description = null,
        type = 'text',
        state = 'public'
      } = options;

      // 构建项目名称
      const finalProjectName = projectName || `40code-${extId}`;
      
      // 构建标题
      const finalTitle = title || `${name}(40code ${ext.author})`;
      
      // 构建描述
      const finalDescription = description || 
        `从 40code 镜像的 ${name} 扩展\n原作者：40code [${ext.author}](https://www.40code.com/#page=user&id=${ext.author_id})\n\n${ext.description}`;

      this.log(`正在创建项目: ${finalProjectName}`);
      
      const response = await this.api.post('/project', {
        name: finalProjectName,
        title: finalTitle,
        description: finalDescription,
        type,
        state
      });

      if (response.data.status === 'error') {
        throw new Error(`项目创建失败: ${response.data.message}`);
      }

      const projectId = response.data.id;
      if (!projectId) {
        throw new Error(`项目创建成功但未返回ID，响应数据: ${JSON.stringify(response.data)}`);
      }

      this.log(`项目创建成功: ${finalProjectName} (ID: ${projectId})`, 'success');
      return { id: projectId, name: finalProjectName, ...response.data };
    } catch (error) {
      this.log(`创建项目失败: ${error.message}`, 'error');
      if (error.response) {
        console.log('错误响应状态:', error.response.status);
        console.log('错误响应数据:', error.response.data);
      }
      throw error;
    }
  }

  // 初始化项目
  async initializeProject(projectId) {
    try {
      this.log(`正在初始化项目: ${projectId}`);
      const response = await this.api.post(`/project/initlize?projectid=${projectId}&type=text`);

      if (response.data.status === 'error') {
        throw new Error(`项目初始化失败: ${response.data.message}`);
      }

      this.log(`项目初始化成功: ${projectId}`, 'success');
      return response.data;
    } catch (error) {
      this.log(`项目初始化失败 ${projectId}: ${error.message}`, 'error');
      if (error.response) {
        console.log('错误响应状态:', error.response.status);
        console.log('错误响应数据:', error.response.data);
      }
      throw error;
    }
  }

  // 获取项目主页分支的最后一次提交
  async getLastCommit(projectId) {
    try {
      const response = await this.api.get(`/project/commits?projectid=${projectId}`);
      if (response.data && response.data.data.length > 0) {
        return response.data.data[0];
      }
      return null;
    } catch (error) {
      this.log(`获取最后提交失败: ${error.message}`, 'error');
      return null;
    }
  }

  // 获取文件内容
  async getFileContent(sha256, accessFileToken) {
    try {
      const response = await this.api.get(`/project/files/${sha256}?accessFileToken=${accessFileToken}&content=true`);
      return response.data;
    } catch (error) {
      this.log(`获取文件内容失败: ${error.message}`, 'error');
      return null;
    }
  }

  // 保存文件
  async saveFile(code) {
    try {
      this.log('正在保存文件...');
      const response = await this.api.post('/project/savefile', code, {
        headers: {
          'Content-Type': 'text/plain'
        }
      });
      this.log('文件保存成功', 'success');
      return response.data;
    } catch (error) {
      console.log(error);
      this.log(`保存文件失败: ${error.message}`, 'error');
      throw error;
    }
  }

  // 创建新提交
  async createCommit(projectId, extId, code, name) {
    try {
      this.log(`正在创建提交: ${extId}`);

      // 先保存文件
      const fileResult = await this.saveFile(code);
      const { sha256, accessFileToken } = fileResult;

      // 创建提交
      const response = await this.api.put(`/project/commit/id/${projectId}`, {
        projectid: projectId,
        accessFileToken: accessFileToken,
        message: `更新 ${name} 扩展`,
        commit_description: `同步 ${extId} 扩展`,
        branch: 'main'
      });

      this.log(`提交创建成功: ${extId}`, 'success');
      return response.data;
    } catch (error) {
      this.log(`创建提交失败 ${extId}: ${error.message}`, 'error');
      console.log(error);
      throw error;
    }
  }

  // 获取文件访问令牌
  async getFileAccessToken(projectId, commitId) {
    try {
      const response = await this.api.get(`/project/commit?projectid=${projectId}&commitid=${commitId}`);
      if (response.data.status === 'success') {
        return response.data.accessFileToken;
      }
      return null;
    } catch (error) {
      this.log(`获取文件访问令牌失败: ${error.message}`, 'error');
      return null;
    }
  }

  // 上传作品封面
  async uploadThumbnail(projectId, formData) {
    try {
      this.log(`正在上传作品封面: ${projectId}`);
      
      const response = await this.api.post(`/scratch/thumbnail/${projectId}`, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });

      this.log(`作品封面上传成功: ${projectId}`, 'success');
      return response.data;
    } catch (error) {
      this.log(`上传作品封面失败 ${projectId}: ${error.message}`, 'error');
      throw error;
    }
  }
}

export default ZeroCatAPI;