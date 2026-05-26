import { __awaiter } from "tslib";
import { requestUrl } from "obsidian";
// 平台默认配置
export const PLATFORM_DEFAULTS = {
    claude: {
        name: "Claude (Anthropic)",
        baseUrl: "https://api.anthropic.com",
        models: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5"],
        defaultModel: "claude-sonnet-4-6",
    },
    openai: {
        name: "OpenAI",
        baseUrl: "https://api.openai.com/v1",
        models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
        defaultModel: "gpt-4o",
    },
    deepseek: {
        name: "DeepSeek",
        baseUrl: "https://api.deepseek.com",
        models: ["deepseek-chat", "deepseek-coder"],
        defaultModel: "deepseek-chat",
    },
    qwen: {
        name: "通义千问 (Aliyun)",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        models: ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-coder-plus"],
        defaultModel: "qwen-plus",
    },
    zhipu: {
        name: "智谱 AI (GLM)",
        baseUrl: "https://open.bigmodel.cn/api/paas/v4",
        models: ["glm-4", "glm-4-flash", "glm-4-air", "glm-4-long"],
        defaultModel: "glm-4",
    },
    spark: {
        name: "讯飞星火",
        baseUrl: "https://spark-api-open.xf-yun.com/v1",
        models: ["lite", "pro", "pro-128k", "max", "4.0-ultra"],
        defaultModel: "pro",
    },
    ollama: {
        name: "Ollama (本地)",
        baseUrl: "http://localhost:11434/v1",
        models: ["llama3.2", "llama3.1", "llama3", "mistral", "mixtral", "gemma3", "qwen2.5", "deepseek-r1", "phi4", "codellama"],
        defaultModel: "llama3.2",
    },
};
// 基础系统提示词
function buildSystemPrompt(existingTags, existingCategories) {
    let prompt = `你是一个专业的内容分析助手。请分析用户提供的文章内容，并生成以下元数据：

1. **title**: 一个简洁、准确的标题（不超过50个字符）
2. **tags**: 3-8个相关标签，用于内容分类和检索
3. **category**: 一个主要分类，用于组织内容
4. **summary**: 一段简短的摘要（100-200字），概括文章核心内容
5. **keywords**: 5-10个关键词，用于SEO和搜索优化（不同于tags，keywords更侧重内容核心概念）

请以 JSON 格式返回结果，格式如下：
{
  "title": "生成的标题",
  "tags": ["标签1", "标签2", "标签3"],
  "category": "分类名称",
  "summary": "文章摘要...",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}

要求：
- 标签使用中文或英文，保持简洁
- 避免过于宽泛的标签（如"笔记"、"文档"）
- 摘要要准确反映文章的核心观点
- keywords 应该是文章的核心概念、技术术语、关键实体等，用于搜索发现`;
    if (existingTags.length > 0) {
        prompt += `\n\n**重要：优先使用以下已有标签**（如果内容相关）：\n${existingTags.join(", ")}`;
    }
    if (existingCategories.length > 0) {
        prompt += `\n\n**重要：优先从以下已有分类中选择**（如果内容匹配）：\n${existingCategories.join(", ")}`;
    }
    prompt += `\n\n请只返回 JSON 格式的结果，不要包含其他说明文字。`;
    return prompt;
}
// 解析 AI 响应
function parseResponse(response) {
    try {
        // 尝试提取 JSON 部分
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                title: parsed.title || "未命名",
                tags: Array.isArray(parsed.tags) ? parsed.tags : [],
                category: parsed.category || "未分类",
                summary: parsed.summary || "",
                keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
            };
        }
        throw new Error("无法解析 AI 响应");
    }
    catch (error) {
        console.error("解析 AI 响应失败:", error);
        return {
            title: "解析失败",
            tags: [],
            category: "未分类",
            summary: "",
            keywords: [],
        };
    }
}
// 解析优化响应
function parseOptimizationResponse(response) {
    try {
        // 尝试按新的格式解析（===优化后的文本=== 和 ===优化说明===）
        const textMatch = response.match(/===优化后的文本===\s*\n?([\s\S]*?)(?:\n?===优化说明===|$)/);
        const explanationMatch = response.match(/===优化说明===\s*\n?([\s\S]*?)$/);
        if (textMatch) {
            return {
                optimizedText: textMatch[1].trim(),
                explanation: explanationMatch ? explanationMatch[1].trim() : "",
            };
        }
        // 尝试提取 JSON 部分（兼容旧格式）
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                optimizedText: parsed.optimizedText || parsed.text || response,
                explanation: parsed.explanation || parsed.changes || "",
            };
        }
        // 如果没有匹配到任何格式，返回整个响应作为优化文本
        return {
            optimizedText: response.trim(),
            explanation: "",
        };
    }
    catch (_a) {
        // 解析失败，返回原始响应
        return {
            optimizedText: response.trim(),
            explanation: "",
        };
    }
}
// 构建优化提示词
function buildOptimizePrompt(isPartial) {
    if (isPartial) {
        return `你是一位专业的写作编辑。请优化用户提供的文本片段，改进其表达和叙述结构。

要求：
1. 保持原文的核心意思不变
2. 改进语言表达，使其更加流畅、准确
3. 优化句子结构，增强可读性
4. 修正语法错误和不恰当的用词
5. 保持文本片段的原有风格

请按以下格式返回结果：

===优化后的文本===
（在这里输出优化后的文本内容，保持Markdown格式，不要包含JSON格式或代码块）

===优化说明===
1. 改进点一的说明
2. 改进点二的说明
3. 改进点三的说明
（按条目列出主要改进点，纯文本格式，不要使用Markdown加粗、斜体等格式）`;
    }
    else {
        return `你是一位专业的写作编辑。请优化用户提供的文章，改进其整体表达和叙述结构。

要求：
1. 保持原文的核心意思和主题不变
2. 改进语言表达，使其更加流畅、准确、专业
3. 优化文章结构，增强逻辑性和可读性
4. 修正语法错误、错别字和不恰当的用词
5. 保持文章的原有风格和语气
6. 可以适当调整段落结构，使文章更有层次感

请按以下格式返回结果：

===优化后的文本===
（在这里输出优化后的文本内容，保持Markdown格式，不要包含JSON格式或代码块）

===优化说明===
1. 改进点一的说明
2. 改进点二的说明
3. 改进点三的说明
（按条目列出主要改进点，如结构调整、语言润色等，纯文本格式，不要使用Markdown加粗、斜体等格式）`;
    }
}
// Claude Provider
export class ClaudeProvider {
    constructor(config) {
        this.config = config;
    }
    analyze(content, existingTags = [], existingCategories = []) {
        return __awaiter(this, void 0, void 0, function* () {
            const systemPrompt = buildSystemPrompt(existingTags, existingCategories);
            const response = yield requestUrl({
                url: `${this.config.baseUrl || PLATFORM_DEFAULTS.claude.baseUrl}/v1/messages`,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.config.apiKey,
                    "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                    model: this.config.model,
                    max_tokens: this.config.maxTokens || 4096,
                    system: systemPrompt,
                    messages: [
                        {
                            role: "user",
                            content: `请分析以下文章内容，生成合适的元数据：\n\n${content}`,
                        },
                    ],
                }),
            });
            if (response.status !== 200) {
                throw new Error(`Claude API 请求失败: ${response.status} ${response.text}`);
            }
            const data = response.json;
            const textContent = data.content
                .filter((block) => block.type === "text")
                .map((block) => block.text)
                .join("");
            return parseResponse(textContent);
        });
    }
    optimize(content, isPartial = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const systemPrompt = buildOptimizePrompt(isPartial);
            const response = yield requestUrl({
                url: `${this.config.baseUrl || PLATFORM_DEFAULTS.claude.baseUrl}/v1/messages`,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.config.apiKey,
                    "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                    model: this.config.model,
                    max_tokens: this.config.maxTokens || 4096,
                    system: systemPrompt,
                    messages: [
                        {
                            role: "user",
                            content: content,
                        },
                    ],
                }),
            });
            if (response.status !== 200) {
                throw new Error(`Claude API 请求失败: ${response.status} ${response.text}`);
            }
            const data = response.json;
            const textContent = data.content
                .filter((block) => block.type === "text")
                .map((block) => block.text)
                .join("");
            return parseOptimizationResponse(textContent);
        });
    }
}
// OpenAI 兼容格式 Provider（适用于 OpenAI、DeepSeek、千问、智谱、星火、Ollama 等）
export class OpenAICompatibleProvider {
    constructor(platform, config) {
        this.platform = platform;
        this.config = config;
    }
    analyze(content, existingTags = [], existingCategories = []) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const systemPrompt = buildSystemPrompt(existingTags, existingCategories);
            const baseUrl = this.config.baseUrl || PLATFORM_DEFAULTS[this.platform].baseUrl;
            const response = yield requestUrl({
                url: `${baseUrl}/chat/completions`,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `请分析以下文章内容，生成合适的元数据：\n\n${content}` },
                    ],
                    max_tokens: this.config.maxTokens || 4096,
                    temperature: (_a = this.config.temperature) !== null && _a !== void 0 ? _a : 0.7,
                }),
            });
            if (response.status !== 200) {
                throw new Error(`${PLATFORM_DEFAULTS[this.platform].name} API 请求失败: ${response.status} ${response.text}`);
            }
            const data = response.json;
            const textContent = ((_d = (_c = (_b = data.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) || "";
            return parseResponse(textContent);
        });
    }
    optimize(content, isPartial = false) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const systemPrompt = buildOptimizePrompt(isPartial);
            const baseUrl = this.config.baseUrl || PLATFORM_DEFAULTS[this.platform].baseUrl;
            const response = yield requestUrl({
                url: `${baseUrl}/chat/completions`,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: content },
                    ],
                    max_tokens: this.config.maxTokens || 4096,
                    temperature: (_a = this.config.temperature) !== null && _a !== void 0 ? _a : 0.7,
                }),
            });
            if (response.status !== 200) {
                throw new Error(`${PLATFORM_DEFAULTS[this.platform].name} API 请求失败: ${response.status} ${response.text}`);
            }
            const data = response.json;
            const textContent = ((_d = (_c = (_b = data.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) || "";
            return parseOptimizationResponse(textContent);
        });
    }
}
// Provider 工厂函数
export function createAIProvider(platform, config) {
    switch (platform) {
        case "claude":
            return new ClaudeProvider(config);
        case "openai":
        case "deepseek":
        case "qwen":
        case "zhipu":
        case "spark":
        case "ollama":
            return new OpenAICompatibleProvider(platform, config);
        default:
            throw new Error(`不支持的 AI 平台: ${String(platform)}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWktcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhaS1wcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQWlDdEMsU0FBUztBQUNULE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFrRztJQUMvSCxNQUFNLEVBQUU7UUFDUCxJQUFJLEVBQUUsb0JBQW9CO1FBQzFCLE9BQU8sRUFBRSwyQkFBMkI7UUFDcEMsTUFBTSxFQUFFLENBQUMsbUJBQW1CLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLENBQUM7UUFDcEUsWUFBWSxFQUFFLG1CQUFtQjtLQUNqQztJQUNELE1BQU0sRUFBRTtRQUNQLElBQUksRUFBRSxRQUFRO1FBQ2QsT0FBTyxFQUFFLDJCQUEyQjtRQUNwQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxlQUFlLENBQUM7UUFDakUsWUFBWSxFQUFFLFFBQVE7S0FDdEI7SUFDRCxRQUFRLEVBQUU7UUFDVCxJQUFJLEVBQUUsVUFBVTtRQUNoQixPQUFPLEVBQUUsMEJBQTBCO1FBQ25DLE1BQU0sRUFBRSxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQztRQUMzQyxZQUFZLEVBQUUsZUFBZTtLQUM3QjtJQUNELElBQUksRUFBRTtRQUNMLElBQUksRUFBRSxlQUFlO1FBQ3JCLE9BQU8sRUFBRSxtREFBbUQ7UUFDNUQsTUFBTSxFQUFFLENBQUMsWUFBWSxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsaUJBQWlCLENBQUM7UUFDbEUsWUFBWSxFQUFFLFdBQVc7S0FDekI7SUFDRCxLQUFLLEVBQUU7UUFDTixJQUFJLEVBQUUsYUFBYTtRQUNuQixPQUFPLEVBQUUsc0NBQXNDO1FBQy9DLE1BQU0sRUFBRSxDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLFlBQVksQ0FBQztRQUMzRCxZQUFZLEVBQUUsT0FBTztL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TSxVQUFVLGdCQUFnQixDQUFDLFFBQW9CLEVBQUUsTUFBd0I7SUFDOUUsUUFBUSxRQUFRLEVBQUU7UUFDakIsS0FBSyxRQUFRO1lBQ1osT0FBTyxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuQyxLQUFLLFFBQVEsQ0FBQztRQUNkLEtBQUssVUFBVSxDQUFDO1FBQ2hCLEtBQUssTUFBTSxDQUFDO1FBQ1osS0FBSyxPQUFPLENBQUM7UUFDYixLQUFLLE9BQU8sQ0FBQztRQUNiLEtBQUssUUFBUTtZQUNaLE9BQU8sSUFBSSx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdkQ7WUFDQyxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNwRDtBQUNGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyByZXF1ZXN0VXJsIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHlzaXNSZXN1bHQge1xuXHR0aXRsZTogc3RyaW5nO1xuXHR0YWdzOiBzdHJpbmdbXTtcblx0Y2F0ZWdvcnk6IHN0cmluZztcblx0c3VtbWFyeTogc3RyaW5nO1xuXHRkYXRlPzogc3RyaW5nOyAvLyDlj6/pgInvvIxJU08g5qC85byP5pel5pyfXG5cdGtleXdvcmRzPzogc3RyaW5nW107IC8vIEFJIOeUn+aIkOeahOWFs+mUruivjVxuXHRzaGFyZT86IGJvb2xlYW47IC8vIOaYr+WQpuWFgeiuuOWIhuS6q1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9wdGltaXphdGlvblJlc3VsdCB7XG5cdG9wdGltaXplZFRleHQ6IHN0cmluZztcblx0ZXhwbGFuYXRpb24/OiBzdHJpbmc7IC8vIOS8mOWMluivtOaYjlxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFJUHJvdmlkZXIge1xuXHRhbmFseXplKGNvbnRlbnQ6IHN0cmluZywgZXhpc3RpbmdUYWdzOiBzdHJpbmdbXSwgZXhpc3RpbmdDYXRlZ29yaWVzOiBzdHJpbmdbXSk6IFByb21pc2U8QW5hbHlzaXNSZXN1bHQ+O1xuXHRvcHRpbWl6ZShjb250ZW50OiBzdHJpbmcsIGlzUGFydGlhbDogYm9vbGVhbik6IFByb21pc2U8T3B0aW1pemF0aW9uUmVzdWx0Pjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBSVByb3ZpZGVyQ29uZmlnIHtcblx0YXBpS2V5OiBzdHJpbmc7XG5cdG1vZGVsOiBzdHJpbmc7XG5cdGJhc2VVcmw/OiBzdHJpbmc7XG5cdHRlbXBlcmF0dXJlPzogbnVtYmVyO1xuXHRtYXhUb2tlbnM/OiBudW1iZXI7XG59XG5cbi8vIOaUr+aMgeeahCBBSSDlubPlj7DnsbvlnotcbmV4cG9ydCB0eXBlIEFJUGxhdGZvcm0gPSBcImNsYXVkZVwiIHwgXCJvcGVuYWlcIiB8IFwiZGVlcHNlZWtcIiB8IFwicXdlblwiIHwgXCJ6aGlwdVwiIHwgXCJzcGFya1wiIHwgXCJvbGxhbWFcIjtcblxuLy8g5bmz5Y+w6buY6K6k6YWN572uXG5leHBvcnQgY29uc3QgUExBVEZPUk1fREVGQVVMVFM6IFJlY29yZDxBSVBsYXRmb3JtLCB7IG5hbWU6IHN0cmluZzsgYmFzZVVybDogc3RyaW5nOyBtb2RlbHM6IHN0cmluZ1tdOyBkZWZhdWx0TW9kZWw6IHN0cmluZyB9PiA9IHtcblx0Y2xhdWRlOiB7XG5cdFx0bmFtZTogXCJDbGF1ZGUgKEFudGhyb3BpYylcIixcblx0XHRiYXNlVXJsOiBcImh0dHBzOi8vYXBpLmFudGhyb3BpYy5jb21cIixcblx0XHRtb2RlbHM6IFtcImNsYXVkZS1zb25uZXQtNC02XCIsIFwiY2xhdWRlLW9wdXMtNC02XCIsIFwiY2xhdWRlLWhhaWt1LTQtNVwiXSxcblx0XHRkZWZhdWx0TW9kZWw6IFwiY2xhdWRlLXNvbm5ldC00LTZcIixcblx0fSxcblx0b3BlbmFpOiB7XG5cdFx0bmFtZTogXCJPcGVuQUlcIixcblx0XHRiYXNlVXJsOiBcImh0dHBzOi8vYXBpLm9wZW5haS5jb20vdjFcIixcblx0XHRtb2RlbHM6IFtcImdwdC00b1wiLCBcImdwdC00by1taW5pXCIsIFwiZ3B0LTQtdHVyYm9cIiwgXCJncHQtMy41LXR1cmJvXCJdLFxuXHRcdGRlZmF1bHRNb2RlbDogXCJncHQtNG9cIixcblx0fSxcblx0ZGVlcHNlZWs6IHtcblx0XHRuYW1lOiBcIkRlZXBTZWVrXCIsXG5cdFx0YmFzZVVybDogXCJodHRwczovL2FwaS5kZWVwc2Vlay5jb21cIixcblx0XHRtb2RlbHM6IFtcImRlZXBzZWVrLWNoYXRcIiwgXCJkZWVwc2Vlay1jb2RlclwiXSxcblx0XHRkZWZhdWx0TW9kZWw6IFwiZGVlcHNlZWstY2hhdFwiLFxuXHR9LFxuXHRxd2VuOiB7XG5cdFx0bmFtZTogXCLpgJrkuYnljYPpl64gKEFsaXl1bilcIixcblx0XHRiYXNlVXJsOiBcImh0dHBzOi8vZGFzaHNjb3BlLmFsaXl1bmNzLmNvbS9jb21wYXRpYmxlLW1vZGUvdjFcIixcblx0XHRtb2RlbHM6IFtcInF3ZW4tdHVyYm9cIiwgXCJxd2VuLXBsdXNcIiwgXCJxd2VuLW1heFwiLCBcInF3ZW4tY29kZXItcGx1c1wiXSxcblx0XHRkZWZhdWx0TW9kZWw6IFwicXdlbi1wbHVzXCIsXG5cdH0sXG5cdHpoaXB1OiB7XG5cdFx0bmFtZTogXCLmmbrosLEgQUkgKEdMTSlcIixcblx0XHRiYXNlVXJsOiBcImh0dHBzOi8vb3Blbi5iaWdtb2RlbC5jbi9hcGkvcGFhcy92NFwiLFxuXHRcdG1vZGVsczogW1wiZ2xtLTRcIiwgXCJnbG0tNC1mbGFzaFwiLCBcImdsbS00LWFpclwiLCBcImdsbS00LWxvbmdcIl0sXG5cdFx0ZGVmYXVsdE1vZGVsOiBcImdsbS00XCIsXG5cdH0sXG5cdHNwYXJrOiB7XG5cdFx0bmFtZTogXCLorq/po57mmJ/ngatcIixcblx0XHRiYXNlVXJsOiBcImh0dHBzOi8vc3BhcmstYXBpLW9wZW4ueGYteXVuLmNvbS92MVwiLFxuXHRcdG1vZGVsczogW1wibGl0ZVwiLCBcInByb1wiLCBcInByby0xMjhrXCIsIFwibWF4XCIsIFwiNC4wLXVsdHJhXCJdLFxuXHRcdGRlZmF1bHRNb2RlbDogXCJwcm9cIixcblx0fSxcblx0b2xsYW1hOiB7XG5cdFx0bmFtZTogXCJPbGxhbWEgKOacrOWcsClcIixcblx0XHRiYXNlVXJsOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MTE0MzQvdjFcIixcblx0XHRtb2RlbHM6IFtcImxsYW1hMy4yXCIsIFwibGxhbWEzLjFcIiwgXCJsbGFtYTNcIiwgXCJtaXN0cmFsXCIsIFwibWl4dHJhbFwiLCBcImdlbW1hM1wiLCBcInF3ZW4yLjVcIiwgXCJkZWVwc2Vlay1yMVwiLCBcInBoaTRcIiwgXCJjb2RlbGxhbWFcIl0sXG5cdFx0ZGVmYXVsdE1vZGVsOiBcImxsYW1hMy4yXCIsXG5cdH0sXG59O1xuXG4vLyDln7rnoYDns7vnu5/mj5DnpLror41cbmZ1bmN0aW9uIGJ1aWxkU3lzdGVtUHJvbXB0KGV4aXN0aW5nVGFnczogc3RyaW5nW10sIGV4aXN0aW5nQ2F0ZWdvcmllczogc3RyaW5nW10pOiBzdHJpbmcge1xuXHRsZXQgcHJvbXB0ID0gYOS9oOaYr+S4gOS4quS4k+S4mueahOWGheWuueWIhuaekOWKqeaJi+OAguivt+WIhuaekOeUqOaIt+aPkOS+m+eahOaWh+eroOWGheWuue+8jOW5tueUn+aIkOS7peS4i+WFg+aVsOaNru+8mlxuXG4xLiAqKnRpdGxlKio6IOS4gOS4queugOa0geOAgeWHhuehrueahOagh+mimO+8iOS4jei2hei/hzUw5Liq5a2X56ym77yJXG4yLiAqKnRhZ3MqKjogMy045Liq55u45YWz5qCH562+77yM55So5LqO5YaF5a655YiG57G75ZKM5qOA57SiXG4zLiAqKmNhdGVnb3J5Kio6IOS4gOS4quS4u+imgeWIhuexu++8jOeUqOS6jue7hOe7h+WGheWuuVxuNC4gKipzdW1tYXJ5Kio6IOS4gOauteeugOefreeahOaRmOimge+8iDEwMC0yMDDlrZfvvInvvIzmpoLmi6zmlofnq6DmoLjlv4PlhoXlrrlcbjUuICoqa2V5d29yZHMqKjogNS0xMOS4quWFs+mUruivje+8jOeUqOS6jlNFT+WSjOaQnOe0ouS8mOWMlu+8iOS4jeWQjOS6jnRhZ3PvvIxrZXl3b3Jkc+abtOS+p+mHjeWGheWuueaguOW/g+amguW/te+8iVxuXG7or7fku6UgSlNPTiDmoLzlvI/ov5Tlm57nu5PmnpzvvIzmoLzlvI/lpoLkuIvvvJpcbntcbiAgXCJ0aXRsZVwiOiBcIueUn+aIkOeahOagh+mimFwiLFxuICBcInRhZ3NcIjogW1wi5qCH562+MVwiLCBcIuagh+etvjJcIiwgXCLmoIfnrb4zXCJdLFxuICBcImNhdGVnb3J5XCI6IFwi5YiG57G75ZCN56ewXCIsXG4gIFwic3VtbWFyeVwiOiBcIuaWh+eroOaRmOimgS4uLlwiLFxuICBcImtleXdvcmRzXCI6IFtcIuWFs+mUruivjTFcIiwgXCLlhbPplK7or40yXCIsIFwi5YWz6ZSu6K+NM1wiXVxufVxuXG7opoHmsYLvvJpcbi0g5qCH562+5L2/55So5Lit5paH5oiW6Iux5paH77yM5L+d5oyB566A5rSBXG4tIOmBv+WFjei/h+S6juWuveazm+eahOagh+etvu+8iOWmglwi56yU6K6wXCLjgIFcIuaWh+aho1wi77yJXG4tIOaRmOimgeimgeWHhuehruWPjeaYoOaWh+eroOeahOaguOW/g+ingueCuVxuLSBrZXl3b3JkcyDlupTor6XmmK/mlofnq6DnmoTmoLjlv4PmpoLlv7XjgIHmioDmnK/mnK/or63jgIHlhbPplK7lrp7kvZPnrYnvvIznlKjkuo7mkJzntKLlj5HnjrBgO1xuXG5cdGlmIChleGlzdGluZ1RhZ3MubGVuZ3RoID4gMCkge1xuXHRcdHByb21wdCArPSBgXFxuXFxuKirph43opoHvvJrkvJjlhYjkvb/nlKjku6XkuIvlt7LmnInmoIfnrb4qKu+8iOWmguaenOWGheWuueebuOWFs++8ie+8mlxcbiR7ZXhpc3RpbmdUYWdzLmpvaW4oXCIsIFwiKX1gO1xuXHR9XG5cblx0aWYgKGV4aXN0aW5nQ2F0ZWdvcmllcy5sZW5ndGggPiAwKSB7XG5cdFx0cHJvbXB0ICs9IGBcXG5cXG4qKumHjeimge+8muS8mOWFiOS7juS7peS4i+W3suacieWIhuexu+S4remAieaLqSoq77yI5aaC5p6c5YaF5a655Yy56YWN77yJ77yaXFxuJHtleGlzdGluZ0NhdGVnb3JpZXMuam9pbihcIiwgXCIpfWA7XG5cdH1cblxuXHRwcm9tcHQgKz0gYFxcblxcbuivt+WPqui/lOWbniBKU09OIOagvOW8j+eahOe7k+aenO+8jOS4jeimgeWMheWQq+WFtuS7luivtOaYjuaWh+Wtl+OAgmA7XG5cblx0cmV0dXJuIHByb21wdDtcbn1cblxuLy8g6Kej5p6QIEFJIOWTjeW6lFxuZnVuY3Rpb24gcGFyc2VSZXNwb25zZShyZXNwb25zZTogc3RyaW5nKTogQW5hbHlzaXNSZXN1bHQge1xuXHR0cnkge1xuXHRcdC8vIOWwneivleaPkOWPliBKU09OIOmDqOWIhlxuXHRcdGNvbnN0IGpzb25NYXRjaCA9IHJlc3BvbnNlLm1hdGNoKC9cXHtbXFxzXFxTXSpcXH0vKTtcblx0XHRpZiAoanNvbk1hdGNoKSB7XG5cdFx0XHRjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKGpzb25NYXRjaFswXSk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR0aXRsZTogcGFyc2VkLnRpdGxlIHx8IFwi5pyq5ZG95ZCNXCIsXG5cdFx0XHRcdHRhZ3M6IEFycmF5LmlzQXJyYXkocGFyc2VkLnRhZ3MpID8gcGFyc2VkLnRhZ3MgOiBbXSxcblx0XHRcdFx0Y2F0ZWdvcnk6IHBhcnNlZC5jYXRlZ29yeSB8fCBcIuacquWIhuexu1wiLFxuXHRcdFx0XHRzdW1tYXJ5OiBwYXJzZWQuc3VtbWFyeSB8fCBcIlwiLFxuXHRcdFx0XHRrZXl3b3JkczogQXJyYXkuaXNBcnJheShwYXJzZWQua2V5d29yZHMpID8gcGFyc2VkLmtleXdvcmRzIDogW10sXG5cdFx0XHR9O1xuXHRcdH1cblx0XHR0aHJvdyBuZXcgRXJyb3IoXCLml6Dms5Xop6PmnpAgQUkg5ZON5bqUXCIpO1xuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdGNvbnNvbGUuZXJyb3IoXCLop6PmnpAgQUkg5ZON5bqU5aSx6LSlOlwiLCBlcnJvcik7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHRpdGxlOiBcIuino+aekOWksei0pVwiLFxuXHRcdFx0dGFnczogW10sXG5cdFx0XHRjYXRlZ29yeTogXCLmnKrliIbnsbtcIixcblx0XHRcdHN1bW1hcnk6IFwiXCIsXG5cdFx0XHRrZXl3b3JkczogW10sXG5cdFx0fTtcblx0fVxufVxuXG4vLyDop6PmnpDkvJjljJblk43lupRcbmZ1bmN0aW9uIHBhcnNlT3B0aW1pemF0aW9uUmVzcG9uc2UocmVzcG9uc2U6IHN0cmluZyk6IE9wdGltaXphdGlvblJlc3VsdCB7XG5cdHRyeSB7XG5cdFx0Ly8g5bCd6K+V5oyJ5paw55qE5qC85byP6Kej5p6Q77yIPT095LyY5YyW5ZCO55qE5paH5pysPT09IOWSjCA9PT3kvJjljJbor7TmmI49PT3vvIlcblx0XHRjb25zdCB0ZXh0TWF0Y2ggPSByZXNwb25zZS5tYXRjaCgvPT095LyY5YyW5ZCO55qE5paH5pysPT09XFxzKlxcbj8oW1xcc1xcU10qPykoPzpcXG4/PT095LyY5YyW6K+05piOPT09fCQpLyk7XG5cdFx0Y29uc3QgZXhwbGFuYXRpb25NYXRjaCA9IHJlc3BvbnNlLm1hdGNoKC89PT3kvJjljJbor7TmmI49PT1cXHMqXFxuPyhbXFxzXFxTXSo/KSQvKTtcblxuXHRcdGlmICh0ZXh0TWF0Y2gpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdG9wdGltaXplZFRleHQ6IHRleHRNYXRjaFsxXS50cmltKCksXG5cdFx0XHRcdGV4cGxhbmF0aW9uOiBleHBsYW5hdGlvbk1hdGNoID8gZXhwbGFuYXRpb25NYXRjaFsxXS50cmltKCkgOiBcIlwiLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvLyDlsJ3or5Xmj5Dlj5YgSlNPTiDpg6jliIbvvIjlhbzlrrnml6fmoLzlvI/vvIlcblx0XHRjb25zdCBqc29uTWF0Y2ggPSByZXNwb25zZS5tYXRjaCgvXFx7W1xcc1xcU10qXFx9Lyk7XG5cdFx0aWYgKGpzb25NYXRjaCkge1xuXHRcdFx0Y29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShqc29uTWF0Y2hbMF0pO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0b3B0aW1pemVkVGV4dDogcGFyc2VkLm9wdGltaXplZFRleHQgfHwgcGFyc2VkLnRleHQgfHwgcmVzcG9uc2UsXG5cdFx0XHRcdGV4cGxhbmF0aW9uOiBwYXJzZWQuZXhwbGFuYXRpb24gfHwgcGFyc2VkLmNoYW5nZXMgfHwgXCJcIixcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Ly8g5aaC5p6c5rKh5pyJ5Yy56YWN5Yiw5Lu75L2V5qC85byP77yM6L+U5Zue5pW05Liq5ZON5bqU5L2c5Li65LyY5YyW5paH5pysXG5cdFx0cmV0dXJuIHtcblx0XHRcdG9wdGltaXplZFRleHQ6IHJlc3BvbnNlLnRyaW0oKSxcblx0XHRcdGV4cGxhbmF0aW9uOiBcIlwiLFxuXHRcdH07XG5cdH0gY2F0Y2gge1xuXHRcdC8vIOino+aekOWksei0pe+8jOi/lOWbnuWOn+Wni+WTjeW6lFxuXHRcdHJldHVybiB7XG5cdFx0XHRvcHRpbWl6ZWRUZXh0OiByZXNwb25zZS50cmltKCksXG5cdFx0XHRleHBsYW5hdGlvbjogXCJcIixcblx0XHR9O1xuXHR9XG59XG5cbi8vIOaehOW7uuS8mOWMluaPkOekuuivjVxuZnVuY3Rpb24gYnVpbGRPcHRpbWl6ZVByb21wdChpc1BhcnRpYWw6IGJvb2xlYW4pOiBzdHJpbmcge1xuXHRpZiAoaXNQYXJ0aWFsKSB7XG5cdFx0cmV0dXJuIGDkvaDmmK/kuIDkvY3kuJPkuJrnmoTlhpnkvZznvJbovpHjgILor7fkvJjljJbnlKjmiLfmj5DkvpvnmoTmlofmnKzniYfmrrXvvIzmlLnov5vlhbbooajovr7lkozlj5nov7Dnu5PmnoTjgIJcblxu6KaB5rGC77yaXG4xLiDkv53mjIHljp/mlofnmoTmoLjlv4PmhI/mgJ3kuI3lj5hcbjIuIOaUuei/m+ivreiogOihqOi+vu+8jOS9v+WFtuabtOWKoOa1geeVheOAgeWHhuehrlxuMy4g5LyY5YyW5Y+l5a2Q57uT5p6E77yM5aKe5by65Y+v6K+75oCnXG40LiDkv67mraPor63ms5XplJnor6/lkozkuI3mgbDlvZPnmoTnlKjor41cbjUuIOS/neaMgeaWh+acrOeJh+auteeahOWOn+aciemjjuagvFxuXG7or7fmjInku6XkuIvmoLzlvI/ov5Tlm57nu5PmnpzvvJpcblxuPT095LyY5YyW5ZCO55qE5paH5pysPT09XG7vvIjlnKjov5nph4zovpPlh7rkvJjljJblkI7nmoTmlofmnKzlhoXlrrnvvIzkv53mjIFNYXJrZG93buagvOW8j++8jOS4jeimgeWMheWQq0pTT07moLzlvI/miJbku6PnoIHlnZfvvIlcblxuPT095LyY5YyW6K+05piOPT09XG4xLiDmlLnov5vngrnkuIDnmoTor7TmmI5cbjIuIOaUuei/m+eCueS6jOeahOivtOaYjlxuMy4g5pS56L+b54K55LiJ55qE6K+05piOXG7vvIjmjInmnaHnm67liJflh7rkuLvopoHmlLnov5vngrnvvIznuq/mlofmnKzmoLzlvI/vvIzkuI3opoHkvb/nlKhNYXJrZG93buWKoOeyl+OAgeaWnOS9k+etieagvOW8j++8iWA7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIGDkvaDmmK/kuIDkvY3kuJPkuJrnmoTlhpnkvZznvJbovpHjgILor7fkvJjljJbnlKjmiLfmj5DkvpvnmoTmlofnq6DvvIzmlLnov5vlhbbmlbTkvZPooajovr7lkozlj5nov7Dnu5PmnoTjgIJcblxu6KaB5rGC77yaXG4xLiDkv53mjIHljp/mlofnmoTmoLjlv4PmhI/mgJ3lkozkuLvpopjkuI3lj5hcbjIuIOaUuei/m+ivreiogOihqOi+vu+8jOS9v+WFtuabtOWKoOa1geeVheOAgeWHhuehruOAgeS4k+S4mlxuMy4g5LyY5YyW5paH56ug57uT5p6E77yM5aKe5by66YC76L6R5oCn5ZKM5Y+v6K+75oCnXG40LiDkv67mraPor63ms5XplJnor6/jgIHplJnliKvlrZflkozkuI3mgbDlvZPnmoTnlKjor41cbjUuIOS/neaMgeaWh+eroOeahOWOn+aciemjjuagvOWSjOivreawlFxuNi4g5Y+v5Lul6YCC5b2T6LCD5pW05q616JC957uT5p6E77yM5L2/5paH56ug5pu05pyJ5bGC5qyh5oSfXG5cbuivt+aMieS7peS4i+agvOW8j+i/lOWbnue7k+aenO+8mlxuXG49PT3kvJjljJblkI7nmoTmlofmnKw9PT1cbu+8iOWcqOi/memHjOi+k+WHuuS8mOWMluWQjueahOaWh+acrOWGheWuue+8jOS/neaMgU1hcmtkb3du5qC85byP77yM5LiN6KaB5YyF5ZCrSlNPTuagvOW8j+aIluS7o+eggeWdl++8iVxuXG49PT3kvJjljJbor7TmmI49PT1cbjEuIOaUuei/m+eCueS4gOeahOivtOaYjlxuMi4g5pS56L+b54K55LqM55qE6K+05piOXG4zLiDmlLnov5vngrnkuInnmoTor7TmmI5cbu+8iOaMieadoeebruWIl+WHuuS4u+imgeaUuei/m+eCue+8jOWmgue7k+aehOiwg+aVtOOAgeivreiogOa2puiJsuetie+8jOe6r+aWh+acrOagvOW8j++8jOS4jeimgeS9v+eUqE1hcmtkb3du5Yqg57KX44CB5pac5L2T562J5qC85byP77yJYDtcblx0fVxufVxuXG4vLyBDbGF1ZGUgUHJvdmlkZXJcbmV4cG9ydCBjbGFzcyBDbGF1ZGVQcm92aWRlciBpbXBsZW1lbnRzIEFJUHJvdmlkZXIge1xuXHRwcml2YXRlIGNvbmZpZzogQUlQcm92aWRlckNvbmZpZztcblxuXHRjb25zdHJ1Y3Rvcihjb25maWc6IEFJUHJvdmlkZXJDb25maWcpIHtcblx0XHR0aGlzLmNvbmZpZyA9IGNvbmZpZztcblx0fVxuXG5cdGFzeW5jIGFuYWx5emUoY29udGVudDogc3RyaW5nLCBleGlzdGluZ1RhZ3M6IHN0cmluZ1tdID0gW10sIGV4aXN0aW5nQ2F0ZWdvcmllczogc3RyaW5nW10gPSBbXSk6IFByb21pc2U8QW5hbHlzaXNSZXN1bHQ+IHtcblx0XHRjb25zdCBzeXN0ZW1Qcm9tcHQgPSBidWlsZFN5c3RlbVByb21wdChleGlzdGluZ1RhZ3MsIGV4aXN0aW5nQ2F0ZWdvcmllcyk7XG5cblx0XHRjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuXHRcdFx0dXJsOiBgJHt0aGlzLmNvbmZpZy5iYXNlVXJsIHx8IFBMQVRGT1JNX0RFRkFVTFRTLmNsYXVkZS5iYXNlVXJsfS92MS9tZXNzYWdlc2AsXG5cdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxuXHRcdFx0aGVhZGVyczoge1xuXHRcdFx0XHRcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcblx0XHRcdFx0XCJ4LWFwaS1rZXlcIjogdGhpcy5jb25maWcuYXBpS2V5LFxuXHRcdFx0XHRcImFudGhyb3BpYy12ZXJzaW9uXCI6IFwiMjAyMy0wNi0wMVwiLFxuXHRcdFx0fSxcblx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcblx0XHRcdFx0bW9kZWw6IHRoaXMuY29uZmlnLm1vZGVsLFxuXHRcdFx0XHRtYXhfdG9rZW5zOiB0aGlzLmNvbmZpZy5tYXhUb2tlbnMgfHwgNDA5Nixcblx0XHRcdFx0c3lzdGVtOiBzeXN0ZW1Qcm9tcHQsXG5cdFx0XHRcdG1lc3NhZ2VzOiBbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0cm9sZTogXCJ1c2VyXCIsXG5cdFx0XHRcdFx0XHRjb250ZW50OiBg6K+35YiG5p6Q5Lul5LiL5paH56ug5YaF5a6577yM55Sf5oiQ5ZCI6YCC55qE5YWD5pWw5o2u77yaXFxuXFxuJHtjb250ZW50fWAsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XSxcblx0XHRcdH0pLFxuXHRcdH0pO1xuXG5cdFx0aWYgKHJlc3BvbnNlLnN0YXR1cyAhPT0gMjAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYENsYXVkZSBBUEkg6K+35rGC5aSx6LSlOiAke3Jlc3BvbnNlLnN0YXR1c30gJHtyZXNwb25zZS50ZXh0fWApO1xuXHRcdH1cblxuXHRcdGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuXHRcdGNvbnN0IHRleHRDb250ZW50ID0gZGF0YS5jb250ZW50XG5cdFx0XHQuZmlsdGVyKChibG9jazogeyB0eXBlOiBzdHJpbmcgfSkgPT4gYmxvY2sudHlwZSA9PT0gXCJ0ZXh0XCIpXG5cdFx0XHQubWFwKChibG9jazogeyB0ZXh0OiBzdHJpbmcgfSkgPT4gYmxvY2sudGV4dClcblx0XHRcdC5qb2luKFwiXCIpO1xuXG5cdFx0cmV0dXJuIHBhcnNlUmVzcG9uc2UodGV4dENvbnRlbnQpO1xuXHR9XG5cblx0YXN5bmMgb3B0aW1pemUoY29udGVudDogc3RyaW5nLCBpc1BhcnRpYWw6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8T3B0aW1pemF0aW9uUmVzdWx0PiB7XG5cdFx0Y29uc3Qgc3lzdGVtUHJvbXB0ID0gYnVpbGRPcHRpbWl6ZVByb21wdChpc1BhcnRpYWwpO1xuXG5cdFx0Y29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcblx0XHRcdHVybDogYCR7dGhpcy5jb25maWcuYmFzZVVybCB8fCBQTEFURk9STV9ERUZBVUxUUy5jbGF1ZGUuYmFzZVVybH0vdjEvbWVzc2FnZXNgLFxuXHRcdFx0bWV0aG9kOiBcIlBPU1RcIixcblx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0XCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG5cdFx0XHRcdFwieC1hcGkta2V5XCI6IHRoaXMuY29uZmlnLmFwaUtleSxcblx0XHRcdFx0XCJhbnRocm9waWMtdmVyc2lvblwiOiBcIjIwMjMtMDYtMDFcIixcblx0XHRcdH0sXG5cdFx0XHRib2R5OiBKU09OLnN0cmluZ2lmeSh7XG5cdFx0XHRcdG1vZGVsOiB0aGlzLmNvbmZpZy5tb2RlbCxcblx0XHRcdFx0bWF4X3Rva2VuczogdGhpcy5jb25maWcubWF4VG9rZW5zIHx8IDQwOTYsXG5cdFx0XHRcdHN5c3RlbTogc3lzdGVtUHJvbXB0LFxuXHRcdFx0XHRtZXNzYWdlczogW1xuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHJvbGU6IFwidXNlclwiLFxuXHRcdFx0XHRcdFx0Y29udGVudDogY29udGVudCxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRdLFxuXHRcdFx0fSksXG5cdFx0fSk7XG5cblx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzICE9PSAyMDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihgQ2xhdWRlIEFQSSDor7fmsYLlpLHotKU6ICR7cmVzcG9uc2Uuc3RhdHVzfSAke3Jlc3BvbnNlLnRleHR9YCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG5cdFx0Y29uc3QgdGV4dENvbnRlbnQgPSBkYXRhLmNvbnRlbnRcblx0XHRcdC5maWx0ZXIoKGJsb2NrOiB7IHR5cGU6IHN0cmluZyB9KSA9PiBibG9jay50eXBlID09PSBcInRleHRcIilcblx0XHRcdC5tYXAoKGJsb2NrOiB7IHRleHQ6IHN0cmluZyB9KSA9PiBibG9jay50ZXh0KVxuXHRcdFx0LmpvaW4oXCJcIik7XG5cblx0XHRyZXR1cm4gcGFyc2VPcHRpbWl6YXRpb25SZXNwb25zZSh0ZXh0Q29udGVudCk7XG5cdH1cbn1cblxuLy8gT3BlbkFJIOWFvOWuueagvOW8jyBQcm92aWRlcu+8iOmAgueUqOS6jiBPcGVuQUnjgIFEZWVwU2Vla+OAgeWNg+mXruOAgeaZuuiwseOAgeaYn+eBq+OAgU9sbGFtYSDnrYnvvIlcbmV4cG9ydCBjbGFzcyBPcGVuQUlDb21wYXRpYmxlUHJvdmlkZXIgaW1wbGVtZW50cyBBSVByb3ZpZGVyIHtcblx0cHJpdmF0ZSBjb25maWc6IEFJUHJvdmlkZXJDb25maWc7XG5cdHByaXZhdGUgcGxhdGZvcm06IEFJUGxhdGZvcm07XG5cblx0Y29uc3RydWN0b3IocGxhdGZvcm06IEFJUGxhdGZvcm0sIGNvbmZpZzogQUlQcm92aWRlckNvbmZpZykge1xuXHRcdHRoaXMucGxhdGZvcm0gPSBwbGF0Zm9ybTtcblx0XHR0aGlzLmNvbmZpZyA9IGNvbmZpZztcblx0fVxuXG5cdGFzeW5jIGFuYWx5emUoY29udGVudDogc3RyaW5nLCBleGlzdGluZ1RhZ3M6IHN0cmluZ1tdID0gW10sIGV4aXN0aW5nQ2F0ZWdvcmllczogc3RyaW5nW10gPSBbXSk6IFByb21pc2U8QW5hbHlzaXNSZXN1bHQ+IHtcblx0XHRjb25zdCBzeXN0ZW1Qcm9tcHQgPSBidWlsZFN5c3RlbVByb21wdChleGlzdGluZ1RhZ3MsIGV4aXN0aW5nQ2F0ZWdvcmllcyk7XG5cdFx0Y29uc3QgYmFzZVVybCA9IHRoaXMuY29uZmlnLmJhc2VVcmwgfHwgUExBVEZPUk1fREVGQVVMVFNbdGhpcy5wbGF0Zm9ybV0uYmFzZVVybDtcblxuXHRcdGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG5cdFx0XHR1cmw6IGAke2Jhc2VVcmx9L2NoYXQvY29tcGxldGlvbnNgLFxuXHRcdFx0bWV0aG9kOiBcIlBPU1RcIixcblx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0XCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG5cdFx0XHRcdFwiQXV0aG9yaXphdGlvblwiOiBgQmVhcmVyICR7dGhpcy5jb25maWcuYXBpS2V5fWAsXG5cdFx0XHR9LFxuXHRcdFx0Ym9keTogSlNPTi5zdHJpbmdpZnkoe1xuXHRcdFx0XHRtb2RlbDogdGhpcy5jb25maWcubW9kZWwsXG5cdFx0XHRcdG1lc3NhZ2VzOiBbXG5cdFx0XHRcdFx0eyByb2xlOiBcInN5c3RlbVwiLCBjb250ZW50OiBzeXN0ZW1Qcm9tcHQgfSxcblx0XHRcdFx0XHR7IHJvbGU6IFwidXNlclwiLCBjb250ZW50OiBg6K+35YiG5p6Q5Lul5LiL5paH56ug5YaF5a6577yM55Sf5oiQ5ZCI6YCC55qE5YWD5pWw5o2u77yaXFxuXFxuJHtjb250ZW50fWAgfSxcblx0XHRcdFx0XSxcblx0XHRcdFx0bWF4X3Rva2VuczogdGhpcy5jb25maWcubWF4VG9rZW5zIHx8IDQwOTYsXG5cdFx0XHRcdHRlbXBlcmF0dXJlOiB0aGlzLmNvbmZpZy50ZW1wZXJhdHVyZSA/PyAwLjcsXG5cdFx0XHR9KSxcblx0XHR9KTtcblxuXHRcdGlmIChyZXNwb25zZS5zdGF0dXMgIT09IDIwMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGAke1BMQVRGT1JNX0RFRkFVTFRTW3RoaXMucGxhdGZvcm1dLm5hbWV9IEFQSSDor7fmsYLlpLHotKU6ICR7cmVzcG9uc2Uuc3RhdHVzfSAke3Jlc3BvbnNlLnRleHR9YCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG5cdFx0Y29uc3QgdGV4dENvbnRlbnQgPSBkYXRhLmNob2ljZXM/LlswXT8ubWVzc2FnZT8uY29udGVudCB8fCBcIlwiO1xuXG5cdFx0cmV0dXJuIHBhcnNlUmVzcG9uc2UodGV4dENvbnRlbnQpO1xuXHR9XG5cblx0YXN5bmMgb3B0aW1pemUoY29udGVudDogc3RyaW5nLCBpc1BhcnRpYWw6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8T3B0aW1pemF0aW9uUmVzdWx0PiB7XG5cdFx0Y29uc3Qgc3lzdGVtUHJvbXB0ID0gYnVpbGRPcHRpbWl6ZVByb21wdChpc1BhcnRpYWwpO1xuXHRcdGNvbnN0IGJhc2VVcmwgPSB0aGlzLmNvbmZpZy5iYXNlVXJsIHx8IFBMQVRGT1JNX0RFRkFVTFRTW3RoaXMucGxhdGZvcm1dLmJhc2VVcmw7XG5cblx0XHRjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuXHRcdFx0dXJsOiBgJHtiYXNlVXJsfS9jaGF0L2NvbXBsZXRpb25zYCxcblx0XHRcdG1ldGhvZDogXCJQT1NUXCIsXG5cdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuXHRcdFx0XHRcIkF1dGhvcml6YXRpb25cIjogYEJlYXJlciAke3RoaXMuY29uZmlnLmFwaUtleX1gLFxuXHRcdFx0fSxcblx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcblx0XHRcdFx0bW9kZWw6IHRoaXMuY29uZmlnLm1vZGVsLFxuXHRcdFx0XHRtZXNzYWdlczogW1xuXHRcdFx0XHRcdHsgcm9sZTogXCJzeXN0ZW1cIiwgY29udGVudDogc3lzdGVtUHJvbXB0IH0sXG5cdFx0XHRcdFx0eyByb2xlOiBcInVzZXJcIiwgY29udGVudDogY29udGVudCB9LFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRtYXhfdG9rZW5zOiB0aGlzLmNvbmZpZy5tYXhUb2tlbnMgfHwgNDA5Nixcblx0XHRcdFx0dGVtcGVyYXR1cmU6IHRoaXMuY29uZmlnLnRlbXBlcmF0dXJlID8/IDAuNyxcblx0XHRcdH0pLFxuXHRcdH0pO1xuXG5cdFx0aWYgKHJlc3BvbnNlLnN0YXR1cyAhPT0gMjAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYCR7UExBVEZPUk1fREVGQVVMVFNbdGhpcy5wbGF0Zm9ybV0ubmFtZX0gQVBJIOivt+axguWksei0pTogJHtyZXNwb25zZS5zdGF0dXN9ICR7cmVzcG9uc2UudGV4dH1gKTtcblx0XHR9XG5cblx0XHRjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcblx0XHRjb25zdCB0ZXh0Q29udGVudCA9IGRhdGEuY2hvaWNlcz8uWzBdPy5tZXNzYWdlPy5jb250ZW50IHx8IFwiXCI7XG5cblx0XHRyZXR1cm4gcGFyc2VPcHRpbWl6YXRpb25SZXNwb25zZSh0ZXh0Q29udGVudCk7XG5cdH1cbn1cblxuLy8gUHJvdmlkZXIg5bel5Y6C5Ye95pWwXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQUlQcm92aWRlcihwbGF0Zm9ybTogQUlQbGF0Zm9ybSwgY29uZmlnOiBBSVByb3ZpZGVyQ29uZmlnKTogQUlQcm92aWRlciB7XG5cdHN3aXRjaCAocGxhdGZvcm0pIHtcblx0XHRjYXNlIFwiY2xhdWRlXCI6XG5cdFx0XHRyZXR1cm4gbmV3IENsYXVkZVByb3ZpZGVyKGNvbmZpZyk7XG5cdFx0Y2FzZSBcIm9wZW5haVwiOlxuXHRcdGNhc2UgXCJkZWVwc2Vla1wiOlxuXHRcdGNhc2UgXCJxd2VuXCI6XG5cdFx0Y2FzZSBcInpoaXB1XCI6XG5cdFx0Y2FzZSBcInNwYXJrXCI6XG5cdFx0Y2FzZSBcIm9sbGFtYVwiOlxuXHRcdFx0cmV0dXJuIG5ldyBPcGVuQUlDb21wYXRpYmxlUHJvdmlkZXIocGxhdGZvcm0sIGNvbmZpZyk7XG5cdFx0ZGVmYXVsdDpcblx0XHRcdHRocm93IG5ldyBFcnJvcihg5LiN5pSv5oyB55qEIEFJIOW5s+WPsDogJHtTdHJpbmcocGxhdGZvcm0pfWApO1xuXHR9XG59XG4iXX0=