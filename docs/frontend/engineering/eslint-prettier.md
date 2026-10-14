# ESLint & Prettier & Husky

## ESLint

### 核心功能

```
① 代码质量检查：
  - 未使用变量 → no-unused-vars
  - 禁止 console → no-console
  - 禁止 == → eqeqeq

② 代码风格检查：
  - 缩进 → indent
  - 引号 → quotes
  - 分号 → semi

③ Vue/TS 专用规则：
  - vue/multi-word-component-names → 组件名多词
  - 泛型后空格 → @typescript-eslint/xxx
```

### 配置

```js
// .eslintrc.cjs
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier'  // 处理与 Prettier 冲突
  ],
  rules: {
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
  },
  parserOptions: {
    ecmaVersion: 'latest'
  }
}
```

## Prettier

```json
// .prettierrc.json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "vueIndentScriptAndStyle": false
}
```

### ESLint + Prettier 配合

```yaml
问题：
  ESLint 管代码质量 + 风格
  Prettier 管代码格式
  → 规则冲突（如缩进、引号）

解决：
  eslint-config-prettier → 关闭 ESLint 中与 Prettier 冲突的规则
  eslint-plugin-prettier → 把 Prettier 作为 ESLint 规则运行（不推荐，慢）

推荐做法：
  ESLint 管代码质量
  Prettier 管代码格式
  互不冲突 → eslint-config-prettier
```

## Husky + lint-staged

```bash
# 安装
pnpm add -D husky lint-staged
npx husky init

# .husky/pre-commit
pnpm lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,ts,vue}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,scss,md}": [
      "prettier --write"
    ]
  }
}
```

**只检查暂存文件** → 快！

## 在 Vue 项目中的最佳实践

```yaml
新项目初始化检查清单：
  ✅ ESLint + @vue/eslint-config-typescript
  ✅ Prettier + eslint-config-prettier
  ✅ Husky + lint-staged（pre-commit）
  ✅ VS Code 设置：
      "editor.formatOnSave": true
      "editor.codeActionsOnSave": { "source.fixAll.eslint": true }
      "eslint.validate": ["javascript", "typescript", "vue"]
  ✅ .vscode/settings.json 提交到 Git（统一团队配置）
  ✅ .editorconfig（统一基础格式）
```

### .editorconfig

```ini
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
```

## 经典面试题

### 题1：ESLint 和 Prettier 区别

```
ESLint：代码质量（Bug 预防）
  - 未使用的变量
  - 禁止 eval
  - 要求 === 而非 ==

Prettier：代码格式（风格统一）
  - 缩进大小
  - 单引号 vs 双引号
  - 换行宽度
```

### 题2：如何在 CI 中强制规范？

```yaml
# GitHub Actions
- name: Lint
  run: npm run lint

# 失败 → CI 不通过 → 无法合并

# package.json
{
  "scripts": {
    "lint": "eslint . --ext .js,.ts,.vue",
    "lint:fix": "eslint . --ext .js,.ts,.vue --fix",
    "format": "prettier --write ."
  }
}
```