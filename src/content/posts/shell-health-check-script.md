---
title: "Shell 脚本基础与服务器健康检查实践"
published: 2026-07-17
description: "归纳 Shell 脚本在自动化运维中的基础用法，并以网站健康检查脚本为例，覆盖 HTTP 状态码、Nginx 服务状态、磁盘空间、内存使用率、日志记录和 crontab 定时任务。"
tags: ["Linux", "Shell", "自动化运维", "crontab", "Nginx"]
category: "Linux"
lang: "zh_CN"
author: "TianCheng"
draft: false
---

Shell 脚本是 Linux 运维自动化中最基础、最常用的工具之一。服务器巡检、日志分析、定时备份、服务重启、部署发布、磁盘清理等重复性操作，都可以通过 Shell 脚本固化为可重复执行的流程。

在运维场景中，Shell 脚本的价值不在于语法复杂，而在于把人工操作变成：

```text
可重复执行
可记录结果
可定时运行
可扩展告警
可用于排障
```

本文以一个网站健康检查脚本为例，归纳 Shell 脚本的基础语法和常见运维用法。

## Shell 脚本的基本结构

一个最简单的 Shell 脚本通常以解释器声明开头：

```bash
#!/bin/bash
```

这行称为 shebang，表示该脚本使用 `bash` 解释执行。

脚本文件通常以 `.sh` 作为后缀，例如：

```text
health-check.sh
backup-site.sh
nginx-log-summary.sh
```

创建脚本后，需要赋予执行权限：

```bash
chmod +x health-check.sh
```

然后可以直接执行：

```bash
./health-check.sh
```

如果没有执行权限，也可以通过 `bash` 调用：

```bash
bash health-check.sh
```

## 变量

Shell 中可以使用变量保存路径、网址、状态码等信息。

```bash
URL="https://tiancheng-blog.com"
LOG_FILE="$HOME/health-check.log"
```

变量赋值时，等号两边不能有空格。

正确写法：

```bash
URL="https://tiancheng-blog.com"
```

错误写法：

```bash
URL = "https://tiancheng-blog.com"
```

使用变量时，需要在变量名前加 `$`：

```bash
echo "$URL"
```

为了避免变量中包含空格或特殊字符导致解析错误，实际脚本中建议始终给变量加双引号：

```bash
echo "$LOG_FILE"
```

## 命令替换

Shell 可以把一条命令的输出保存到变量中。

```bash
TIME=$(date "+%Y-%m-%d %H:%M:%S")
```

其中：

```bash
$(...)
```

表示先执行括号内的命令，再把输出结果作为变量值。

例如：

```bash
STATUS_CODE=$(curl -o /dev/null -s -w "%{http_code}" "$URL")
```

这行命令会访问指定 URL，并把 HTTP 状态码保存到 `STATUS_CODE` 变量中。

## if 判断

Shell 中可以使用 `if` 对条件进行判断。

```bash
if [ "$STATUS_CODE" = "200" ]; then
  echo "网站正常"
else
  echo "网站异常"
fi
```

需要注意：

- `[` 和 `]` 两边必须有空格；
- 字符串比较常用 `=`；
- `fi` 表示 `if` 语句结束。

多个条件可以使用 `&&` 连接：

```bash
if [ "$STATUS_CODE" = "200" ] && [ "$NGINX_STATUS" = "active" ]; then
  echo "网站和 Nginx 都正常"
fi
```

`&&` 表示“并且”，只有两个条件都成立时，整体条件才成立。

## 字符串判断与数字判断

Shell 中常见判断可以分为字符串判断和数字判断。

字符串判断常用于比较状态码、服务状态、参数内容：

```bash
if [ "$NGINX_STATUS" = "active" ]; then
  echo "Nginx 正常"
fi
```

常见字符串判断：

| 写法 | 含义 |
|---|---|
| `=` | 字符串相等 |
| `!=` | 字符串不相等 |
| `-z "$VAR"` | 字符串为空 |
| `-n "$VAR"` | 字符串不为空 |

示例：

```bash
if [ -z "$URL" ]; then
  echo "URL 不能为空"
  exit 1
fi
```

数字判断常用于比较磁盘使用率、内存使用率、请求数量等：

```bash
if [ "$DISK_USAGE" -gt 80 ]; then
  echo "磁盘使用率过高"
fi
```

常见数字比较符号：

| 写法 | 含义 |
|---|---|
| `-lt` | 小于 |
| `-le` | 小于等于 |
| `-gt` | 大于 |
| `-ge` | 大于等于 |
| `-eq` | 等于 |
| `-ne` | 不等于 |

需要注意，字符串比较和数字比较不要混用。例如：

```bash
[ "$STATUS_CODE" = "200" ]
```

适合比较 HTTP 状态码字符串。

```bash
[ "$DISK_USAGE" -gt 80 ]
```

适合比较磁盘使用率数字。

## 脚本参数

Shell 脚本可以从命令行接收参数。

例如执行脚本时传入一个 URL：

```bash
./health-check.sh https://tiancheng-blog.com
```

脚本中可以通过 `$1` 读取第一个参数：

```bash
URL="$1"
```

常见参数变量：

| 写法 | 含义 |
|---|---|
| `$0` | 当前脚本名称 |
| `$1` | 第一个参数 |
| `$2` | 第二个参数 |
| `$#` | 参数个数 |
| `$@` | 所有参数 |

示例：

```bash
#!/bin/bash

URL="$1"

if [ -z "$URL" ]; then
  echo "Usage: $0 <url>"
  exit 1
fi

STATUS_CODE=$(curl -o /dev/null -s -w "%{http_code}" "$URL")
echo "$URL status=$STATUS_CODE"
```

这样脚本就不再把检查目标写死，而是可以检查不同网站。

## 函数

当脚本逻辑变多时，可以使用函数把不同检查项拆开。

函数格式：

```bash
function_name() {
  command
}
```

示例：

```bash
check_site() {
  STATUS_CODE=$(curl -o /dev/null -s -w "%{http_code}" "$URL")

  if [ "$STATUS_CODE" = "200" ]; then
    echo "网站正常"
    return 0
  else
    echo "网站异常：$STATUS_CODE"
    return 1
  fi
}

check_site
```

这里的 `check_site` 是函数名，最后一行 `check_site` 表示调用函数。

函数可以让脚本结构更清楚。例如：

```text
check_site
check_nginx
check_disk
check_memory
write_summary
```

每个函数只负责一个检查项，后续修改时不容易影响其他部分。

## 退出码、return 与 exit

Linux 命令执行结束后，都会产生一个退出码。

通常：

```text
0 表示成功
非 0 表示失败
```

查看上一条命令的退出码：

```bash
echo $?
```

脚本中常用 `exit` 表示整个脚本的结束状态：

```bash
exit 0
```

表示脚本正常结束。

```bash
exit 1
```

表示脚本异常结束。

函数中常用 `return` 返回函数执行结果：

```bash
check_nginx() {
  NGINX_STATUS=$(systemctl is-active nginx)

  if [ "$NGINX_STATUS" = "active" ]; then
    return 0
  else
    return 1
  fi
}
```

`return` 和 `exit` 的区别：

| 写法 | 作用范围 |
|---|---|
| `return` | 结束当前函数 |
| `exit` | 结束整个脚本 |

在健康检查脚本中，退出码很重要。因为 `cron`、GitHub Actions、监控系统都可以根据退出码判断脚本是否执行成功。

## for 循环

`for` 循环适合遍历一组固定对象。

例如检查多个网站：

```bash
for URL in https://tiancheng-blog.com https://example.com; do
  STATUS_CODE=$(curl -o /dev/null -s -w "%{http_code}" "$URL")
  echo "$URL status=$STATUS_CODE"
done
```

基本结构：

```bash
for ITEM in list; do
  command
done
```

也可以遍历多个服务：

```bash
for SERVICE in nginx ssh cron; do
  STATUS=$(systemctl is-active "$SERVICE")
  echo "$SERVICE: $STATUS"
done
```

## while 循环

`while` 循环适合在条件成立时反复执行。

示例：

```bash
COUNT=1

while [ "$COUNT" -le 5 ]; do
  echo "第 $COUNT 次检查"
  COUNT=$((COUNT + 1))
done
```

其中：

```bash
$((COUNT + 1))
```

表示进行数学计算。

`while` 也常用于逐行读取文件：

```bash
while read -r LINE; do
  echo "$LINE"
done < access.log
```

这种写法可以逐行处理日志文件。

## HTTP 状态码检查

网站是否可用，最直接的检查方式是访问网站并读取 HTTP 状态码。

```bash
STATUS_CODE=$(curl \
  --connect-timeout 5 \
  --max-time 10 \
  -o /dev/null \
  -s \
  -w "%{http_code}" \
  "$URL")
```

参数说明：

| 参数 | 作用 |
|---|---|
| `--connect-timeout 5` | 连接最多等待 5 秒 |
| `--max-time 10` | 整个请求最多执行 10 秒 |
| `-o /dev/null` | 不保存网页内容 |
| `-s` | 静默模式，不输出进度 |
| `-w "%{http_code}"` | 只输出 HTTP 状态码 |

常见状态码：

| 状态码 | 含义 |
|---|---|
| `200` | 请求成功 |
| `301` / `302` | 重定向 |
| `403` | 禁止访问 |
| `404` | 页面不存在 |
| `500` | 服务端错误 |
| `502` | 网关错误 |
| `000` | 没有拿到 HTTP 响应，常见于 DNS 失败、连接失败、超时 |

## Nginx 服务状态检查

如果网站无法访问，除了页面本身的问题，也可能是 Nginx 服务异常。

可以使用：

```bash
systemctl is-active nginx
```

如果 Nginx 正常运行，输出通常是：

```text
active
```

脚本中可以写成：

```bash
NGINX_STATUS=$(systemctl is-active nginx)
```

然后判断：

```bash
if [ "$NGINX_STATUS" = "active" ]; then
  echo "Nginx 正常"
else
  echo "Nginx 异常"
fi
```

## 磁盘空间检查

服务器磁盘空间不足是常见故障原因。磁盘满了可能导致：

- 日志无法写入；
- 数据库无法正常工作；
- 部署失败；
- 服务启动异常；
- 临时文件无法创建。

检查根目录 `/` 的磁盘使用率：

```bash
df /
```

示例输出：

```text
Filesystem     1K-blocks    Used Available Use% Mounted on
/dev/vda1       41151808 8150000  33001808  20% /
```

取出使用率：

```bash
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
```

拆解：

| 片段 | 作用 |
|---|---|
| `df /` | 查看根目录所在磁盘 |
| `awk 'NR==2 {print $5}'` | 取第二行第五列，即 `Use%` |
| `tr -d '%'` | 删除百分号，保留数字 |

数字比较使用：

```bash
[ "$DISK_USAGE" -lt 80 ]
```

其中 `-lt` 表示小于。

常见数字比较符号：

| 写法 | 含义 |
|---|---|
| `-lt` | 小于 |
| `-le` | 小于等于 |
| `-gt` | 大于 |
| `-ge` | 大于等于 |
| `-eq` | 等于 |
| `-ne` | 不等于 |

## 内存使用率检查

查看内存：

```bash
free -m
```

示例输出：

```text
               total        used        free      shared  buff/cache   available
Mem:            1968         500         300          20        1168        1300
Swap:              0           0           0
```

计算内存使用率：

```bash
MEM_USAGE=$(free | awk '/Mem:/ {printf("%.0f", $3/$2 * 100)}')
```

含义：

| 片段 | 作用 |
|---|---|
| `/Mem:/` | 找到包含 `Mem:` 的行 |
| `$2` | 总内存 |
| `$3` | 已使用内存 |
| `$3/$2 * 100` | 计算使用率 |
| `printf("%.0f", ...)` | 输出整数，不带小数 |

需要注意，Linux 会把部分空闲内存用于缓存，因此在更严谨的监控中，也可以结合 `available` 字段判断内存压力。入门阶段使用 `used / total` 计算即可理解基本逻辑。

## 日志记录

运维脚本应当记录执行结果。否则脚本即使定时运行，也很难追踪历史状态。

可以使用：

```bash
echo "内容" >> "$LOG_FILE"
```

其中：

| 符号 | 作用 |
|---|---|
| `>` | 覆盖写入 |
| `>>` | 追加写入 |

巡检日志通常使用追加写入，避免覆盖历史记录。

如果希望把错误输出也写入日志，可以使用：

```bash
command >> "$LOG_FILE" 2>&1
```

其中：

| 写法 | 含义 |
|---|---|
| `1` | 标准输出 |
| `2` | 标准错误 |
| `2>&1` | 把错误输出合并到标准输出 |

例如：

```bash
systemctl status nginx >> "$LOG_FILE" 2>&1
```

表示无论命令输出正常信息还是错误信息，都追加写入同一个日志文件。

建议区分普通日志和错误日志：

```bash
LOG_FILE="$HOME/health-check.log"
ERROR_LOG_FILE="$HOME/health-check-error.log"
```

普通日志记录所有检查结果，错误日志只记录异常，便于排查。

## 完整健康检查脚本

```bash
#!/bin/bash

URL="https://tiancheng-blog.com"
LOG_FILE="$HOME/health-check.log"
ERROR_LOG_FILE="$HOME/health-check-error.log"

TIME=$(date "+%Y-%m-%d %H:%M:%S")

STATUS_CODE=$(curl \
  --connect-timeout 5 \
  --max-time 10 \
  -o /dev/null \
  -s \
  -w "%{http_code}" \
  "$URL")

NGINX_STATUS=$(systemctl is-active nginx)
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
MEM_USAGE=$(free | awk '/Mem:/ {printf("%.0f", $3/$2 * 100)}')

if [ "$STATUS_CODE" = "200" ] && [ "$NGINX_STATUS" = "active" ] && [ "$DISK_USAGE" -lt 80 ] && [ "$MEM_USAGE" -lt 80 ]; then
  echo "[$TIME] OK: $URL status=$STATUS_CODE nginx=$NGINX_STATUS disk=${DISK_USAGE}% mem=${MEM_USAGE}%" >> "$LOG_FILE"
  echo "网站、Nginx、磁盘、内存都正常"
else
  echo "[$TIME] ERROR: $URL status=$STATUS_CODE nginx=$NGINX_STATUS disk=${DISK_USAGE}% mem=${MEM_USAGE}%" >> "$LOG_FILE"
  echo "[$TIME] ERROR: $URL status=$STATUS_CODE nginx=$NGINX_STATUS disk=${DISK_USAGE}% mem=${MEM_USAGE}%" >> "$ERROR_LOG_FILE"
  echo "发现异常：status=$STATUS_CODE nginx=$NGINX_STATUS disk=${DISK_USAGE}% mem=${MEM_USAGE}%"
fi
```

该脚本完成了四类检查：

| 检查项 | 判断标准 |
|---|---|
| 网站状态 | HTTP 状态码为 `200` |
| Nginx 服务 | `systemctl is-active nginx` 输出 `active` |
| 磁盘空间 | 根目录使用率小于 `80%` |
| 内存使用 | 内存使用率小于 `80%` |

如果希望让外部工具识别脚本结果，可以在最后加入退出码：

```bash
if [ "$STATUS_CODE" = "200" ] && [ "$NGINX_STATUS" = "active" ] && [ "$DISK_USAGE" -lt 80 ] && [ "$MEM_USAGE" -lt 80 ]; then
  exit 0
else
  exit 1
fi
```

这样脚本不只是写日志，还能把成功或失败状态返回给调用方。

## crontab 定时执行

手动运行脚本只能检查一次。要实现自动巡检，可以使用 `crontab`。

编辑当前用户的定时任务：

```bash
crontab -e
```

添加：

```bash
*/5 * * * * /home/ubuntu/health-check.sh
```

表示每 5 分钟执行一次脚本。

crontab 的时间格式：

```text
分钟 小时 日期 月份 星期 命令
```

常见示例：

| 表达式 | 含义 |
|---|---|
| `*/5 * * * *` | 每 5 分钟执行一次 |
| `0 * * * *` | 每小时整点执行一次 |
| `0 2 * * *` | 每天凌晨 2 点执行一次 |
| `0 2 * * 0` | 每周日凌晨 2 点执行一次 |
| `30 23 * * *` | 每天 23:30 执行一次 |

查看当前定时任务：

```bash
crontab -l
```

查看巡检日志：

```bash
tail -f /home/ubuntu/health-check.log
```

如果每 5 分钟出现一条新记录，说明定时任务已经正常运行。

在 `crontab` 中建议把输出重定向到日志文件：

```text
*/5 * * * * /home/ubuntu/health-check.sh >> /home/ubuntu/health-check.log 2>&1
```

这样即使脚本在定时执行时出现错误，也能在日志中找到记录。

## 脚本调试

脚本执行结果不符合预期时，可以使用调试方式运行。

显示每一步实际执行的命令：

```bash
bash -x health-check.sh
```

也可以在脚本开头加入：

```bash
set -x
```

表示开启调试输出。

如果希望脚本在某条命令失败时立即停止，可以使用：

```bash
set -e
```

常见调试方式：

| 写法 | 作用 |
|---|---|
| `bash -x script.sh` | 临时查看脚本执行过程 |
| `set -x` | 在脚本中开启命令追踪 |
| `set +x` | 关闭命令追踪 |
| `set -e` | 命令失败时立即退出脚本 |

调试时可以先使用 `bash -x`，确认变量值和命令执行顺序是否符合预期。

## 常见巡检指标

服务器健康检查通常可以分为应用可用性、系统资源、服务状态和外部依赖四类。

| 类型 | 常见指标 | 常用命令或工具 |
|---|---|---|
| 应用可用性 | HTTP 状态码、响应时间、页面关键字 | `curl` |
| 服务状态 | Nginx、数据库、后台服务是否运行 | `systemctl` |
| 端口监听 | Web、SSH、数据库端口是否开放 | `ss`、`lsof` |
| 磁盘空间 | 根目录、日志目录、数据目录使用率 | `df`、`du` |
| 内存状态 | 内存使用率、可用内存、Swap 使用情况 | `free` |
| CPU 状态 | CPU 使用率、负载、异常进程 | `top`、`uptime`、`ps` |
| 证书状态 | HTTPS 证书剩余有效期 | `openssl` |
| 容器状态 | Docker 容器是否运行、是否频繁重启 | `docker ps`、`docker logs` |
| 数据库连接 | 数据库是否可连接、查询是否正常 | `mysql`、`psql` |
| 日志异常 | 4xx、5xx、关键错误信息 | `grep`、`awk`、`journalctl` |

巡检脚本的设计重点不是一次性检查所有指标，而是根据服务的重要性逐步增加检查项。对于个人站点或小型服务，HTTP 状态码、服务状态、磁盘空间和内存使用率通常已经能覆盖大部分基础故障。

## 异常处理方式

巡检发现异常后，常见处理方式包括：

- 写入错误日志；
- 在终端输出明确错误信息；
- 发送邮件、企业微信、Telegram 等通知；
- 自动执行安全的恢复动作；
- 将异常记录交给监控系统；
- 结合日志分析工具进一步定位原因。

需要注意，自动恢复动作应当谨慎使用。比如重启服务、删除文件、清理日志等操作都可能影响线上环境。更稳妥的做法是先记录异常并通知人工确认，再逐步引入自动恢复。

## 小结

一个基础运维巡检脚本通常包含以下部分：

```text
定义检查目标
获取当前时间
执行检查命令
保存检查结果
判断是否异常
写入日志
定时执行
持续改进
```
