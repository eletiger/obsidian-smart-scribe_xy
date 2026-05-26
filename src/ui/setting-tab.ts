import { App, PluginSettingTab, Setting, DropdownComponent } from "obsidian";
import { PLATFORM_DEFAULTS, fetchOllamaModels, fetchLMStudioModels, type AIPlatform } from "../ai-provider";
import type AIMetadataPlugin from "../../main";

type LocalPlatform = "ollama" | "lmstudio";

const LOCAL_PLATFORMS: readonly LocalPlatform[] = ["ollama", "lmstudio"] as const;

function isLocalPlatform(p: string): p is LocalPlatform {
	return (LOCAL_PLATFORMS as readonly string[]).includes(p);
}

function getFetchFunction(platform: LocalPlatform): (baseUrl: string) => Promise<string[]> {
	switch (platform) {
		case "ollama":
			return fetchOllamaModels;
		case "lmstudio":
			return fetchLMStudioModels;
	}
}

export class AIMetadataSettingTab extends PluginSettingTab {
	plugin: AIMetadataPlugin;
	activeTab: string = "model";

	constructor(app: App, plugin: AIMetadataPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// 创建 Tab 导航 - 参考 Enveloppe 风格
		const tabBar = containerEl.createEl("nav", { cls: "ai-settings-tab-bar" });

		// AI 模型配置 Tab
		const modelTab = tabBar.createEl("div", {
			cls: "ai-settings-tab" + (this.activeTab === "model" ? " ai-settings-tab-active" : " ai-settings-tab-inactive"),
		});

		// 图标 - 使用 createSvg 代替 innerHTML
		const modelIcon = modelTab.createEl("div", { cls: "ai-settings-tab-icon" });
		const modelSvg = modelIcon.createSvg("svg", {
			attr: {
				xmlns: "http://www.w3.org/2000/svg",
				width: "18",
				height: "18",
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": "2",
				"stroke-linecap": "round",
				"stroke-linejoin": "round"
			}
		});
		modelSvg.createSvg("path", { attr: { d: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" } });

		// 文字
		modelTab.createEl("div", {
			cls: "ai-settings-tab-name",
			text: "AI 模型配置"
		});

		// 插件功能配置 Tab
		const featureTab = tabBar.createEl("div", {
			cls: "ai-settings-tab" + (this.activeTab === "feature" ? " ai-settings-tab-active" : " ai-settings-tab-inactive"),
		});

		// 图标 - 使用 createSvg 代替 innerHTML
		const featureIcon = featureTab.createEl("div", { cls: "ai-settings-tab-icon" });
		const featureSvg = featureIcon.createSvg("svg", {
			attr: {
				xmlns: "http://www.w3.org/2000/svg",
				width: "18",
				height: "18",
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": "2",
				"stroke-linecap": "round",
				"stroke-linejoin": "round"
			}
		});
		featureSvg.createSvg("circle", { attr: { cx: "12", cy: "12", r: "3" } });
		featureSvg.createSvg("path", { attr: { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" } });

		// 文字
		featureTab.createEl("div", {
			cls: "ai-settings-tab-name",
			text: "插件功能配置"
		});

		// 设置选中状态样式
		if (this.activeTab === "model") {
			modelTab.classList.add("ai-settings-tab-active");
			modelTab.classList.remove("ai-settings-tab-inactive");
			featureTab.classList.add("ai-settings-tab-inactive");
			featureTab.classList.remove("ai-settings-tab-active");
		} else {
			featureTab.classList.add("ai-settings-tab-active");
			featureTab.classList.remove("ai-settings-tab-inactive");
			modelTab.classList.add("ai-settings-tab-inactive");
			modelTab.classList.remove("ai-settings-tab-active");
		}

		// hover 效果
		modelTab.addEventListener("mouseenter", () => {
			if (this.activeTab !== "model") {
				modelTab.classList.add("ai-settings-tab-hover");
			}
		});
		modelTab.addEventListener("mouseleave", () => {
			modelTab.classList.remove("ai-settings-tab-hover");
		});

		// hover 效果
		featureTab.addEventListener("mouseenter", () => {
			if (this.activeTab !== "feature") {
				featureTab.classList.add("ai-settings-tab-hover");
			}
		});
		featureTab.addEventListener("mouseleave", () => {
			featureTab.classList.remove("ai-settings-tab-hover");
		});

		// Tab 切换事件
		modelTab.addEventListener("click", () => {
			this.activeTab = "model";
			this.display();
		});

		featureTab.addEventListener("click", () => {
			this.activeTab = "feature";
			this.display();
		});

		// 根据当前 Tab 显示对应内容
		if (this.activeTab === "model") {
			this.displayModelSettings(containerEl);
		} else {
			this.displayFeatureSettings(containerEl);
		}
	}

	displayModelSettings(containerEl: HTMLElement): void {
		// 平台选择
		new Setting(containerEl)
			.setName("AI 平台")
			.setDesc("选择要使用的 AI 平台")
			.addDropdown((dropdown) => {
				for (const [key, value] of Object.entries(PLATFORM_DEFAULTS)) {
					dropdown.addOption(key, value.name);
				}
				dropdown
					.setValue(this.plugin.settings.activePlatform)
					.onChange(async (value) => {
						this.plugin.settings.activePlatform = value as AIPlatform;
						await this.plugin.saveSettings();
						// 刷新设置面板以显示对应平台的配置
						this.display();
					});
			});

		// 当前平台的配置
		const currentPlatform = this.plugin.settings.activePlatform;
		const platformConfig = this.plugin.settings.platforms[currentPlatform];
		const platformDefaults = PLATFORM_DEFAULTS[currentPlatform];

		new Setting(containerEl)
			.setName(`${platformDefaults.name} 配置`)
			.setHeading();

		// API Key
		const isLocal = isLocalPlatform(currentPlatform);
		const apiKeyDesc = isLocal
			? `${platformDefaults.name} 不需要 API Key，填写任意占位符即可`
			: `${platformDefaults.name} 的 API key`;

		new Setting(containerEl)
			.setName("API key")
			.setDesc(apiKeyDesc)
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder(isLocal ? `${currentPlatform}（占位符）` : "输入 API key...")
					.setValue(platformConfig.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.platforms[currentPlatform].apiKey = value;
						await this.plugin.saveSettings();
					});
			});

		// 模型选择
		const modelDesc = isLocalPlatform(currentPlatform)
			? "选择使用的模型"
			: "选择或输入模型名称，支持手动输入自定义模型";
		const modelSetting = new Setting(containerEl)
			.setName("模型")
			.setDesc(modelDesc);

		if (isLocalPlatform(currentPlatform)) {
			this.buildLocalModelDropdown(modelSetting, platformConfig, currentPlatform);
		} else {
			// 文本输入 + datalist 建议：既能选预设模型，也能手打自定义模型名
			const datalistId = `ai-model-list-${currentPlatform}`;

			// 先创建 datalist 挂到 containerEl，确保 DOM 中可被 input 的 list 属性找到
			const datalist = containerEl.createEl("datalist");
			datalist.id = datalistId;
			for (const model of platformDefaults.models) {
				datalist.createEl("option", { value: model });
			}

			modelSetting.addText((text) => {
				text.inputEl.setAttribute("list", datalistId);
				text.inputEl.setAttribute("autocomplete", "off");
				text
					.setPlaceholder("输入或选择模型...")
					.setValue(platformConfig.model || platformDefaults.defaultModel)
					.onChange(async (value) => {
						this.plugin.settings.platforms[currentPlatform].model = value;
						await this.plugin.saveSettings();
					});
			});
		}

		// Base URL（可选，用于自定义端点）
		new Setting(containerEl)
			.setName("Base URL")
			.setDesc("可选，用于自定义 API 端点或代理")
			.addText((text) => {
				text
					.setPlaceholder(platformDefaults.baseUrl)
					.setValue(platformConfig.baseUrl || "")
					.onChange(async (value) => {
						this.plugin.settings.platforms[currentPlatform].baseUrl = value || platformDefaults.baseUrl;
						await this.plugin.saveSettings();
					});
			});

		// Temperature
		new Setting(containerEl)
			.setName("Temperature")
			.setDesc("生成随机性（0-2，越低越确定）")
			.addSlider((slider) =>
				slider
					.setLimits(0, 2, 0.1)
					.setValue(platformConfig.temperature ?? 0.7)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.platforms[currentPlatform].temperature = value;
						await this.plugin.saveSettings();
					})
			);

		// Max Tokens
		new Setting(containerEl)
			.setName("Max tokens")
			.setDesc("最大生成令牌数")
			.addSlider((slider) =>
				slider
					.setLimits(512, 8192, 512)
					.setValue(platformConfig.maxTokens || 4096)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.platforms[currentPlatform].maxTokens = value;
						await this.plugin.saveSettings();
					})
			);
	}

	displayFeatureSettings(containerEl: HTMLElement): void {
		// 笔记属性
		new Setting(containerEl)
			.setName("笔记属性设置")
			.setHeading();

		// Max Tags
		new Setting(containerEl)
			.setName("最大标签数")
			.setDesc("生成时参考的已有标签最大数量")
			.addSlider((slider) =>
				slider
					.setLimits(1, 10, 1)
					.setValue(this.plugin.settings.maxTags)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.maxTags = value;
						await this.plugin.saveSettings();
					})
			);

		// Include Folder Structure
		new Setting(containerEl)
			.setName("包含文件夹结构")
			.setDesc("将文件所在文件夹作为分类建议")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeFolderStructure)
					.onChange(async (value) => {
						this.plugin.settings.includeFolderStructure = value;
						await this.plugin.saveSettings();
					})
			);

		// Show Preview
		new Setting(containerEl)
			.setName("生成前显示预览")
			.setDesc("开启后，生成笔记属性时会先显示预览窗口；关闭选项则直接应用")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showPreview)
					.onChange(async (value) => {
						this.plugin.settings.showPreview = value;
						await this.plugin.saveSettings();
					})
			);

		// Show Editor Menu
		new Setting(containerEl)
			.setName("显示右键菜单")
			.setDesc("在文件浏览器和编辑器右键菜单中显示 AI 生成笔记属性选项")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showEditorMenu)
					.onChange(async (value) => {
						this.plugin.settings.showEditorMenu = value;
						await this.plugin.saveSettings();
						this.plugin.updateContextMenus();
					})
			);

		// 文本优化设置
		new Setting(containerEl)
			.setName("文本优化设置")
			.setHeading();

		// Show Optimize Preview
		new Setting(containerEl)
			.setName("优化前显示预览")
			.setDesc("开启后，优化文本前会先显示预览窗口；关闭选项则直接应用")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showOptimizePreview)
					.onChange(async (value) => {
						this.plugin.settings.showOptimizePreview = value;
						await this.plugin.saveSettings();
					})
			);

		// Show Optimize Menu
		new Setting(containerEl)
			.setName("显示优化菜单")
			.setDesc("在文件浏览器和编辑器右键菜单中显示 AI 优化文本选项")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showOptimizeMenu)
					.onChange(async (value) => {
						this.plugin.settings.showOptimizeMenu = value;
						await this.plugin.saveSettings();
						if (value) {
							this.plugin.addOptimizeContextMenus();
						} else {
							this.plugin.removeOptimizeContextMenus();
						}
					})
			);


	}

	/**
	 * 为本地平台（Ollama / LM Studio）构建自动拉取模型的下拉框
	 */
	private buildLocalModelDropdown(
		modelSetting: Setting,
		platformConfig: { model: string; baseUrl?: string },
		platform: LocalPlatform,
	): void {
		const currentPlatform = this.plugin.settings.activePlatform;
		const platformDefaults = PLATFORM_DEFAULTS[currentPlatform];
		const baseUrl = platformConfig.baseUrl || platformDefaults.baseUrl;
		const fetchFn = getFetchFunction(platform);

		let dropdown: DropdownComponent;

		modelSetting.addDropdown((dd) => {
			dropdown = dd;
			dropdown.addOption("__loading__", "正在获取本地模型列表...");
			dropdown.setValue("__loading__");
			dropdown.onChange(async (value) => {
				if (value && value !== "__loading__") {
					this.plugin.settings.platforms[currentPlatform].model = value;
					await this.plugin.saveSettings();
				}
			});
		});

		void this.populateLocalModels(dropdown!, fetchFn, baseUrl);
	}

	private async populateLocalModels(
		dropdown: DropdownComponent,
		fetchFn: (baseUrl: string) => Promise<string[]>,
		baseUrl: string,
	): Promise<void> {
		const currentPlatform = this.plugin.settings.activePlatform;
		const savedModel = this.plugin.settings.platforms[currentPlatform].model;

		const models = await fetchFn(baseUrl);

		const selectEl = dropdown.selectEl;
		selectEl.innerHTML = "";

		if (models.length === 0) {
			dropdown.addOption("", "未能获取模型列表，请检查服务是否运行");
			dropdown.setValue("");
			return;
		}

		for (const model of models) {
			dropdown.addOption(model, model);
		}

		if (models.includes(savedModel)) {
			dropdown.setValue(savedModel);
		} else {
			dropdown.setValue(models[0]);
			this.plugin.settings.platforms[currentPlatform].model = models[0];
		}
	}
}
