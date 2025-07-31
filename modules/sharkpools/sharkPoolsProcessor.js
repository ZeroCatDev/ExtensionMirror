import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import ZeroCatAPI from '../../components/zerocatApi.js';

/**
 * SharkPools扩展处理器
 */
class SharkPoolsProcessor {
  constructor(apiToken = process.env.ZEROCAT_TOKEN_SHARKPOOL, apiHost = process.env.ZEROCAT_BACKEND) {
    this.zerocatApi = new ZeroCatAPI(apiToken, apiHost);
    this.extensionsPath = path.join(process.cwd(), 'SharkPools-Extensions');
    this.extensionCodePath = path.join(this.extensionsPath, 'extension-code');
    this.extensionThumbsPath = path.join(this.extensionsPath, 'extension-thumbs');
    this.extensionKeysPath = path.join(this.extensionsPath, 'Gallery Files', 'Extension-Keys.json');
    this.processedFiles = new Map(); // 跟踪已处理的文件及其修改时间
    this.extensionKeysData = null; // 缓存 Extension-Keys.json 数据
  }

  // 日志函数
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  // 解析扩展文件头信息
  parseExtensionHeader(fileContent) {
    const lines = fileContent.split('\n').slice(0, 10); // 只读取前10行
    const header = {
      name: null,
      id: null,
      description: null,
      by: []
    };

    for (const line of lines) {
      if (line.startsWith('// Name:')) {
        header.name = line.replace('// Name:', '').trim();
      } else if (line.startsWith('// ID:')) {
        header.id = line.replace('// ID:', '').trim();
      } else if (line.startsWith('// Description:')) {
        header.description = line.replace('// Description:', '').trim();
      } else if (line.startsWith('// By:')) {
        const author = line.replace('// By:', '').trim();
        if (author) {
          header.by.push(author);
        }
      }
    }

    return header;
  }

  // 获取所有扩展文件
  getExtensionFiles() {
    try {
      if (!fs.existsSync(this.extensionCodePath)) {
        this.log(`扩展代码目录不存在: ${this.extensionCodePath}`, 'error');
        return [];
      }

      const files = fs.readdirSync(this.extensionCodePath)
        .filter(file => file.endsWith('.js'))
        .map(file => {
          const filePath = path.join(this.extensionCodePath, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            modified: stats.mtime
          };
        });

      this.log(`找到 ${files.length} 个扩展文件`);
      return files;
    } catch (error) {
      this.log(`读取扩展文件失败: ${error.message}`, 'error');
      return [];
    }
  }

  // 检查文件是否需要处理（文件有变化）
  needsProcessing(file) {
    const lastModified = this.processedFiles.get(file.name);
    return !lastModified || lastModified.getTime() !== file.modified.getTime();
  }

  // SVG转PNG
  async convertSvgToPng(svgPath, outputPath) {
    try {
      if (!fs.existsSync(svgPath)) {
        this.log(`SVG文件不存在: ${svgPath}`, 'error');
        return null;
      }

      await sharp(svgPath)
        .png()
        .resize(480, 360) // 标准缩略图尺寸
        .toFile(outputPath);

      this.log(`SVG转PNG成功: ${path.basename(outputPath)}`, 'success');
      return outputPath;
    } catch (error) {
      this.log(`SVG转PNG失败 ${svgPath}: ${error.message}`, 'error');
      return null;
    }
  }

  // 上传作品封面
  async uploadExtensionThumbnail(projectId, fileName) {
    try {
      // 从文件名获取基础名称（去掉.js后缀）
      const baseName = path.basename(fileName, '.js');
      const svgPath = path.join(this.extensionThumbsPath, `${baseName}.svg`);
      const pngPath = path.join(this.extensionThumbsPath, `${baseName}.png`);

      // 转换SVG为PNG
      const convertedPng = await this.convertSvgToPng(svgPath, pngPath);
      if (!convertedPng) {
        return false;
      }

      // 创建FormData并添加文件
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      formData.append('file', fs.createReadStream(convertedPng), {
        filename: `${baseName}.png`,
        contentType: 'image/png'
      });

      // 上传封面
      await this.zerocatApi.uploadThumbnail(projectId, formData);

      // 清理临时PNG文件
      if (fs.existsSync(pngPath)) {
        fs.unlinkSync(pngPath);
      }

      return true;
    } catch (error) {
      this.log(`上传扩展封面失败 ${fileName}: ${error.message}`, 'error');
      return false;
    }
  }

  // 处理单个扩展
  async processExtension(file) {
    try {
      this.log(`开始处理扩展: ${file.name}`);

      // 读取文件内容
      const content = fs.readFileSync(file.path, 'utf-8');

      // 解析扩展头信息
      const header = this.parseExtensionHeader(content);

      if (!header.name || !header.id || !header.description) {
        this.log(`扩展头信息不完整，跳过处理: ${file.name}`, 'error');
        return false;
      }

      this.log(`解析扩展信息: ${header.name} (${header.id})`);

      // 检查项目是否存在
      const projectCheck = await this.zerocatApi.checkProjectExists(header.id);
      let projectId;

      if (!projectCheck.exists) {
        // 创建新项目
        const authorsText = header.by.length > 0 ? header.by.join(', ') : 'SharkPool';
        const project = await this.zerocatApi.createProject({
          extId: header.id,
          name: header.name,
          ext: {
            author: authorsText,
            author_id: 'sharkpool',
            description: header.description
          },
          projectName: header.id,
          title: `${header.name}`,
          description: `从 SharkPool 镜像的 ${header.name} 扩展\n原作者：${authorsText}\n\n${header.description}`
        });
        projectId = project.id;

        // 初始化项目
        await this.zerocatApi.initializeProject(projectId);

        // 创建提交
        await this.zerocatApi.createCommit(projectId, header.id, content, header.name);
      } else {
        projectId = projectCheck.projectId;
        this.log(`项目已存在: ${header.id}`);

        // 检查代码是否有变化
        const lastCommit = await this.zerocatApi.getLastCommit(projectId);
        if (lastCommit) {
          const accessFileToken = await this.zerocatApi.getFileAccessToken(projectId, lastCommit.id);
          if (accessFileToken) {
            const existingContent = await this.zerocatApi.getFileContent(lastCommit.commit_file, accessFileToken);

            if (existingContent !== content) {
              this.log(`代码有变化，创建新提交: ${header.id}`);
              await this.zerocatApi.createCommit(projectId, header.id, content, header.name);
            } else {
              this.log(`代码无变化: ${header.id}`);
            }
          }
        } else {
          // 没有提交记录，创建初始提交
          await this.zerocatApi.createCommit(projectId, header.id, content, header.name);
        }
      }

      // 只在文件有变化时重新上传封面
      if (this.needsProcessing(file)) {
        await this.uploadExtensionThumbnail(projectId, file.name);
        // 记录处理时间
        this.processedFiles.set(file.name, file.modified);
      }

      this.log(`扩展处理完成: ${header.name}`, 'success');
      return true;
    } catch (error) {
      this.log(`处理扩展失败 ${file.name}: ${error.message}`, 'error');
      return false;
    }
  }

  // 处理所有扩展
  async processAllExtensions() {
    try {
      this.log('开始处理SharkPools扩展...');

      const extensionFiles = this.getExtensionFiles();
      if (extensionFiles.length === 0) {
        this.log('没有找到扩展文件', 'error');
        return false;
      }

      let successCount = 0;
      let failCount = 0;

      for (const file of extensionFiles) {
        try {
          const success = await this.processExtension(file);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          this.log(`处理扩展出错 ${file.name}: ${error.message}`, 'error');
          failCount++;
        }

        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.log(`处理完成: 成功 ${successCount} 个，失败 ${failCount} 个`, 'success');
      return successCount > 0;
    } catch (error) {
      this.log(`批量处理失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 处理扩展管理器中的扩展（新增功能）
  async processExtensionManager() {
    try {
      this.log('开始从扩展管理器获取扩展信息...');

      // 获取所有扩展信息
      const extensions = await this.zerocatApi.getMyExtensions();

      if (!extensions || extensions.length === 0) {
        this.log('没有找到扩展信息', 'error');
        return false;
      }

      let processedCount = 0;
      let skippedCount = 0;

      for (const extension of extensions) {
        try {
          // 检查是否需要处理图片
          if (!extension.image || extension.image.trim() === '') {
            this.log(`扩展 ${extension.id} 缺少图片，开始处理...`);

            const success = await this.processExtensionImage(extension);
            if (success) {
              processedCount++;
            }
          } else {
            this.log(`扩展 ${extension.id} 已有图片，跳过处理`);
            skippedCount++;
          }
        } catch (error) {
          this.log(`处理扩展 ${extension.id} 失败: ${error.message}`, 'error');
        }

        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.log(`扩展管理器处理完成: 处理 ${processedCount} 个，跳过 ${skippedCount} 个`, 'success');
      return processedCount > 0;
    } catch (error) {
      this.log(`扩展管理器处理失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 加载 Extension-Keys.json 数据
  loadExtensionKeysData() {
    try {
      if (this.extensionKeysData) {
        return this.extensionKeysData; // 返回缓存数据
      }

      if (!fs.existsSync(this.extensionKeysPath)) {
        this.log(`Extension-Keys.json 文件不存在: ${this.extensionKeysPath}`, 'error');
        return null;
      }

      const data = fs.readFileSync(this.extensionKeysPath, 'utf-8');
      this.extensionKeysData = JSON.parse(data);
      this.log('Extension-Keys.json 数据加载成功');
      return this.extensionKeysData;
    } catch (error) {
      this.log(`加载 Extension-Keys.json 失败: ${error.message}`, 'error');
      return null;
    }
  }

  // 根据项目名称查找扩展信息和对应的 banner SVG
  findExtensionByFileName(fileName) {
    try {
      const keysData = this.loadExtensionKeysData();
      if (!keysData || !keysData.extensions) {
        this.log('Extension-Keys.json 数据无效', 'error');
        return null;
      }

      // 遍历所有扩展，查找 URL 匹配 extension-code/{fileName}.js 的扩展
      for (const [extensionName, extensionInfo] of Object.entries(keysData.extensions)) {
        if (extensionInfo.url === `extension-code/${fileName}.js`) {
          this.log(`找到匹配的扩展: ${extensionName} -> ${extensionInfo.banner}`);
          return {
            name: extensionName,
            info: extensionInfo,
            bannerPath: path.join(this.extensionsPath, extensionInfo.banner)
          };
        }
      }

      this.log(`未在 Extension-Keys.json 中找到文件名 ${fileName} 对应的扩展`, 'error');
      return null;
    } catch (error) {
      this.log(`查找扩展失败: ${error.message}`, 'error');
      return null;
    }
  }

  // 根据项目ID查找对应的扩展文件名
  findExtensionFileByProjectId(projectId) {
    try {
      if (!fs.existsSync(this.extensionCodePath)) {
        this.log(`扩展代码目录不存在: ${this.extensionCodePath}`, 'error');
        return null;
      }

      const files = fs.readdirSync(this.extensionCodePath)
        .filter(file => file.endsWith('.js'));

      for (const file of files) {
        try {
          const filePath = path.join(this.extensionCodePath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const header = this.parseExtensionHeader(content);

          if (header.id && header.id === projectId.toString()) {
            const baseName = path.basename(file, '.js');
            this.log(`找到匹配的扩展文件: ${file} (ID: ${header.id})`);
            return baseName;
          }
        } catch (error) {
          this.log(`读取文件失败 ${file}: ${error.message}`, 'error');
        }
      }

      return null;
    } catch (error) {
      this.log(`查找扩展文件失败: ${error.message}`, 'error');
      return null;
    }
  }

  // 处理单个扩展的图片
  async processExtensionImage(extension) {
    try {
      const projectId = extension.projectid;
      const projectName = extension.project?.name || 'unknown';

      this.log(`开始为扩展 ${extension.id} (项目: ${projectName}, 项目ID: ${projectId}) 处理图片`);

      // 第一步：通过项目ID在extension-code文件中查找对应的// ID:，获得文件名
      const extensionFileName = this.findExtensionFileByProjectId(projectName);

      if (!extensionFileName) {
        this.log(`在 extension-code 中未找到项目ID ${projectName} 对应的扩展文件，跳过处理`, 'error');
        return false;
      }

      // 第二步：用这个文件名去Extension-Keys.json中查找对应的扩展信息
      const extensionInfo = this.findExtensionByFileName(extensionFileName);

      if (!extensionInfo) {
        this.log(`在 Extension-Keys.json 中未找到文件名 ${extensionFileName} 对应的扩展信息，跳过处理`, 'error');
        return false;
      }

      // 检查 banner SVG 文件是否存在
      if (!fs.existsSync(extensionInfo.bannerPath)) {
        this.log(`Banner SVG 文件不存在: ${extensionInfo.bannerPath}，跳过处理`, 'error');
        return false;
      }

      // 生成临时 PNG 文件路径
      const tempPngPath = path.join(this.extensionThumbsPath, `temp_${extensionFileName}.png`);

      // 转换SVG为PNG
      const convertedPng = await this.convertSvgToPng(extensionInfo.bannerPath, tempPngPath);
      if (!convertedPng) {
        this.log(`SVG转PNG失败: ${extensionInfo.name}`, 'error');
        return false;
      }

      // 上传图片文件
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      formData.append('file', fs.createReadStream(convertedPng), {
        filename: `${extensionFileName}.png`,
        contentType: 'image/png'
      });

      // 调用上传资产API
      const uploadResult = await this.zerocatApi.uploadAsset(formData);

      if (!uploadResult || !uploadResult.asset) {
        this.log(`上传资产失败: ${extensionInfo.name}`, 'error');
        return false;
      }

      // 构建图片文件名
      const imageFileName = `${uploadResult.asset.md5}`;

      // 更新扩展信息
      const updateResult = await this.zerocatApi.updateExtension(extension.id, {
        image: imageFileName
      });

      if (updateResult) {
        this.log(`扩展 ${extension.id} 图片更新成功: ${imageFileName}`, 'success');
      }

      // 清理临时PNG文件
      if (fs.existsSync(tempPngPath)) {
        fs.unlinkSync(tempPngPath);
      }

      return true;
    } catch (error) {
      this.log(`处理扩展图片失败 ${extension.id}: ${error.message}`, 'error');
      return false;
    }
  }

  // 监听文件变化（可选功能）
  watchExtensions() {
    try {
      if (!fs.existsSync(this.extensionCodePath)) {
        this.log('扩展目录不存在，无法监听', 'error');
        return;
      }

      this.log('开始监听扩展文件变化...');

      fs.watch(this.extensionCodePath, { recursive: false }, async (eventType, filename) => {
        if (filename && filename.endsWith('.js') && eventType === 'change') {
          this.log(`检测到文件变化: ${filename}`);

          const filePath = path.join(this.extensionCodePath, filename);
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            const file = {
              name: filename,
              path: filePath,
              modified: stats.mtime
            };

            await this.processExtension(file);
          }
        }
      });
    } catch (error) {
      this.log(`文件监听失败: ${error.message}`, 'error');
    }
  }
}

export default SharkPoolsProcessor;