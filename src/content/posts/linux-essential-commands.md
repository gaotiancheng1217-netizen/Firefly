---
title: "Linux 常用命令速查与基础运维指南"
published: 2026-07-08
description: "归纳 Linux 环境信息、文件管理、权限、进程、磁盘、网络、服务和日志排查中常用的基础命令。"
tags: ["Linux", "Shell", "运维", "命令行"]
category: "Linux"
lang: "zh_CN"
author: "TianCheng"
draft: false
---

Linux 运维工作的核心并不是机械记忆命令，而是根据问题选择合适的工具。本篇按实际使用场景整理常见 Linux 命令，可作为日常操作与故障排查的速查文档。

> 执行 `rm`、`mv`、`chmod`、`chown`、`kill` 等可能改变系统状态的命令前，应先确认目标路径、权限和影响范围。

## 系统与环境信息

### 查看当前目录

```bash
pwd
```

`pwd` 是 **print working directory** 的缩写，用于输出当前工作目录的绝对路径。

### 查看当前用户

```bash
whoami
```

用于确认当前 Shell 以哪个用户身份运行。排查权限问题时，应首先确认操作用户。

### 查看系统与内核信息

```bash
uname -a
```

常见的补充命令：

```bash
cat /etc/os-release
hostname
uptime
date
```

| 命令 | 作用 |
| --- | --- |
| `cat /etc/os-release` | 查看 Linux 发行版与版本 |
| `hostname` | 查看主机名 |
| `uptime` | 查看运行时间与系统负载 |
| `date` | 查看当前系统时间 |

## 文件与目录管理

### 查看目录内容

```bash
ls
ls -l
ls -la
ls -lh
```

- `-l`：显示权限、所有者、大小和修改时间等详细信息。
- `-a`：包含以 `.` 开头的隐藏文件。
- `-h`：以易读单位显示文件大小。

### 切换目录

```bash
cd /etc
cd ..
cd ~
cd -
```

| 命令 | 作用 |
| --- | --- |
| `cd ..` | 返回上一级目录 |
| `cd ~` | 返回当前用户的主目录 |
| `cd -` | 返回上一次所在目录 |

### 创建文件和目录

```bash
touch example.txt
mkdir logs
mkdir -p app/config
```

`mkdir -p` 可以一次创建多级目录，并在目录已存在时避免报错。

### 复制、移动与删除

```bash
cp source.txt backup.txt
cp -r source-dir backup-dir
mv old-name.txt new-name.txt
rm file.txt
rm -r directory
```

删除操作通常不可恢复。使用递归删除前，建议先执行 `pwd` 和 `ls` 确认当前位置与目标内容。

### 查找文件

```bash
find /var/log -name "*.log"
find . -type f -size +100M
find . -type f -mtime -7
```

上述命令分别用于：

- 查找指定扩展名的日志文件；
- 查找大于 100 MB 的文件；
- 查找最近 7 天内修改过的文件。

## 查看与处理文本

### 查看文件内容

```bash
cat file.txt
less file.txt
head -n 20 file.txt
tail -n 20 file.txt
tail -f app.log
```

`tail -f` 会持续输出文件末尾新增的内容，适合实时观察应用日志。

### 搜索文本

```bash
grep "ERROR" app.log
grep -i "error" app.log
grep -R "listen" /etc/nginx
grep -n "failed" app.log
```

- `-i`：忽略大小写。
- `-R`：递归搜索目录。
- `-n`：显示匹配内容所在行号。

### 排序、统计与去重

```bash
sort access.log
sort access.log | uniq
sort access.log | uniq -c
wc -l access.log
```

管道符 `|` 会把前一个命令的输出作为后一个命令的输入，是 Shell 文本处理的基础。

### 使用 `awk` 和 `sed`

```bash
awk '{print $1}' access.log
sed -n '1,20p' file.txt
sed 's/old/new/g' file.txt
```

- `awk` 适合按列提取和处理结构化文本。
- `sed` 适合按行查看、替换和转换文本。

## 用户与权限

### 查看文件权限

```bash
ls -l file.txt
```

权限通常由三组字符组成，分别对应所有者、所属组和其他用户：

```text
-rwxr-xr--
```

- `r`：读取权限。
- `w`：写入权限。
- `x`：执行权限。

### 修改权限

```bash
chmod 755 script.sh
chmod +x script.sh
```

数字权限中：

- `4` 代表读；
- `2` 代表写；
- `1` 代表执行。

因此 `755` 表示所有者拥有读、写、执行权限，其他用户拥有读和执行权限。

### 修改所有者

```bash
sudo chown user:group file.txt
sudo chown -R user:group directory
```

递归修改目录所有者前，应确认目录中所有文件都需要变更。

## 进程与系统资源

### 查看进程

```bash
ps aux
ps aux | grep nginx
top
```

如果系统安装了 `htop`，可以获得更直观的交互式进程视图：

```bash
htop
```

### 终止进程

```bash
kill PID
kill -15 PID
kill -9 PID
```

默认的 `SIGTERM`（15）允许进程进行清理后退出。`SIGKILL`（9）会强制终止进程，应仅在普通终止无效时使用。

### 查看内存

```bash
free -h
```

重点关注 `available`，它比单独查看 `free` 更能反映系统还可以使用多少内存。

## 磁盘与文件系统

### 查看磁盘使用率

```bash
df -h
df -i
```

- `df -h`：查看各文件系统的容量使用情况。
- `df -i`：查看 inode 使用情况。当磁盘仍有空间却无法创建文件时，需要检查 inode 是否耗尽。

### 查看目录大小

```bash
du -sh /var/log
du -h --max-depth=1 /var
```

查找当前目录中占用空间较大的内容：

```bash
du -h --max-depth=1 . | sort -h
```

### 查看块设备

```bash
lsblk
```

用于查看磁盘、分区及其挂载点。

## 网络排查

### 查看网络接口和 IP

```bash
ip addr
ip route
```

分别用于查看网络接口地址与路由表。

### 检查连通性

```bash
ping -c 4 example.com
curl -I https://example.com
curl -v https://example.com
```

- `ping` 用于测试基础网络连通性，但目标可能禁用 ICMP。
- `curl -I` 只获取 HTTP 响应头。
- `curl -v` 会输出连接、TLS 和请求过程，适合排查 HTTP 服务。

### 查看端口监听

```bash
ss -lntp
ss -lntp | grep 8080
```

常用参数：

- `-l`：只显示监听端口。
- `-n`：使用数字显示地址和端口。
- `-t`：显示 TCP。
- `-p`：显示对应进程。

### DNS 查询

```bash
nslookup example.com
dig example.com
```

当域名无法访问时，应区分是 DNS 解析失败、网络不通、端口未开放，还是应用服务异常。

## 服务管理

使用 systemd 的 Linux 系统可以通过 `systemctl` 管理服务：

```bash
sudo systemctl status nginx
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx
sudo systemctl enable nginx
```

| 操作 | 说明 |
| --- | --- |
| `restart` | 停止后重新启动服务，连接可能中断 |
| `reload` | 重新加载配置，通常不会完全停止服务 |
| `enable` | 设置服务随系统启动 |

服务启动失败时，可以先查看状态：

```bash
systemctl status nginx --no-pager
```

## 日志查看

### 查看 systemd 日志

```bash
journalctl -u nginx
journalctl -u nginx -n 100
journalctl -u nginx -f
journalctl --since "1 hour ago"
```

### 常见日志位置

```text
/var/log/syslog
/var/log/messages
/var/log/auth.log
/var/log/nginx/access.log
/var/log/nginx/error.log
```

不同发行版和应用的日志位置可能不同，应结合服务配置与 `journalctl` 判断。

## 软件包管理

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install nginx
sudo apt remove nginx
```

### Rocky Linux / RHEL / CentOS

```bash
sudo dnf install nginx
sudo dnf remove nginx
```

较旧的系统可能使用 `yum`，其常用语法与 `dnf` 类似。

## 常用组合示例

### 查找日志中的错误

```bash
grep -i "error" /var/log/nginx/error.log | tail -n 50
```

### 查找占用空间最大的目录

```bash
du -h --max-depth=1 /var | sort -h
```

### 查找监听指定端口的进程

```bash
ss -lntp | grep 8080
```

### 实时查看服务日志

```bash
journalctl -u nginx -f
```

### 查看 CPU 占用较高的进程

```bash
ps aux --sort=-%cpu | head
```

## 基础故障排查顺序

当 Linux 服务无法访问时，可以按照以下顺序缩小问题范围：

1. 使用 `systemctl status` 确认服务是否运行。
2. 使用 `journalctl` 或应用日志查找报错。
3. 使用 `ss -lntp` 确认端口是否监听。
4. 使用 `curl` 从本机测试应用接口。
5. 使用 `ip addr`、`ip route` 和 `ping` 检查网络。
6. 检查防火墙、云安全组、反向代理和 DNS。
7. 使用 `top`、`free -h`、`df -h` 检查系统资源。

命令只是观察系统状态的工具。稳定的排查思路应当是先确认现象，再逐层验证网络、服务、日志和资源，最终定位根因。

