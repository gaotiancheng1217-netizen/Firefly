---
title: "systemd 服务管理与日志排障指南"
published: 2026-07-15
description: "归纳 systemd 管理 Linux 服务时常用的 systemctl、journalctl、unit 文件、开机自启、自动重启、服务日志和常见启动失败排查方法。"
tags: ["Linux", "systemd", "运维", "日志", "故障排查"]
category: "Linux"
lang: "zh_CN"
author: "TianCheng"
draft: false
---

systemd 是现代 Linux 系统中最常见的服务管理系统。Nginx、SSH、数据库、评论系统、后端 API 等长期运行的服务，通常都由 systemd 负责启动、停止、重启、开机自启和日志管理。

在运维场景中，systemd 解决的是一个核心问题：

```text
如何让一个程序以服务的形式稳定运行
```

它不只是“启动服务”的工具，还负责：

- 管理服务生命周期；
- 设置开机自启；
- 记录服务日志；
- 失败后自动重启；
- 统一查看服务状态；
- 通过配置文件描述服务如何运行。

## systemd、systemctl 与 journalctl

这三个概念经常一起出现：

| 名称 | 作用 |
| --- | --- |
| `systemd` | Linux 的服务管理系统 |
| `systemctl` | 管理服务的命令行工具 |
| `journalctl` | 查看 systemd 日志的命令行工具 |

可以简单理解为：

```text
systemd 是后台管理者
systemctl 是控制按钮
journalctl 是日志查看器
```

例如：

```bash
sudo systemctl status nginx
```

表示询问 systemd：

```text
nginx 这个服务现在是什么状态？
```

而：

```bash
journalctl -u nginx
```

表示查看：

```text
nginx 这个服务产生过哪些日志？
```

## 服务的基本状态

查看服务状态：

```bash
sudo systemctl status nginx
```

常见状态如下：

| 状态 | 含义 |
| --- | --- |
| `active (running)` | 服务正在运行 |
| `inactive (dead)` | 服务没有运行 |
| `failed` | 服务启动或运行失败 |
| `activating` | 服务正在启动 |
| `deactivating` | 服务正在停止 |

看到 `active (running)` 不一定代表业务完全正常，只能说明进程存在。还需要结合端口、HTTP 响应和日志判断服务是否真正可用。

例如 Nginx 正在运行，但网站仍然 404，问题可能是站点文件路径、`root` 配置或静态文件缺失。

## 常用 systemctl 命令

### 启动服务

```bash
sudo systemctl start nginx
```

启动一个当前未运行的服务。

### 停止服务

```bash
sudo systemctl stop nginx
```

停止服务。停止后，相关端口通常也不再监听。

### 重启服务

```bash
sudo systemctl restart nginx
```

先停止，再启动。适合服务状态异常或配置需要完整重新加载时使用。

### 重新加载服务配置

```bash
sudo systemctl reload nginx
```

让服务重新读取配置，通常不中断现有连接。

对于 Nginx 这类服务，修改配置后一般优先使用 `reload`。如果 `reload` 不支持或无效，再考虑 `restart`。

### 设置开机自启

```bash
sudo systemctl enable nginx
```

设置服务随系统启动自动启动。

### 取消开机自启

```bash
sudo systemctl disable nginx
```

取消服务开机自启，但不会立即停止正在运行的服务。

### 查看是否开机自启

```bash
systemctl is-enabled nginx
```

常见输出：

```text
enabled
disabled
```

## start、enable、restart 的区别

这几个命令容易混淆：

| 命令 | 是否立刻影响服务 | 是否影响开机自启 |
| --- | --- | --- |
| `start` | 是，立刻启动 | 否 |
| `stop` | 是，立刻停止 | 否 |
| `restart` | 是，立刻重启 | 否 |
| `enable` | 否，只设置开机自启 | 是 |
| `disable` | 否，只取消开机自启 | 是 |

因此，第一次部署服务时通常会执行：

```bash
sudo systemctl enable nginx
sudo systemctl start nginx
```

或者：

```bash
sudo systemctl enable --now nginx
```

`--now` 表示：

```text
设置开机自启的同时，立刻启动服务
```

## journalctl 查看服务日志

服务出问题时，不能只看 `systemctl status`，还需要看详细日志。

### 查看指定服务日志

```bash
journalctl -u nginx
```

### 查看最近 100 行日志

```bash
journalctl -u nginx -n 100
```

### 实时跟踪日志

```bash
journalctl -u nginx -f
```

`-f` 类似 `tail -f`，会持续输出新日志。

### 不分页显示

```bash
journalctl -u nginx --no-pager
```

适合复制日志或快速查看。

### 查看某个时间之后的日志

```bash
journalctl -u nginx --since "1 hour ago"
journalctl -u nginx --since "2026-07-15 10:00:00"
```

当问题发生在某个时间段时，按时间过滤日志会比从头翻日志更高效。

## unit 文件是什么

systemd 通过 unit 文件描述一个服务如何运行。

常见服务文件位置：

```text
/etc/systemd/system/
/lib/systemd/system/
/usr/lib/systemd/system/
```

自己创建的服务通常放在：

```text
/etc/systemd/system/
```

例如：

```text
/etc/systemd/system/twikoo.service
```

一个典型的服务文件如下：

```ini
[Unit]
Description=Twikoo Comment Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/twikoo-data
Environment=TWIKOO_DATA=/var/www/twikoo-data
ExecStart=/usr/local/bin/tkserver
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## unit 文件结构

### Unit 部分

```ini
[Unit]
Description=Twikoo Comment Server
After=network.target
```

常见字段：

| 字段 | 作用 |
| --- | --- |
| `Description` | 服务描述 |
| `After` | 指定服务启动顺序 |

`After=network.target` 表示该服务应在基础网络初始化之后启动。

这并不等于“网络完全可用”，但对大多数普通服务已经足够。

### Service 部分

```ini
[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/twikoo-data
Environment=TWIKOO_DATA=/var/www/twikoo-data
ExecStart=/usr/local/bin/tkserver
Restart=always
RestartSec=5
```

这是最重要的部分，用来描述服务如何运行。

| 字段 | 作用 |
| --- | --- |
| `Type` | 服务启动类型 |
| `User` | 以哪个用户运行 |
| `WorkingDirectory` | 服务工作目录 |
| `Environment` | 环境变量 |
| `ExecStart` | 启动命令 |
| `Restart` | 失败后是否自动重启 |
| `RestartSec` | 重启前等待时间 |

### Install 部分

```ini
[Install]
WantedBy=multi-user.target
```

这一段决定服务启用开机自启时，挂到哪个启动目标下。

普通服务器服务一般使用：

```ini
WantedBy=multi-user.target
```

## ExecStart 的常见问题

`ExecStart` 是服务真正执行的启动命令。

例如：

```ini
ExecStart=/usr/local/bin/tkserver
```

这里最好写绝对路径，而不是只写：

```ini
ExecStart=tkserver
```

因为 systemd 运行服务时的环境变量和你手动登录终端时不完全一样。终端里能找到的命令，systemd 未必能找到。

可以用下面命令查找程序路径：

```bash
which tkserver
```

如果输出：

```text
/usr/local/bin/tkserver
```

那么 unit 文件里就应该写：

```ini
ExecStart=/usr/local/bin/tkserver
```

## 修改 unit 文件后的操作

修改 service 文件后，不能只保存文件，还需要让 systemd 重新读取配置：

```bash
sudo systemctl daemon-reload
```

然后重启服务：

```bash
sudo systemctl restart twikoo
```

查看状态：

```bash
sudo systemctl status twikoo
```

完整流程：

```bash
sudo nano /etc/systemd/system/twikoo.service
sudo systemctl daemon-reload
sudo systemctl restart twikoo
sudo systemctl status twikoo
```

如果忘记执行 `daemon-reload`，systemd 可能仍然使用旧配置。

## 自动重启策略

后端服务可能因为异常退出。为了提高稳定性，可以设置：

```ini
Restart=always
RestartSec=5
```

含义：

```text
服务退出后自动重启
重启前等待 5 秒
```

常见取值：

| 配置 | 含义 |
| --- | --- |
| `Restart=no` | 不自动重启 |
| `Restart=on-failure` | 失败退出时重启 |
| `Restart=always` | 只要退出就重启 |

对于普通后端服务，常用：

```ini
Restart=on-failure
```

如果服务必须长期保持运行，也可以使用：

```ini
Restart=always
```

## 端口检查

服务显示 running 后，还需要确认端口是否真的监听。

```bash
sudo ss -lntp
```

查看指定端口：

```bash
sudo ss -lntp | grep 8080
```

如果一个服务应该监听 `8080`，但 `ss` 查不到，说明服务虽然可能启动过，但没有正确提供监听。

此时需要查看：

```bash
journalctl -u twikoo -n 100 --no-pager
```

## 本机访问测试

对于后端服务，不要一开始就从浏览器访问域名排查。应该先在服务器本机测试。

例如 Twikoo 后端监听 `8080`：

```bash
curl http://127.0.0.1:8080
```

如果本机访问失败，说明问题在后端服务本身。

如果本机访问成功，但通过域名访问失败，例如：

```bash
curl https://tiancheng-blog.com/twikoo/
```

失败，则重点检查：

- Nginx 反向代理配置；
- HTTPS 配置；
- location 路径；
- proxy_pass 地址；
- Nginx 错误日志。

## 常见错误：status=203/EXEC

systemd 中常见错误：

```text
status=203/EXEC
```

通常表示 systemd 无法执行 `ExecStart` 指定的命令。

常见原因：

- `ExecStart` 路径写错；
- 文件不存在；
- 文件没有执行权限；
- 脚本第一行解释器路径错误；
- 写了相对路径而不是绝对路径。

排查方法：

```bash
which tkserver
ls -lah /usr/local/bin/tkserver
sudo journalctl -u twikoo -n 100 --no-pager
```

如果 `which tkserver` 输出：

```text
/usr/local/bin/tkserver
```

就应确保 unit 文件中也是：

```ini
ExecStart=/usr/local/bin/tkserver
```

## 常见错误：服务不断重启

如果状态里看到：

```text
activating (auto-restart)
```

或者日志不断出现 Started / Failed，说明服务在反复退出。

常见原因：

- 启动命令执行后立刻结束；
- 程序报错退出；
- 缺少环境变量；
- 数据目录没有权限；
- 端口被占用；
- 配置文件路径错误。

排查命令：

```bash
sudo systemctl status twikoo
journalctl -u twikoo -n 100 --no-pager
sudo ss -lntp | grep 8080
```

如果端口被占用，可以查看是谁占用了端口：

```bash
sudo ss -lntp | grep 8080
```

## 常见错误：权限不足

如果服务需要读写某个目录，但运行用户没有权限，可能启动失败或运行异常。

例如：

```ini
User=ubuntu
WorkingDirectory=/var/www/twikoo-data
Environment=TWIKOO_DATA=/var/www/twikoo-data
```

需要确保 `ubuntu` 用户能读写这个目录：

```bash
sudo chown -R ubuntu:ubuntu /var/www/twikoo-data
ls -lah /var/www/twikoo-data
```

权限问题常见于：

- 数据目录；
- 日志目录；
- 上传目录；
- 配置文件；
- SQLite 数据库文件。

## Nginx 与 systemd 的关系

Nginx 本身也是一个 systemd 服务：

```bash
sudo systemctl status nginx
```

它监听 80 / 443，对外提供 Web 入口。

后端服务，例如 Twikoo，也可以由 systemd 管理：

```bash
sudo systemctl status twikoo
```

常见链路如下：

```text
浏览器
  ↓
Nginx 服务
  ↓
反向代理到 127.0.0.1:8080
  ↓
Twikoo 服务
```

如果浏览器访问 `/twikoo/` 返回 `502 Bad Gateway`，通常不是静态文件问题，而是 Nginx 无法连接后端服务。

此时排查顺序应该是：

1. `systemctl status twikoo`
2. `journalctl -u twikoo`
3. `ss -lntp | grep 8080`
4. `curl http://127.0.0.1:8080`
5. `tail -n 50 /var/log/nginx/error.log`

## 服务排障标准流程

当一个 systemd 服务不可用时，可以按下面顺序排查：

### 1. 查看服务状态

```bash
sudo systemctl status 服务名
```

先确认服务是 running、failed，还是 inactive。

### 2. 查看服务日志

```bash
journalctl -u 服务名 -n 100 --no-pager
```

日志通常会直接给出失败原因。

### 3. 检查启动命令

```bash
which 程序名
ls -lah /path/to/program
```

确认 `ExecStart` 路径正确，并且文件可以执行。

### 4. 检查端口监听

```bash
sudo ss -lntp
```

确认服务是否真正监听预期端口。

### 5. 本机访问测试

```bash
curl http://127.0.0.1:端口
```

先确认服务本身可用，再排查 Nginx、域名和外部访问。

### 6. 检查权限

```bash
ls -lah 相关目录
```

确认服务运行用户能读写所需文件和目录。

### 7. 修改配置后重新加载 systemd

```bash
sudo systemctl daemon-reload
sudo systemctl restart 服务名
```

修改 unit 文件后必须执行 `daemon-reload`。

## 常用命令速查

| 命令 | 作用 |
| --- | --- |
| `systemctl status nginx` | 查看服务状态 |
| `systemctl start nginx` | 启动服务 |
| `systemctl stop nginx` | 停止服务 |
| `systemctl restart nginx` | 重启服务 |
| `systemctl reload nginx` | 重新加载服务配置 |
| `systemctl enable nginx` | 设置开机自启 |
| `systemctl disable nginx` | 取消开机自启 |
| `systemctl is-enabled nginx` | 查看是否开机自启 |
| `journalctl -u nginx` | 查看服务日志 |
| `journalctl -u nginx -f` | 实时查看服务日志 |
| `systemctl daemon-reload` | 重新加载 systemd 配置 |

## 小结

systemd 是 Linux 服务稳定运行的基础。对于运维和 SRE，需要重点掌握：

- 用 `systemctl` 管理服务状态；
- 用 `journalctl` 查看服务日志；
- 理解 `start` 与 `enable` 的区别；
- 理解 unit 文件中的 `ExecStart`、`User`、`WorkingDirectory`、`Restart`；
- 修改 unit 文件后执行 `daemon-reload`；
- 通过端口监听和本机 `curl` 判断服务是否真正可用；
- 根据日志定位启动失败、权限不足、命令路径错误和端口占用等问题。

当一个服务不可用时，不应只反复重启，而应按链路确认：

```text
服务状态
  ↓
服务日志
  ↓
启动命令
  ↓
运行用户和权限
  ↓
端口监听
  ↓
本机访问
  ↓
Nginx 或外部访问
```

只要能按照这条顺序排查，大多数 Linux 服务启动失败、后端不可用和 Nginx 502 问题都可以被快速定位。
