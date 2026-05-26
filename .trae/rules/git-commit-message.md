---
alwaysApply: false
description: 
scene: git_message
---
# Git 提交信息规范

## 格式

```
<类型>: <简短描述>

[可选的详细描述]
```

## 类型说明

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构代码（不新增功能或修复bug）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链相关
- `ci`: CI/CD配置修改

## 示例

```
feat: 添加批量处理笔记属性功能
fix: 修复AI优化文本不生效问题
docs: 更新README安装说明
refactor: 重构AI提供商接口
```

## 注意事项

1. 使用中文描述
2. 简短描述不超过50字符
3. 不以句号结尾
4. 使用祈使语气（如"添加"而非"添加了"）
