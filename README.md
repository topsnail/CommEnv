# 小区公共环境存证归集平台

用于记录小区公共区域环境问题的证据归集系统。  
当前版本聚焦：匿名上传、原图留存、后台审核、导出与打包。

## 当前能力（与代码一致）

- 仅支持图片上传：`jpg` / `jpeg` / `png`，单文件 `<=10MB`
- 原图直存 R2，不压缩、不裁剪、不改 EXIF
- 后端提取 EXIF + 计算 SHA-256 + 生成证据 ID（UUID）
- 上传默认 `pending`（待审核），管理员恢复为 `normal` 后前台可见
- 前台展示预览图，不直接暴露原图对象地址
- 管理员登录（Cookie 会话）、隐藏/恢复、Excel 导出、ZIP 打包下载
- 评论功能已移除（相关接口返回 410）

## 技术栈

- 前端：Vite + Vue 3 + Tailwind CSS
- 后端：Cloudflare Pages Functions
- 存储：Cloudflare R2（文件） + Cloudflare D1（结构化数据 + 管理员会话）

## 快速启动（本地）

### 1) 安装依赖

```bash
npm install
```

### 2) 配置 `wrangler.toml`

确保存在以下绑定：

- `DB`（D1）
- `R2`（R2 bucket）

管理员密码建议使用 bcrypt 哈希变量：

- `ADMIN_PASSWORD_HASH`
- `ADMIN_PASSWORD_HASH_2`（可选）

> 若配置了任意 `*_HASH`，系统会忽略明文密码变量。  
> 仅在未配置任何哈希时，才会回退使用 `ADMIN_PASSWORD` / `ADMIN_PASSWORD_2`。

### 3) 启动前后端

```bash
npm run dev:all
```

- 前端：`http://127.0.0.1:3000`
- 本地 Pages Functions：`http://127.0.0.1:8787`

## 关键脚本

- `npm run dev`：仅前端
- `npm run dev:pages`：构建 + 本地 Pages Functions
- `npm run dev:all`：前后端同时启动
- `npm run build`：生产构建

## 部署到 Cloudflare Pages

1. 连接 GitHub 仓库创建 Pages 项目
2. 构建命令：`npm run build`，输出目录：`dist`
3. 在项目设置绑定：`DB` / `R2`
4. 配置环境变量：`ADMIN_PASSWORD_HASH`（必需），`ADMIN_PASSWORD_HASH_2`（可选）
5. 重新部署并验证以下路径：
   - `/`
   - `/api/evidence/list`
   - `/admin/login`

## 审查结论（本次修订）

已修正 README 中以下不一致或不合适描述：

- 删除“支持视频上传”“自动加水印”等旧描述
- 已完成管理员会话从 KV 到 D1 的迁移
- 删除“完全法律效力”这类绝对化表述
- 同步为“上传默认待审核（pending）”

## Git 生成环境列表（建议纳入忽略）

以下内容属于构建/本地运行生成内容，不建议提交：

- `node_modules/`
- `dist/`
- `.wrangler/`
- `*.log`
- `.env`
- `.env.*`
- `.DS_Store`
- `Thumbs.db`

## 建议纳入版本控制的环境模板

建议提交以下“模板文件”，避免泄露真实密钥：

- `.env.example`
- `wrangler.toml`（不放真实密码与密钥）
- `docs/` 下运维说明

## 合规与边界声明

- 平台仅用于公共区域问题记录，不建议上传人脸、车牌、室内等隐私内容
- 平台提供存储与展示能力，不承诺当然具备司法采信效力
- 证据效力以司法机关结合形成过程、真实性、完整性进行认定

---

最后更新：2026-03-27
