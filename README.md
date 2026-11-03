# QM系统 · Cloudflare Pages + D1 完整部署包

采购售卖利润管理系统，支持本地存储 + Cloudflare 云端多设备同步。

## 目录结构

```
qm-system/
├── index.html              # 前端主程序（已对接 /api/sync）
├── functions/
│   └── api/
│       └── sync.js         # Pages Function（云同步接口）
├── schema.sql              # D1 建表语句
├── wrangler.toml           # 配置示例
└── README.md               # 本说明
```

## 一、准备工作

1. 注册/登录 [Cloudflare](https://dash.cloudflare.com)
2. 安装 Node.js，然后安装 Wrangler：
   ```bash
   npm install -g wrangler
   wrangler login
   ```

## 二、创建 D1 数据库

```bash
npx wrangler d1 create qm-sync
```

命令会输出 `database_id`，把它复制到 `wrangler.toml` 的 `database_id` 字段。

然后执行建表：

```bash
# 远程正式库
npx wrangler d1 execute qm-sync --file=./schema.sql --remote

# 本地开发测试（可选）
npx wrangler d1 execute qm-sync --file=./schema.sql --local
```

## 三、部署到 Cloudflare Pages

### 方式 A：连接 GitHub（推荐）

1. 把本目录推送到 GitHub 仓库
2. Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 选择仓库，构建设置：
   - Framework preset: **None**
   - Build command: 留空
   - Build output directory: `/` 或 `.`
4. 点击保存并部署
5. 部署完成后进入项目 → **Settings** → **Functions** → **D1 database bindings**
   - Variable name 填：`DB`
   - 选择刚才创建的 `qm-sync` 数据库
6. 重新部署一次（或再 push 一次代码）让绑定生效

### 方式 B：直接上传

在 Cloudflare Pages 选择 **Direct Upload**，上传整个文件夹（需要包含 `functions` 目录）。

## 四、使用

1. 打开你的 `*.pages.dev` 地址
2. 首次使用设置登录密码
3. 进入「汇率设置」页面 → 填写「同步口令」（多设备填完全一样的，至少 4 位）→ 保存
4. 点「上传到云端」或开启「保存订单后自动上传」
5. 其他设备同样填相同口令 → 点「从云端拉取」

## 五、本地开发测试（可选）

```bash
# 启动本地预览（会模拟 Pages + Functions）
npx wrangler pages dev . --d1 DB=<你的 database_id>
```

## 六、注意事项

- 同步口令和登录密码是两套独立的东西
- 免费额度对个人使用完全足够（静态请求无限，Functions 每天 10 万次，D1 5GB）
- 正式上线后建议把 `sync.js` 里的 CORS `*` 改成你的具体域名
- 数据以「整包 JSON」形式存储，个人订单量完全够用

## 七、常见问题

**上传失败提示无法连接接口**
- 确认已正确绑定 D1（变量名必须是 `DB`）
- 确认已重新部署过

**云端暂无数据**
- 先在一台设备上点「上传到云端」

**想换同步口令**
- 直接在设置里改口令并保存，然后重新上传即可（旧口令对应的数据仍保留在 D1）
