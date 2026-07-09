import type { FriendLink, FriendsPageConfig } from "../types/friendsConfig";

// 友链页面配置
export const friendsPageConfig: FriendsPageConfig = {
	title: "友链与参考",
	description: "这里整理一些友链、参考项目和技术资源。",
	showCustomContent: true,
	showComment: true,
	randomizeSort: false,
};

// 友链配置
export const friendsConfig: FriendLink[] = [
	{
		title: "TianCheng Blog",
		imgurl: "/assets/images/avatar2.avif",
		desc: "TianCheng 的个人博客，记录学习、技术和实践。",
		siteurl: "https://tiancheng-blog.com",
		tags: ["Blog"],
		weight: 10,
		enabled: true,
	},
	{
		title: "Firefly",
		imgurl: "https://docs-firefly.cuteleaf.cn/logo.png",
		desc: "本博客使用的 Astro 博客主题模板。",
		siteurl: "https://github.com/CuteLeaf/Firefly",
		tags: ["Theme"],
		weight: 9,
		enabled: true,
	},
	{
		title: "Astro",
		imgurl: "https://avatars.githubusercontent.com/u/44914786?v=4&s=640",
		desc: "用于构建内容驱动网站的现代 Web 框架。",
		siteurl: "https://astro.build",
		tags: ["Framework"],
		weight: 8,
		enabled: true,
	},
];

// 获取启用的友链并排序
export const getEnabledFriends = (): FriendLink[] => {
	const friends = friendsConfig.filter((friend) => friend.enabled);

	if (friendsPageConfig.randomizeSort) {
		return friends.sort(() => Math.random() - 0.5);
	}

	return friends.sort((a, b) => b.weight - a.weight);
};
