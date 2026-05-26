import { __awaiter } from "tslib";
import { Component, MarkdownRenderer, Modal } from "obsidian";
export class TextOptimizationModal extends Modal {
    constructor(app, result, isPartial, onConfirm) {
        super(app);
        this.onConfirm = () => { };
        this.currentMode = "source";
        this.result = result;
        this.isPartial = isPartial;
        this.onConfirm = onConfirm;
        this.editedText = result.optimizedText || "";
        this.component = new Component();
        this.component.load();
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        // 设置模态框更大尺寸 - 使用CSS类
        this.modalEl.classList.add("ai-optimize-modal");
        contentEl.createEl("h2", { text: this.isPartial ? "AI 文本优化（选中片段）" : "AI 文本优化（全文）" });
        // 主容器 - 左右分栏
        const mainContainer = contentEl.createDiv({ cls: "ai-optimize-container" });
        // 左侧 - 优化后的文本（使用 Obsidian 的 Markdown 编辑器）
        const leftPanel = mainContainer.createDiv({ cls: "ai-optimize-left" });
        // 标签栏容器
        const tabHeader = leftPanel.createDiv({ cls: "ai-optimize-tab-header" });
        // 源码模式标签
        this.sourceTabBtn = tabHeader.createEl("button", {
            text: "源码模式",
            cls: "ai-optimize-tab ai-optimize-tab-active"
        });
        // 阅读视图标签
        this.previewTabBtn = tabHeader.createEl("button", {
            text: "阅读视图",
            cls: "ai-optimize-tab"
        });
        // 标签切换事件
        this.sourceTabBtn.addEventListener("click", () => void this.switchMode("source"));
        this.previewTabBtn.addEventListener("click", () => void this.switchMode("preview"));
        // 刷新按钮（仅在阅读视图显示）
        const refreshBtn = tabHeader.createEl("button", {
            text: "刷新",
            cls: "ai-optimize-refresh-btn"
        });
        refreshBtn.addEventListener("click", () => void this.refreshPreview());
        this.refreshBtn = refreshBtn;
        // 创建编辑器容器
        const editorContainer = leftPanel.createDiv({ cls: "ai-optimize-editor" });
        // 源码模式编辑器 - 使用 contentEditable div
        this.editorEl = editorContainer.createEl("div", { cls: "ai-optimize-editable" });
        this.editorEl.contentEditable = "true";
        this.editorEl.textContent = this.editedText;
        // 阅读视图容器 - 使用 MarkdownRenderer 渲染
        this.previewEl = editorContainer.createEl("div", {
            cls: "ai-optimize-preview markdown-rendered markdown-preview-view"
        });
        // 监听内容变化
        this.editorEl.addEventListener("input", () => {
            this.editedText = this.editorEl.textContent || "";
        });
        // 右侧 - 优化建议
        const rightPanel = mainContainer.createDiv({ cls: "ai-optimize-right" });
        const suggestionContainer = rightPanel.createDiv({ cls: "ai-optimize-suggestions" });
        // 解析并显示优化建议（按条目换行）
        if (this.result.explanation) {
            const suggestions = this.parseSuggestions(this.result.explanation);
            if (suggestions.length > 0) {
                suggestions.forEach((suggestion) => {
                    const itemDiv = suggestionContainer.createEl("div", { cls: "ai-optimize-suggestion-item" });
                    itemDiv.createEl("span", { text: "• ", cls: "ai-optimize-suggestion-bullet" });
                    itemDiv.createEl("span", { text: suggestion, cls: "ai-optimize-suggestion-text" });
                });
            }
            else {
                suggestionContainer.createEl("div", {
                    text: this.result.explanation,
                    cls: "ai-optimize-suggestion-text"
                });
            }
        }
        else {
            suggestionContainer.createEl("div", {
                text: "无优化建议",
                cls: "ai-optimize-no-suggestions"
            });
        }
        // 按钮
        const buttonContainer = contentEl.createDiv({ cls: "modal-button-container" });
        const confirmButton = buttonContainer.createEl("button", {
            text: "应用",
            cls: "mod-cta",
        });
        confirmButton.addEventListener("click", () => {
            if (typeof this.onConfirm === 'function') {
                this.onConfirm(true, this.editedText);
            }
            this.close();
        });
        const cancelButton = buttonContainer.createEl("button", {
            text: "取消",
        });
        cancelButton.addEventListener("click", () => {
            if (typeof this.onConfirm === 'function') {
                this.onConfirm(false);
            }
            this.close();
        });
    }
    /**
     * 切换编辑器模式
     */
    switchMode(mode) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.currentMode === mode)
                return;
            this.currentMode = mode;
            if (mode === "source") {
                // 切换到源码模式
                this.editorEl.classList.remove("hidden");
                this.previewEl.classList.remove("visible");
                // 更新标签样式
                this.sourceTabBtn.classList.add("ai-optimize-tab-active");
                this.previewTabBtn.classList.remove("ai-optimize-tab-active");
                // 隐藏刷新按钮
                this.refreshBtn.classList.remove("visible");
            }
            else {
                // 切换到阅读视图
                this.editorEl.classList.add("hidden");
                this.previewEl.classList.add("visible");
                // 更新标签样式
                this.previewTabBtn.classList.add("ai-optimize-tab-active");
                this.sourceTabBtn.classList.remove("ai-optimize-tab-active");
                // 显示刷新按钮
                this.refreshBtn.classList.add("visible");
                // 同步最新内容并渲染
                yield this.refreshPreview();
            }
        });
    }
    /**
     * 刷新预览内容
     */
    refreshPreview() {
        return __awaiter(this, void 0, void 0, function* () {
            // 从编辑器同步最新内容
            this.editedText = this.editorEl.textContent || "";
            // 清空预览区域并重新渲染
            this.previewEl.empty();
            yield MarkdownRenderer.render(this.app, this.editedText, this.previewEl, "", this.component);
        });
    }
    /**
     * 解析优化建议，按条目分割
     */
    parseSuggestions(explanation) {
        if (!explanation)
            return [];
        // 尝试多种分隔方式
        // 1. 按数字序号分割 (1. 2. 3. 或 1、2、3、)
        let suggestions = explanation.split(/\d+[.、]\s*/).filter(s => s.trim());
        // 2. 如果没有数字序号，尝试按换行分割
        if (suggestions.length <= 1) {
            suggestions = explanation.split(/\n+/).filter(s => s.trim());
        }
        // 3. 如果还是没有，尝试按中文分号或逗号分割
        if (suggestions.length <= 1) {
            suggestions = explanation.split(/[;；]/).filter(s => s.trim());
        }
        return suggestions.map(s => s.trim()).filter(s => s.length > 0);
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.component.unload();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dC1vcHRpbWl6YXRpb24tbW9kYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZXh0LW9wdGltaXphdGlvbi1tb2RhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFPLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFHbkUsTUFBTSxPQUFPLHFCQUFzQixTQUFRLEtBQUs7SUFhL0MsWUFBWSxHQUFRLEVBQUUsTUFBMEIsRUFBRSxTQUFrQixFQUFFLFNBQTREO1FBQ2pJLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQVhaLGNBQVMsR0FBc0QsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDO1FBSWhFLGdCQUFXLEdBQXlCLFFBQVEsQ0FBQztRQVFwRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxhQUFhLElBQUksRUFBRSxDQUFDO1FBQzdDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUNqQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxNQUFNO1FBQ0wsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzQixTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFbEIscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRWhELFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxF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O1FBQ2pDLElBQUksV0FBVyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFFeEUsc0JBQXNCO1FBQ3RCLElBQUksV0FBVyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7WUFDNUIsV0FBVyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7U0FDN0Q7UUFFRCx5QkFBeUI7UUFDekIsSUFBSSxXQUFXLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtZQUM1QixXQUFXLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztTQUM5RDtRQUVELE9BQU8sV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVELE9BQU87UUFDTixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzNCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNsQixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3pCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgQ29tcG9uZW50LCBNYXJrZG93blJlbmRlcmVyLCBNb2RhbCB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgeyBPcHRpbWl6YXRpb25SZXN1bHQgfSBmcm9tIFwiLi4vYWktcHJvdmlkZXJcIjtcblxuZXhwb3J0IGNsYXNzIFRleHRPcHRpbWl6YXRpb25Nb2RhbCBleHRlbmRzIE1vZGFsIHtcblx0cmVzdWx0OiBPcHRpbWl6YXRpb25SZXN1bHQ7XG5cdGlzUGFydGlhbDogYm9vbGVhbjtcblx0b25Db25maXJtOiAoY29uZmlybWVkOiBib29sZWFuLCBlZGl0ZWRUZXh0Pzogc3RyaW5nKSA9PiB2b2lkID0gKCkgPT4ge307XG5cdGVkaXRlZFRleHQ6IHN0cmluZztcblx0cHJpdmF0ZSBlZGl0b3JFbDogSFRNTEVsZW1lbnQ7XG5cdHByaXZhdGUgcHJldmlld0VsOiBIVE1MRWxlbWVudDtcblx0cHJpdmF0ZSBjdXJyZW50TW9kZTogXCJzb3VyY2VcIiB8IFwicHJldmlld1wiID0gXCJzb3VyY2VcIjtcblx0cHJpdmF0ZSBzb3VyY2VUYWJCdG46IEhUTUxFbGVtZW50O1xuXHRwcml2YXRlIHByZXZpZXdUYWJCdG46IEhUTUxFbGVtZW50O1xuXHRwcml2YXRlIHJlZnJlc2hCdG46IEhUTUxFbGVtZW50O1xuXHRwcml2YXRlIGNvbXBvbmVudDogQ29tcG9uZW50O1xuXG5cdGNvbnN0cnVjdG9yKGFwcDogQXBwLCByZXN1bHQ6IE9wdGltaXphdGlvblJlc3VsdCwgaXNQYXJ0aWFsOiBib29sZWFuLCBvbkNvbmZpcm06IChjb25maXJtZWQ6IGJvb2xlYW4sIGVkaXRlZFRleHQ/OiBzdHJpbmcpID0+IHZvaWQpIHtcblx0XHRzdXBlcihhcHApO1xuXHRcdHRoaXMucmVzdWx0ID0gcmVzdWx0O1xuXHRcdHRoaXMuaXNQYXJ0aWFsID0gaXNQYXJ0aWFsO1xuXHRcdHRoaXMub25Db25maXJtID0gb25Db25maXJtO1xuXHRcdHRoaXMuZWRpdGVkVGV4dCA9IHJlc3VsdC5vcHRpbWl6ZWRUZXh0IHx8IFwiXCI7XG5cdFx0dGhpcy5jb21wb25lbnQgPSBuZXcgQ29tcG9uZW50KCk7XG5cdFx0dGhpcy5jb21wb25lbnQubG9hZCgpO1xuXHR9XG5cblx0b25PcGVuKCkge1xuXHRcdGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xuXG5cdFx0Ly8g6K6+572u5qih5oCB5qGG5pu05aSn5bC65a+4IC0g5L2/55SoQ1NT57G7XG5cdFx0dGhpcy5tb2RhbEVsLmNsYXNzTGlzdC5hZGQoXCJhaS1vcHRpbWl6ZS1tb2RhbFwiKTtcblxuXHRcdGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogdGhpcy5pc1BhcnRpYWwgPyBcIkFJIOaWh+acrOS8mOWMlu+8iOmAieS4reeJh+aute+8iVwiIDogXCJBSSDmlofmnKzkvJjljJbvvIjlhajmlofvvIlcIiB9KTtcblxuXHRcdC8vIOS4u+WuueWZqCAtIOW3puWPs+WIhuagj1xuXHRcdGNvbnN0IG1haW5Db250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcImFpLW9wdGltaXplLWNvbnRhaW5lclwiIH0pO1xuXG5cdFx0Ly8g5bem5L6nIC0g5LyY5YyW5ZCO55qE5paH5pys77yI5L2/55SoIE9ic2lkaWFuIOeahCBNYXJrZG93biDnvJbovpHlmajvvIlcblx0XHRjb25zdCBsZWZ0UGFuZWwgPSBtYWluQ29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJhaS1vcHRpbWl6ZS1sZWZ0XCIgfSk7XG5cblx0XHQvLyDmoIfnrb7moI/lrrnlmahcblx0XHRjb25zdCB0YWJIZWFkZXIgPSBsZWZ0UGFuZWwuY3JlYXRlRGl2KHsgY2xzOiBcImFpLW9wdGltaXplLXRhYi1oZWFkZXJcIiB9KTtcblxuXHRcdC8vIOa6kOeggeaooeW8j+agh+etvlxuXHRcdHRoaXMuc291cmNlVGFiQnRuID0gdGFiSGVhZGVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcblx0XHRcdHRleHQ6IFwi5rqQ56CB5qih5byPXCIsXG5cdFx0XHRjbHM6IFwiYWktb3B0aW1pemUtdGFiIGFpLW9wdGltaXplLXRhYi1hY3RpdmVcIlxuXHRcdH0pO1xuXG5cdFx0Ly8g6ZiF6K+76KeG5Zu+5qCH562+XG5cdFx0dGhpcy5wcmV2aWV3VGFiQnRuID0gdGFiSGVhZGVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcblx0XHRcdHRleHQ6IFwi6ZiF6K+76KeG5Zu+XCIsXG5cdFx0XHRjbHM6IFwiYWktb3B0aW1pemUtdGFiXCJcblx0XHR9KTtcblxuXHRcdC8vIOagh+etvuWIh+aNouS6i+S7tlxuXHRcdHRoaXMuc291cmNlVGFiQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB2b2lkIHRoaXMuc3dpdGNoTW9kZShcInNvdXJjZVwiKSk7XG5cdFx0dGhpcy5wcmV2aWV3VGFiQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB2b2lkIHRoaXMuc3dpdGNoTW9kZShcInByZXZpZXdcIikpO1xuXG5cdFx0Ly8g5Yi35paw5oyJ6ZKu77yI5LuF5Zyo6ZiF6K+76KeG5Zu+5pi+56S677yJXG5cdFx0Y29uc3QgcmVmcmVzaEJ0biA9IHRhYkhlYWRlci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XG5cdFx0XHR0ZXh0OiBcIuWIt+aWsFwiLFxuXHRcdFx0Y2xzOiBcImFpLW9wdGltaXplLXJlZnJlc2gtYnRuXCJcblx0XHR9KTtcblx0XHRyZWZyZXNoQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB2b2lkIHRoaXMucmVmcmVzaFByZXZpZXcoKSk7XG5cdFx0dGhpcy5yZWZyZXNoQnRuID0gcmVmcmVzaEJ0bjtcblxuXHRcdC8vIOWIm+W7uue8lui+keWZqOWuueWZqFxuXHRcdGNvbnN0IGVkaXRvckNvbnRhaW5lciA9IGxlZnRQYW5lbC5jcmVhdGVEaXYoeyBjbHM6IFwiYWktb3B0aW1pemUtZWRpdG9yXCIgfSk7XG5cblx0XHQvLyDmupDnoIHmqKHlvI/nvJbovpHlmaggLSDkvb/nlKggY29udGVudEVkaXRhYmxlIGRpdlxuXHRcdHRoaXMuZWRpdG9yRWwgPSBlZGl0b3JDb250YWluZXIuY3JlYXRlRWwoXCJkaXZcIiwgeyBjbHM6IFwiYWktb3B0aW1pemUtZWRpdGFibGVcIiB9KTtcblx0XHR0aGlzLmVkaXRvckVsLmNvbnRlbnRFZGl0YWJsZSA9IFwidHJ1ZVwiO1xuXHRcdHRoaXMuZWRpdG9yRWwudGV4dENvbnRlbnQgPSB0aGlzLmVkaXRlZFRleHQ7XG5cblx0XHQvLyDpmIXor7vop4blm77lrrnlmaggLSDkvb/nlKggTWFya2Rvd25SZW5kZXJlciDmuLLmn5Ncblx0XHR0aGlzLnByZXZpZXdFbCA9IGVkaXRvckNvbnRhaW5lci5jcmVhdGVFbChcImRpdlwiLCB7XG5cdFx0XHRjbHM6IFwiYWktb3B0aW1pemUtcHJldmlldyBtYXJrZG93bi1yZW5kZXJlZCBtYXJrZG93bi1wcmV2aWV3LXZpZXdcIlxuXHRcdH0pO1xuXG5cdFx0Ly8g55uR5ZCs5YaF5a655Y+Y5YyWXG5cdFx0dGhpcy5lZGl0b3JFbC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgKCkgPT4ge1xuXHRcdFx0dGhpcy5lZGl0ZWRUZXh0ID0gdGhpcy5lZGl0b3JFbC50ZXh0Q29udGVudCB8fCBcIlwiO1xuXHRcdH0pO1xuXG5cdFx0Ly8g5Y+z5L6nIC0g5LyY5YyW5bu66K6uXG5cdFx0Y29uc3QgcmlnaHRQYW5lbCA9IG1haW5Db250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcImFpLW9wdGltaXplLXJpZ2h0XCIgfSk7XG5cblx0XHRjb25zdCBzdWdnZXN0aW9uQ29udGFpbmVyID0gcmlnaHRQYW5lbC5jcmVhdGVEaXYoeyBjbHM6IFwiYWktb3B0aW1pemUtc3VnZ2VzdGlvbnNcIiB9KTtcblxuXHRcdC8vIOino+aekOW5tuaYvuekuuS8mOWMluW7uuiuru+8iOaMieadoeebruaNouihjO+8iVxuXHRcdGlmICh0aGlzLnJlc3VsdC5leHBsYW5hdGlvbikge1xuXHRcdFx0Y29uc3Qgc3VnZ2VzdGlvbnMgPSB0aGlzLnBhcnNlU3VnZ2VzdGlvbnModGhpcy5yZXN1bHQuZXhwbGFuYXRpb24pO1xuXHRcdFx0aWYgKHN1Z2dlc3Rpb25zLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0c3VnZ2VzdGlvbnMuZm9yRWFjaCgoc3VnZ2VzdGlvbikgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IGl0ZW1EaXYgPSBzdWdnZXN0aW9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcImFpLW9wdGltaXplLXN1Z2dlc3Rpb24taXRlbVwiIH0pO1xuXG5cdFx0XHRcdFx0aXRlbURpdi5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBcIuKAoiBcIiwgY2xzOiBcImFpLW9wdGltaXplLXN1Z2dlc3Rpb24tYnVsbGV0XCIgfSk7XG5cblx0XHRcdFx0XHRpdGVtRGl2LmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IHN1Z2dlc3Rpb24sIGNsczogXCJhaS1vcHRpbWl6ZS1zdWdnZXN0aW9uLXRleHRcIiB9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzdWdnZXN0aW9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHtcblx0XHRcdFx0XHR0ZXh0OiB0aGlzLnJlc3VsdC5leHBsYW5hdGlvbixcblx0XHRcdFx0XHRjbHM6IFwiYWktb3B0aW1pemUtc3VnZ2VzdGlvbi10ZXh0XCJcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHN1Z2dlc3Rpb25Db250YWluZXIuY3JlYXRlRWwoXCJkaXZcIiwge1xuXHRcdFx0XHR0ZXh0OiBcIuaXoOS8mOWMluW7uuiurlwiLFxuXHRcdFx0XHRjbHM6IFwiYWktb3B0aW1pemUtbm8tc3VnZ2VzdGlvbnNcIlxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly8g5oyJ6ZKuXG5cdFx0Y29uc3QgYnV0dG9uQ29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJtb2RhbC1idXR0b24tY29udGFpbmVyXCIgfSk7XG5cblx0XHRjb25zdCBjb25maXJtQnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcblx0XHRcdHRleHQ6IFwi5bqU55SoXCIsXG5cdFx0XHRjbHM6IFwibW9kLWN0YVwiLFxuXHRcdH0pO1xuXHRcdGNvbmZpcm1CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcblx0XHRcdGlmICh0eXBlb2YgdGhpcy5vbkNvbmZpcm0gPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0dGhpcy5vbkNvbmZpcm0odHJ1ZSwgdGhpcy5lZGl0ZWRUZXh0KTtcblx0XHRcdH1cblx0XHRcdHRoaXMuY2xvc2UoKTtcblx0XHR9KTtcblxuXHRcdGNvbnN0IGNhbmNlbEJ1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XG5cdFx0XHR0ZXh0OiBcIuWPlua2iFwiLFxuXHRcdH0pO1xuXHRcdGNhbmNlbEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuXHRcdFx0aWYgKHR5cGVvZiB0aGlzLm9uQ29uZmlybSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHR0aGlzLm9uQ29uZmlybShmYWxzZSk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmNsb3NlKCk7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICog5YiH5o2i57yW6L6R5Zmo5qih5byPXG5cdCAqL1xuXHRwcml2YXRlIGFzeW5jIHN3aXRjaE1vZGUobW9kZTogXCJzb3VyY2VcIiB8IFwicHJldmlld1wiKSB7XG5cdFx0aWYgKHRoaXMuY3VycmVudE1vZGUgPT09IG1vZGUpIHJldHVybjtcblxuXHRcdHRoaXMuY3VycmVudE1vZGUgPSBtb2RlO1xuXG5cdFx0aWYgKG1vZGUgPT09IFwic291cmNlXCIpIHtcblx0XHRcdC8vIOWIh+aNouWIsOa6kOeggeaooeW8j1xuXHRcdFx0dGhpcy5lZGl0b3JFbC5jbGFzc0xpc3QucmVtb3ZlKFwiaGlkZGVuXCIpO1xuXHRcdFx0dGhpcy5wcmV2aWV3RWwuY2xhc3NMaXN0LnJlbW92ZShcInZpc2libGVcIik7XG5cblx0XHRcdC8vIOabtOaWsOagh+etvuagt+W8j1xuXHRcdFx0dGhpcy5zb3VyY2VUYWJCdG4uY2xhc3NMaXN0LmFkZChcImFpLW9wdGltaXplLXRhYi1hY3RpdmVcIik7XG5cdFx0XHR0aGlzLnByZXZpZXdUYWJCdG4uY2xhc3NMaXN0LnJlbW92ZShcImFpLW9wdGltaXplLXRhYi1hY3RpdmVcIik7XG5cblx0XHRcdC8vIOmakOiXj+WIt+aWsOaMiemSrlxuXHRcdFx0dGhpcy5yZWZyZXNoQnRuLmNsYXNzTGlzdC5yZW1vdmUoXCJ2aXNpYmxlXCIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyDliIfmjaLliLDpmIXor7vop4blm75cblx0XHRcdHRoaXMuZWRpdG9yRWwuY2xhc3NMaXN0LmFkZChcImhpZGRlblwiKTtcblx0XHRcdHRoaXMucHJldmlld0VsLmNsYXNzTGlzdC5hZGQoXCJ2aXNpYmxlXCIpO1xuXG5cdFx0XHQvLyDmm7TmlrDmoIfnrb7moLflvI9cblx0XHRcdHRoaXMucHJldmlld1RhYkJ0bi5jbGFzc0xpc3QuYWRkKFwiYWktb3B0aW1pemUtdGFiLWFjdGl2ZVwiKTtcblx0XHRcdHRoaXMuc291cmNlVGFiQnRuLmNsYXNzTGlzdC5yZW1vdmUoXCJhaS1vcHRpbWl6ZS10YWItYWN0aXZlXCIpO1xuXG5cdFx0XHQvLyDmmL7npLrliLfmlrDmjInpkq5cblx0XHRcdHRoaXMucmVmcmVzaEJ0bi5jbGFzc0xpc3QuYWRkKFwidmlzaWJsZVwiKTtcblxuXHRcdFx0Ly8g5ZCM5q2l5pyA5paw5YaF5a655bm25riy5p+TXG5cdFx0XHRhd2FpdCB0aGlzLnJlZnJlc2hQcmV2aWV3KCk7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIOWIt+aWsOmihOiniOWGheWuuVxuXHQgKi9cblx0cHJpdmF0ZSBhc3luYyByZWZyZXNoUHJldmlldygpIHtcblx0XHQvLyDku47nvJbovpHlmajlkIzmraXmnIDmlrDlhoXlrrlcblx0XHR0aGlzLmVkaXRlZFRleHQgPSB0aGlzLmVkaXRvckVsLnRleHRDb250ZW50IHx8IFwiXCI7XG5cblx0XHQvLyDmuIXnqbrpooTop4jljLrln5/lubbph43mlrDmuLLmn5Ncblx0XHR0aGlzLnByZXZpZXdFbC5lbXB0eSgpO1xuXHRcdGF3YWl0IE1hcmtkb3duUmVuZGVyZXIucmVuZGVyKFxuXHRcdFx0dGhpcy5hcHAsXG5cdFx0XHR0aGlzLmVkaXRlZFRleHQsXG5cdFx0XHR0aGlzLnByZXZpZXdFbCxcblx0XHRcdFwiXCIsXG5cdFx0XHR0aGlzLmNvbXBvbmVudFxuXHRcdCk7XG5cdH1cblxuXHQvKipcblx0ICog6Kej5p6Q5LyY5YyW5bu66K6u77yM5oyJ5p2h55uu5YiG5YmyXG5cdCAqL1xuXHRwcml2YXRlIHBhcnNlU3VnZ2VzdGlvbnMoZXhwbGFuYXRpb246IHN0cmluZyk6IHN0cmluZ1tdIHtcblx0XHRpZiAoIWV4cGxhbmF0aW9uKSByZXR1cm4gW107XG5cblx0XHQvLyDlsJ3or5XlpJrnp43liIbpmpTmlrnlvI9cblx0XHQvLyAxLiDmjInmlbDlrZfluo/lj7fliIblibIgKDEuIDIuIDMuIOaIliAx44CBMuOAgTPjgIEpXG5cdFx0bGV0IHN1Z2dlc3Rpb25zID0gZXhwbGFuYXRpb24uc3BsaXQoL1xcZCtbLuOAgV1cXHMqLykuZmlsdGVyKHMgPT4gcy50cmltKCkpO1xuXG5cdFx0Ly8gMi4g5aaC5p6c5rKh5pyJ5pWw5a2X5bqP5Y+377yM5bCd6K+V5oyJ5o2i6KGM5YiG5YmyXG5cdFx0aWYgKHN1Z2dlc3Rpb25zLmxlbmd0aCA8PSAxKSB7XG5cdFx0XHRzdWdnZXN0aW9ucyA9IGV4cGxhbmF0aW9uLnNwbGl0KC9cXG4rLykuZmlsdGVyKHMgPT4gcy50cmltKCkpO1xuXHRcdH1cblxuXHRcdC8vIDMuIOWmguaenOi/mOaYr+ayoeacie+8jOWwneivleaMieS4reaWh+WIhuWPt+aIlumAl+WPt+WIhuWJslxuXHRcdGlmIChzdWdnZXN0aW9ucy5sZW5ndGggPD0gMSkge1xuXHRcdFx0c3VnZ2VzdGlvbnMgPSBleHBsYW5hdGlvbi5zcGxpdCgvWzvvvJtdLykuZmlsdGVyKHMgPT4gcy50cmltKCkpO1xuXHRcdH1cblxuXHRcdHJldHVybiBzdWdnZXN0aW9ucy5tYXAocyA9PiBzLnRyaW0oKSkuZmlsdGVyKHMgPT4gcy5sZW5ndGggPiAwKTtcblx0fVxuXG5cdG9uQ2xvc2UoKSB7XG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG5cdFx0Y29udGVudEVsLmVtcHR5KCk7XG5cdFx0dGhpcy5jb21wb25lbnQudW5sb2FkKCk7XG5cdH1cbn1cbiJdfQ==