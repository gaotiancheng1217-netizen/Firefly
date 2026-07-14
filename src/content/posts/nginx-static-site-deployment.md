---
title: "Nginx 静态网站部署与常见故障排查"
published: 2026-07-14
description: "归纳 Nginx 部署静态网站时涉及的 server、listen、server_name、root、location、try_files、HTTPS、反向代理、缓存和日志排障方法。"
tags: ["Nginx", "Linux", "运维", "Web 服务", "故障排查"]
category: "Nginx"
lang: "zh_CN"
author: "TianCheng"
draft: false
---

Nginx 是运维和 SRE 工作中非常常见的 Web 服务组件。它既可以直接提供静态网站访问，也可以作为反向代理，把外部请求转发给后端服务。

对于个人博客、文档站、前端项目这类静态网站，Nginx 的核心作用可以概括为：

```text
浏览器请求域名
  ↓
DNS 解析到服务器 IP
  ↓
请求进入服务器 80 / 443 端口
  ↓
Nginx 根据域名和路径匹配配置
  ↓
读取静态文件或转发到后端服务
  ↓
返回响应
```

本文围绕静态网站部署场景整理 Nginx 的基础配置、常用命令和常见故障排查方法。

## Nginx 在部署链路中的位置

以静态博客部署为例，完整链路通常如下：

```text
用户访问 https://tiancheng-blog.com
  ↓
DNS 将域名解析到服务器公网 IP
  ↓
云安全组允许 443 端口访问
  ↓
Nginx 监听 443 端口
  ↓
Nginx 根据 server_name 匹配站点配置
  ↓
Nginx 从 /var/www/firefly 读取 index.html 和静态资源
  ↓
浏览器渲染页面
```

如果网站无法访问，需要沿着这条链路逐层检查，而不是只看某一个配置文件。

## 常见目录与配置文件

在 Ubuntu / Debian 系统中，Nginx 常见目录如下：

| 路径 | 作用 |
| --- | --- |
| `/etc/nginx/nginx.conf` | Nginx 主配置文件 |
| `/etc/nginx/sites-available/` | 可用站点配置目录 |
| `/etc/nginx/sites-enabled/` | 已启用站点配置目录 |
| `/var/www/` | 常用网站文件存放目录 |
| `/var/log/nginx/access.log` | 访问日志 |
| `/var/log/nginx/error.log` | 错误日志 |

常见做法是将站点配置写在：

```text
/etc/nginx/sites-available/firefly
```

然后创建软链接启用：

```bash
sudo ln -s /etc/nginx/sites-available/firefly /etc/nginx/sites-enabled/firefly
```

这样可以把“配置文件存在”和“配置文件启用”分开管理。

## 静态网站的基础配置

一个最小可用的静态网站配置如下：

```nginx
server {
    listen 80;
    server_name tiancheng-blog.com www.tiancheng-blog.com;

    root /var/www/firefly;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

### listen

`listen` 用来指定 Nginx 监听的端口。

```nginx
listen 80;
```

常见端口：

| 端口 | 用途 |
| --- | --- |
| `80` | HTTP |
| `443` | HTTPS |

如果 Nginx 没有监听对应端口，外部请求就无法进入 Nginx。

### server_name

`server_name` 用来匹配访问的域名。

```nginx
server_name tiancheng-blog.com www.tiancheng-blog.com;
```

当一台服务器部署多个网站时，Nginx 会根据请求中的域名选择对应的 `server` 块。

如果 `server_name` 写错，可能出现：

- 域名访问到默认站点；
- HTTPS 证书和域名不匹配；
- 配置明明存在但没有被命中。

### root

`root` 指向网站文件所在目录。

```nginx
root /var/www/firefly;
```

如果用户访问：

```text
https://tiancheng-blog.com/about/
```

Nginx 会尝试从下面的路径寻找文件：

```text
/var/www/firefly/about/
```

静态网站部署时，构建产物通常需要解压到 `root` 指向的目录中。

### index

`index` 表示默认首页文件。

```nginx
index index.html;
```

当用户访问目录路径时，例如：

```text
/
/about/
```

Nginx 会尝试返回该目录下的 `index.html`。

如果目录中没有 `index.html`，常见结果是 `403 Forbidden` 或 `404 Not Found`。

### location

`location` 用来匹配 URL 路径。

```nginx
location / {
    try_files $uri $uri/ =404;
}
```

这里的 `/` 表示匹配所有普通请求。

更具体的路径可以单独配置，例如：

```nginx
location /twikoo/ {
    proxy_pass http://127.0.0.1:8080/;
}
```

这表示访问 `/twikoo/` 时，不再读取静态文件，而是转发给本机 `8080` 端口上的后端服务。

## try_files 的作用

静态网站中常见配置：

```nginx
try_files $uri $uri/ =404;
```

含义是按顺序尝试：

1. `$uri`：查找请求路径对应的文件；
2. `$uri/`：查找请求路径对应的目录；
3. `=404`：前面都找不到就返回 404。

例如访问：

```text
/posts/linux-essential-commands/
```

Nginx 会尝试：

```text
/var/www/firefly/posts/linux-essential-commands
/var/www/firefly/posts/linux-essential-commands/
/var/www/firefly/posts/linux-essential-commands/index.html
```

对于 Astro 静态站点，文章页面通常会被构建成：

```text
posts/linux-essential-commands/index.html
```

因此 `try_files $uri $uri/ =404;` 能够正常处理目录式路由。

## HTTPS 与 Certbot

生产网站通常应使用 HTTPS。常见做法是使用 Certbot 自动申请 Let's Encrypt 证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tiancheng-blog.com -d www.tiancheng-blog.com
```

Certbot 会自动修改 Nginx 配置，添加类似内容：

```nginx
listen 443 ssl;
ssl_certificate /etc/letsencrypt/live/tiancheng-blog.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/tiancheng-blog.com/privkey.pem;
```

同时通常会添加 HTTP 到 HTTPS 的跳转：

```nginx
return 301 https://$host$request_uri;
```

检查证书自动续期：

```bash
sudo certbot renew --dry-run
```

如果 HTTPS 异常，优先检查：

- 域名是否解析到当前服务器；
- 443 端口是否开放；
- Nginx 配置是否通过检查；
- 证书路径是否正确；
- 证书是否过期。

## 反向代理

Nginx 不仅能提供静态文件，也能把请求转发给后端服务。

典型配置：

```nginx
location /twikoo/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

这类配置常用于：

- 评论系统；
- API 服务；
- 后台管理系统；
- Node.js / Python / Java 后端服务。

请求链路如下：

```text
浏览器访问 /twikoo/
  ↓
Nginx 接收 HTTPS 请求
  ↓
Nginx 转发到 127.0.0.1:8080
  ↓
后端服务处理请求
  ↓
Nginx 将响应返回给浏览器
```

反向代理场景下，如果后端服务没有启动，常见错误是：

```text
502 Bad Gateway
```

## 缓存策略

静态网站通常会生成带 hash 的资源文件，例如：

```text
/_astro/Navbar.BJ7x9a.js
/_astro/index.D8f3k.css
```

这类文件名变化后内容也变化，适合设置较长缓存：

```nginx
location /_astro/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

但 HTML 文件不建议长期缓存，因为它会引用最新的 CSS 和 JS 文件。可以设置：

```nginx
location ~* \.html$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

这样可以降低部署后浏览器仍然加载旧页面、旧资源导致样式混乱的概率。

静态站点常见缓存策略：

| 内容 | 建议 |
| --- | --- |
| HTML | 不长期缓存 |
| 带 hash 的 JS / CSS | 长缓存 |
| 图片 | 可适当缓存 |
| 音乐文件 | 可缓存，但注意体积 |

## 常用管理命令

### 检查配置语法

```bash
sudo nginx -t
```

修改配置后必须先检查语法。如果配置错误，不应直接 reload。

### 重新加载配置

```bash
sudo systemctl reload nginx
```

`reload` 会重新加载配置，通常不会完全中断现有连接。

### 重启 Nginx

```bash
sudo systemctl restart nginx
```

`restart` 会停止后再启动服务。一般只有服务状态异常或 reload 无效时再使用。

### 查看运行状态

```bash
sudo systemctl status nginx
```

如果服务启动失败，可以继续查看日志：

```bash
journalctl -u nginx -n 100 --no-pager
```

## 日志排查

Nginx 排障时最重要的两个日志是：

```text
/var/log/nginx/access.log
/var/log/nginx/error.log
```

### access.log

访问日志记录请求是否到达 Nginx。

实时查看：

```bash
sudo tail -f /var/log/nginx/access.log
```

如果浏览器访问网站时，`access.log` 没有任何新记录，说明请求可能没有到达 Nginx，需要检查：

- DNS；
- 云安全组；
- 防火墙；
- 端口监听；
- 域名是否访问了正确服务器。

### error.log

错误日志记录 Nginx 处理请求时遇到的问题。

查看最近错误：

```bash
sudo tail -n 100 /var/log/nginx/error.log
```

常见错误包括：

- 文件不存在；
- 权限不足；
- 后端服务连接失败；
- 配置路径错误；
- SSL 证书异常。

## 常见故障与排查方法

### 403 Forbidden

常见原因：

- `root` 指向目录中没有 `index.html`；
- 文件或目录权限不足；
- Nginx 用户没有读取权限；
- 访问的是目录，但没有允许目录列表；
- 解压后的文件层级不对。

排查命令：

```bash
ls -lah /var/www/firefly
ls -lah /var/www/firefly/index.html
sudo tail -n 50 /var/log/nginx/error.log
```

如果压缩包解压后变成：

```text
/var/www/firefly/dist/index.html
```

而 Nginx 的 `root` 是：

```text
/var/www/firefly
```

就会导致路径不匹配。正确情况应该是：

```text
/var/www/firefly/index.html
```

### 404 Not Found

常见原因：

- 请求路径不存在；
- 构建产物缺失；
- `try_files` 配置不正确；
- 部署目录不是最新版本；
- 资源路径引用错误。

排查命令：

```bash
find /var/www/firefly -name "index.html" | head
sudo nginx -T | grep -n "root"
```

如果某个文章页面 404，需要确认对应目录是否存在：

```bash
ls -lah /var/www/firefly/posts/
```

### 502 Bad Gateway

502 通常出现在反向代理场景。

常见原因：

- 后端服务没有启动；
- 后端端口写错；
- 后端只监听了错误地址；
- Nginx 无法连接后端；
- 后端服务启动后立刻退出。

以 Twikoo 这类后端服务为例，可以检查：

```bash
sudo systemctl status twikoo
sudo ss -lntp | grep 8080
curl http://127.0.0.1:8080
sudo tail -n 50 /var/log/nginx/error.log
```

如果本机访问 `127.0.0.1:8080` 都失败，问题通常在后端服务，而不是 Nginx。

### 504 Gateway Timeout

504 表示 Nginx 等待后端服务响应超时。

常见原因：

- 后端服务响应过慢；
- 后端程序卡住；
- 数据库或外部接口慢；
- Nginx 代理超时时间较短。

排查方向：

- 查看后端服务日志；
- 检查 CPU、内存、磁盘负载；
- 检查后端接口是否能直接访问；
- 必要时调整代理超时。

### HTTPS 显示不安全

常见原因：

- 证书没有配置；
- 证书过期；
- 访问的是 HTTP；
- 页面中混用了 HTTP 资源；
- 域名和证书不匹配。

检查命令：

```bash
sudo certbot certificates
curl -I https://tiancheng-blog.com
```

如果浏览器地址栏显示“不安全”，需要区分是：

- 没有使用 HTTPS；
- 证书不可信；
- 页面存在 mixed content；
- 本地缓存仍保留旧状态。

### CSS 或 JS 没有加载

静态网站部署后，如果页面像“没有 CSS 渲染”，常见原因包括：

- 静态资源路径 404；
- 浏览器缓存了旧 HTML；
- Nginx 缓存策略不合理；
- 部署时没有清空旧文件；
- 新旧版本资源混在一起。

排查方法：

```bash
curl -I https://tiancheng-blog.com/_astro/xxx.css
```

同时可以在浏览器开发者工具的 Network 面板查看 CSS 和 JS 是否返回 `200`。

部署静态站点时，建议先清空旧目录再解压新版本：

```bash
sudo rm -rf /var/www/firefly/*
sudo unzip -o ~/firefly-ver9.zip -d /var/www/firefly
```

这样可以避免旧资源残留。

## 一套标准排查流程

当网站无法访问时，可以按下面顺序排查：

### 1. 检查 DNS

```bash
nslookup tiancheng-blog.com
dig tiancheng-blog.com
```

确认域名是否解析到正确服务器 IP。

### 2. 检查端口监听

```bash
sudo ss -lntp | grep nginx
```

确认 `80` 和 `443` 是否处于监听状态。

### 3. 检查 Nginx 配置

```bash
sudo nginx -t
```

如果语法错误，需要先修复配置。

### 4. 检查本机访问

```bash
curl -I http://127.0.0.1
curl -I https://tiancheng-blog.com
```

本机访问失败时，优先查 Nginx、站点文件和服务状态。

### 5. 检查站点目录

```bash
ls -lah /var/www/firefly
ls -lah /var/www/firefly/index.html
```

确认部署目录中存在首页文件。

### 6. 检查日志

```bash
sudo tail -n 100 /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

日志通常比猜测更可靠。

### 7. 检查云安全组和防火墙

确认至少开放：

```text
TCP 22
TCP 80
TCP 443
```

如果有后端服务通过公网直接访问，还需要额外开放对应端口。但更推荐让后端只监听本机，由 Nginx 反向代理访问。

## 部署静态网站的推荐流程

静态网站更新时，推荐流程如下：

```bash
sudo mkdir -p /var/www/firefly
sudo rm -rf /var/www/firefly/*
sudo unzip -o ~/firefly-ver9.zip -d /var/www/firefly
sudo find /var/www/firefly -type d -exec chmod 755 {} \;
sudo find /var/www/firefly -type f -exec chmod 644 {} \;
sudo nginx -t
sudo systemctl reload nginx
```

对应含义：

| 步骤 | 作用 |
| --- | --- |
| 创建目录 | 确保部署目录存在 |
| 清空旧文件 | 避免新旧静态资源混合 |
| 解压新版本 | 发布最新构建产物 |
| 修正权限 | 确保 Nginx 可以读取文件 |
| 检查配置 | 避免错误配置影响线上服务 |
| 重新加载 | 让配置变更生效 |

## 运维视角下的关键点

Nginx 排障的核心不是记住某个配置项，而是建立链路意识：

```text
域名是否解析正确
  ↓
端口是否开放
  ↓
Nginx 是否监听
  ↓
server_name 是否匹配
  ↓
root 是否指向正确目录
  ↓
index.html 是否存在
  ↓
location 是否正确处理路径
  ↓
后端服务是否正常
  ↓
日志是否有明确错误
```

对静态网站而言，最常见的问题集中在：

- 构建产物没有放到正确目录；
- Nginx `root` 指错；
- 权限不足；
- HTTPS 配置不完整；
- 反向代理后端不可用；
- 浏览器缓存旧资源。

## 小结

Nginx 是连接“用户请求”和“服务器资源”的核心入口。对于静态网站部署，需要重点掌握：

- `listen` 决定监听端口；
- `server_name` 决定匹配域名；
- `root` 决定读取哪个目录；
- `index` 决定默认首页；
- `location` 决定路径如何处理；
- `try_files` 决定静态文件查找顺序；
- `proxy_pass` 决定请求是否转发给后端；
- `access.log` 和 `error.log` 是排障时最直接的依据。

当网站出问题时，应从 DNS、端口、Nginx、站点文件、后端服务和日志几个层面逐步验证。只要能把请求链路拆开，大多数 Web 部署问题都可以被快速定位。
