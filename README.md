# TianCheng Blog

这是我的个人博客项目，用来整理学习笔记、技术文档和一些折腾记录。

网站地址：[https://tiancheng-blog.com](https://tiancheng-blog.com)

## 项目说明

本项目基于 [Firefly](https://github.com/CuteLeaf/Firefly) 主题进行个人化定制，底层使用 [Astro](https://astro.build) 构建，并结合 Svelte、TypeScript、Pagefind 和 Twikoo 等工具。

当前主要改动包括：

- 将站点信息、头像、导航栏、主题颜色等改为个人配置
- 新增 Linux、计算机网络等技术笔记内容
- 使用本地音乐资源作为博客音乐播放器
- 接入 Twikoo 评论系统
- 适配移动端导航栏显示
- 部署到腾讯云 Lighthouse，并通过 Nginx 提供 HTTPS 访问

## 技术栈

- Astro 7
- Svelte
- TypeScript
- Tailwind CSS
- Pagefind
- Twikoo
- Nginx

## 本地运行

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:4321` 即可预览。

## 常用命令

```bash
pnpm check
pnpm type-check
pnpm build
pnpm preview
pnpm new-post <filename>
```

## 新增文章

文章文件放在：

```text
src/content/posts/
```

可以使用命令生成新文章：

```bash
pnpm new-post my-new-post
```

然后编辑生成的 Markdown 文件即可。

## 部署说明

本项目构建后会生成静态文件到 `dist/` 目录。服务器上使用 Nginx 指向静态文件目录：

```text
/var/www/firefly
```

之后通过域名访问：

```text
https://tiancheng-blog.com
```

## 开源来源与致谢

本博客基于以下开源项目进行定制：

- [CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly)
- [saicaca/fuwari](https://github.com/saicaca/fuwari)

感谢原作者提供的优秀主题和代码基础。

## License

原主题遵循 MIT License。本仓库中的主题代码继续保留原项目版权声明；博客文章、图片、音乐等个人内容请勿直接转载或商用。
