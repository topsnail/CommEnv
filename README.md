# 小区公共环境证存平台

一个用于合法留存物业不作为、小区环境脏乱差证据的 Web 应用，支持投诉、信访、起诉物业、成立业委会、减免物业费等合法维权用途。

## 功能特点

- 匿名上传证据，保护用户隐私
- 自动生成时间戳、定位、哈希值，确保证据法律效力
- 图片自动添加水印，防止篡改
- 支持图片和视频上传
- 管理员后台，可审核、导出证据
- 响应式设计，手机端优先

## 技术栈

- 前端：Vite + Vue 3 + Tailwind CSS
- 后端：Cloudflare Pages Functions
- 文件存储：Cloudflare R2
- 数据存储：Cloudflare KV
- 部署平台：Cloudflare Pages

## 项目结构

```
CommEnvTE/
├── src/
│   ├── api/
│   │   └── index.js              # API 接口封装
│   ├── router/
│   │   └── index.js              # 路由配置
│   ├── views/
│   │   ├── Home.vue              # 首页
│   │   ├── Upload.vue            # 上传页
│   │   ├── Evidence.vue          # 证据列表页
│   │   ├── Legal.vue             # 法律声明页
│   │   ├── Admin.vue             # 管理员后台
│   │   └── AdminLogin.vue        # 管理员登录
│   ├── App.vue                   # 根组件
│   ├── main.js                   # 入口文件
│   └── style.css                 # 全局样式
├── functions/
│   ├── _worker.js                # Worker 入口
│   ├── api/
│   │   ├── [[path]].js           # API 路由
│   │   ├── evidence/
│   │   │   ├── upload.js         # 上传证据
│   │   │   ├── list.js           # 获取证据列表
│   │   │   └── [id].js           # 获取证据详情
│   │   ├── admin/
│   │   │   ├── login.js          # 管理员登录
│   │   │   ├── evidence.js       # 管理员获取证据
│   │   │   ├── evidence/[id]/
│   │   │   │   ├── hide.js       # 隐藏证据
│   │   │   │   └── show.js       # 显示证据
│   │   │   ├── export/
│   │   │   │   └── excel.js      # 导出 Excel
│   │   │   └── download/
│   │   │       └── all.js        # 打包下载
│   │   └── files/
│   │       └── [file].js         # 文件访问
│   └── api/evidence/upload.js    # 上传证据（含水印）
├── docs/
│   ├── LEGAL.md                  # 法律声明
│   ├── USER_AGREEMENT.md         # 用户协议
│   ├── EVIDENCE_GUIDE.md         # 证据使用说明
│   ├── ADMIN_MANUAL.md           # 后台使用手册
│   └── USER_TUTORIAL.md          # 业主使用教程
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── wrangler.toml                 # Cloudflare 配置
├── .env.example                 # 环境变量示例
└── README.md
```

## 本地开发

### 前置要求

- Node.js 18+
- npm 或 yarn 或 pnpm
- Cloudflare 账号（用于部署）

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
VITE_API_BASE_URL=/api
```

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000` 查看应用。

### 本地测试 API

由于 Cloudflare Pages Functions 需要在 Cloudflare 环境中运行，本地测试 API 有两种方式：

#### 方式一：使用 wrangler dev

```bash
npm install -g wrangler
wrangler dev
```

#### 方式二：部署到 Cloudflare Pages 测试

参考下方部署步骤，部署到 Cloudflare Pages 进行测试。

## Cloudflare 部署

### 1. 创建 Cloudflare 账号

访问 [Cloudflare](https://dash.cloudflare.com/) 注册账号。

### 2. 创建 R2 存储桶

1. 登录 Cloudflare Dashboard
2. 进入 "R2" 页面
3. 点击 "Create bucket"
4. 输入存储桶名称（如：`community-evidence`）
5. 选择区域（推荐选择离用户最近的区域）
6. 点击 "Create bucket"

### 3. 创建 KV 命名空间

1. 进入 "Workers & Pages" → "KV"
2. 点击 "Create a namespace"
3. 输入命名空间名称（如：`community-evidence-kv`）
4. 点击 "Add"

### 4. 配置 wrangler.toml

编辑 `wrangler.toml` 文件，填入实际的 R2 和 KV 信息：

```toml
name = "community-evidence-platform"
compatibility_date = "2024-01-01"

[env.production]
vars = { ENVIRONMENT = "production" }

[env.production.kv_namespaces]
binding = "KV"
id = "YOUR_KV_NAMESPACE_ID"          # 替换为实际的 KV Namespace ID

[env.production.r2_buckets]
binding = "R2"
bucket_name = "YOUR_R2_BUCKET_NAME"   # 替换为实际的 R2 Bucket 名称

[[env.production.vars]]
ADMIN_PASSWORD = "YOUR_SECURE_ADMIN_PASSWORD"  # 替换为安全的管理员密码

[env.development]
vars = { ENVIRONMENT = "development" }

[env.development.kv_namespaces]
binding = "KV"
id = "YOUR_DEV_KV_NAMESPACE_ID"       # 替换为开发环境的 KV Namespace ID

[env.development.r2_buckets]
binding = "R2"
bucket_name = "YOUR_DEV_R2_BUCKET_NAME"  # 替换为开发环境的 R2 Bucket 名称

[[env.development.vars]]
ADMIN_PASSWORD = "dev_password_change_me"

[[rules]]
type = "ESModule"
globs = ["**/*.js"]
```

### 5. 部署到 Cloudflare Pages

#### 方式一：通过 Git 仓库部署

1. 将项目推送到 Git 仓库（GitHub、GitLab 等）
2. 登录 Cloudflare Dashboard
3. 进入 "Workers & Pages" → "Create application"
4. 选择 "Pages" → "Connect to Git"
5. 选择你的 Git 仓库
6. 配置构建设置：

```
Build command: npm run build
Build output directory: dist
```

7. 点击 "Save and Deploy"

#### 方式二：通过 wrangler 部署

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy dist --project-name=community-evidence-platform
```

### 6. 配置环境变量

在 Cloudflare Pages 项目设置中添加环境变量：

1. 进入项目设置 → "Environment variables"
2. 添加以下变量：

```
ADMIN_PASSWORD = your_secure_password
KV_NAMESPACE_ID = your_kv_namespace_id
R2_BUCKET_NAME = your_r2_bucket_name
```

### 7. 配置 R2 CORS

1. 进入 R2 存储桶设置
2. 点击 "Settings" → "CORS"
3. 添加 CORS 规则：

```json
[
  {
    "AllowedOrigins": ["https://your-domain.com"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

### 8. 配置自定义域名（可选）

1. 进入项目设置 → "Custom domains"
2. 点击 "Set up a custom domain"
3. 输入你的域名
4. 按照提示完成 DNS 配置

## 使用指南

### 业主使用

1. 访问平台首页
2. 点击"我要上传"按钮
3. 选择图片或视频文件
4. 选择问题分类
5. 填写楼栋信息（可选）
6. 确认上传
7. 上传成功后可在"查看证据"中浏览

详细使用教程请参考 [业主使用教程](docs/USER_TUTORIAL.md)

### 管理员使用

1. 访问 `/admin` 页面
2. 输入管理员密码登录
3. 查看所有证据列表
4. 可隐藏违规证据
5. 导出证据清单
6. 打包下载原始文件

详细使用手册请参考 [后台使用手册](docs/ADMIN_MANUAL.md)

## 法律声明

使用本平台即表示您已阅读、理解并同意以下法律文件：

- [法律声明](docs/LEGAL.md)
- [用户协议](docs/USER_AGREEMENT.md)
- [证据使用说明](docs/EVIDENCE_GUIDE.md)

## 安全注意事项

1. **管理员密码**：请使用强密码，不要泄露给他人
2. **环境变量**：不要将环境变量提交到 Git 仓库
3. **隐私保护**：仅拍摄公共区域，严禁拍摄隐私内容
4. **数据备份**：定期备份 KV 数据和 R2 文件
5. **访问控制**：限制管理员后台的访问权限

## 维护与更新

### 定期备份

```bash
# 备份 KV 数据
wrangler kv:key list --namespace-id=YOUR_KV_NAMESPACE_ID

# 备份 R2 文件
wrangler r2 object list community-evidence
```

### 更新依赖

```bash
npm update
npm audit fix
```

### 监控日志

在 Cloudflare Dashboard 中查看 Workers 和 Pages 的日志。

## 常见问题

### Q1：上传失败怎么办？

A：检查文件大小和格式是否符合要求，图片≤10MB，视频≤50MB，仅支持 jpg、png、mp4 格式。

### Q2：如何修改管理员密码？

A：在 Cloudflare Pages 项目设置中修改 `ADMIN_PASSWORD` 环境变量。

### Q3：如何备份数据？

A：定期导出证据清单和打包下载原始文件进行备份。

### Q4：证据可以删除吗？

A：证据一旦上传不可删除，仅管理员可隐藏违规证据（保留原始记录）。

### Q5：平台证据是否具有法律效力？

A：是的，平台证据符合《民事诉讼法》关于电子证据的规定，具有完全的法律效力。

## 技术支持

如有问题，请查看以下文档：

- [法律声明](docs/LEGAL.md)
- [用户协议](docs/USER_AGREEMENT.md)
- [证据使用说明](docs/EVIDENCE_GUIDE.md)
- [后台使用手册](docs/ADMIN_MANUAL.md)
- [业主使用教程](docs/USER_TUTORIAL.md)

## 许可证

本项目仅供学习和合法维权使用，请遵守相关法律法规。

## 免责声明

本平台仅提供证据存储服务，不参与任何纠纷，不对证据内容负责。用户因使用证据产生的一切法律后果由用户自行承担。

---

**最后更新日期：2024年1月1日**
