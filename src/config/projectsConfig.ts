export type ProjectStage = {
	name: string;
	items: string[];
};

export type ProjectItem = {
	slug: string;
	name: string;
	subtitle: string;
	status: string;
	progress: number;
	updatedAt: string;
	description: string;
	highlights: string[];
	completedStages: ProjectStage[];
	nextStages: string[];
	skills: string[];
};

export const projects: ProjectItem[] = [
	{
		slug: "server-sentinel",
		name: "ServerSentinel",
		subtitle: "轻量级服务器巡检与 Nginx 日志分析工具",
		status: "进行中",
		progress: 45,
		updatedAt: "2026-07-19",
		description:
			"这是一个面向 Linux 运维 / SRE 入门方向的实践项目，用 Shell、Python、Nginx 日志分析、定时任务和自动化测试，逐步构建可复用的服务器巡检工具。",
		highlights: [
			"Shell 健康检查脚本已完成基础版本",
			"Nginx access.log 分析脚本已完成第一版",
			"已加入固定样本日志与自动测试",
			"已接入 GitHub Actions 自动检查 Shell 脚本",
		],
		completedStages: [
			{
				name: "v1：Shell 服务器健康检查",
				items: [
					"检查网站 HTTP 状态码",
					"检查 Nginx 服务状态",
					"检查磁盘与内存使用情况",
					"输出巡检日志",
					"通过 crontab 定时执行",
				],
			},
			{
				name: "v2：Nginx 日志分析",
				items: [
					"统计访问总量",
					"统计 HTTP 状态码分布",
					"统计访问最多的 IP",
					"统计 404 高频路径",
					"识别 .php、wp-content、admin、.env、.git 等扫描特征",
					"统计 Referer 来源",
					"使用测试日志验证分析结果",
				],
			},
		],
		nextStages: [
			"v3：使用 Python 生成 Markdown 巡检报告",
			"v4：使用 Docker 封装工具运行环境",
			"v5：加入 AI 日志分析助手，生成排障建议",
		],
		skills: [
			"Linux",
			"Shell",
			"Nginx",
			"日志分析",
			"crontab",
			"GitHub Actions",
			"Python",
			"Docker",
		],
	},
];
