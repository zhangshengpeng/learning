# Parse — 模板解析

## 解析过程

Parse 将 HTML 字符串解析为 **AST（抽象语法树）**，采用**栈结构**来跟踪嵌套关系。

```js
// src/compiler/parser/index.js

export function parse(template, options) {
  const stack = []         // 维护标签层级关系
  let root                 // AST 根节点
  let currentParent        // 当前父节点
  let inVPre = false       // 是否在 v-pre 中

  parseHTML(template, {
    // 匹配开始标签时回调
    start(tag, attrs, unary, start, end) {
      let element = createASTElement(tag, attrs, currentParent)

      // 处理指令：v-if、v-for、v-once...
      processPre(element)     // v-pre
      processRawAttrs(element) // attrs
      processFor(element)     // v-for
      processIf(element)      // v-if / v-else-if / v-else
      processOnce(element)    // v-once
      processBind(element)    // v-bind / :
      processOn(element)      // v-on / @
      processModel(element)   // v-model
      processSlotContent(element) // slot
      processSlotOutlet(element)  // <slot>
      processComponent(element)   // is="component"

      if (!root) { root = element }

      if (!unary) {
        // 非自闭合标签：推入栈
        currentParent = element
        stack.push(element)
      }
    },

    // 匹配结束标签时回调
    end(tag, start, end) {
      const element = stack.pop() // 出栈
      currentParent = stack[stack.length - 1]
      if (currentParent) {
        currentParent.children.push(element)
        element.parent = currentParent
      }
    },

    // 匹配文本时回调
    chars(text, start, end) {
      if (text.trim() && currentParent) {
        const children = currentParent.children
        const expression = parseText(text) // 解析 {{ }}
        if (expression) {
          children.push({ type: 2, expression, text }) // 动态文本
        } else {
          children.push({ type: 3, text }) // 静态文本
        }
      }
    },
  })

  return root
}
```

## parseHTML — HTML 解析器

```js
// src/compiler/parser/html-parser.js

export function parseHTML(html, options) {
  let index = 0
  let lastTag

  while (html) {
    let textEnd = html.indexOf("<")

    if (textEnd === 0) {
      // 匹配注释 <!-- -->
      if (matchComment()) { advance(commentLength); continue }

      // 匹配 DOCTYPE
      if (matchDoctype()) { advance(doctypeLength); continue }

      // 匹配结束标签 </div>
      const endTagMatch = html.match(endTag)
      if (endTagMatch) {
        advance(endTagMatch[0].length)
        options.end(endTagMatch[1])
        continue
      }

      // 匹配开始标签 <div id="app">
      const startTagMatch = parseStartTag()
      if (startTagMatch) {
        options.start(startTagMatch.tagName, startTagMatch.attrs, startTagMatch.unary)
        continue
      }
    }

    // 文本内容
    if (textEnd >= 0) {
      const text = html.substring(0, textEnd)
      advance(text.length)
      options.chars(text)
    }
  }
}

// 消费 HTML 字符串（指针前进）
function advance(n) {
  index += n
  html = html.substring(n)
}
```

## parseStartTag — 匹配开始标签

```js
function parseStartTag() {
  const start = html.match(startTagOpen) // /^<([a-zA-Z][\w:-]*)/
  if (start) {
    const match = { tagName: start[1], attrs: [], unary: false, start: index }
    advance(start[0].length)

    // 匹配属性：id="app" class="box" @click="fn"
    while (
      !(end = html.match(startTagClose)) && // 不是 > 或 />
      (attr = html.match(dynamicArgAttribute) || html.match(attribute))
    ) {
      advance(attr[0].length)
      match.attrs.push(attr)
    }

    if (end) {
      match.unary = end[1] === "/" // <br /> 自闭合
      advance(end[0].length)
    }
    return match
  }
}
```

## `{{ }}` 插值解析

```js
// src/compiler/parser/text-parser.js

const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g

export function parseText(text) {
  // 纯文本无变量 → 不需要解析
  if (!defaultTagRE.test(text)) return

  const tokens = []
  let lastIndex = 0
  let match

  // "hello {{ name }}, age is {{ age }}"
  // → tokens: ["hello ", "_s(name)", ", age is ", "_s(age)"]
  while ((match = defaultTagRE.exec(text))) {
    if (match.index > lastIndex) {
      tokens.push(JSON.stringify(text.slice(lastIndex, match.index)))
    }
    tokens.push("_s(" + match[1].trim() + ")")
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    tokens.push(JSON.stringify(text.slice(lastIndex)))
  }

  return tokens.join("+")
  // → "hello " + _s(name) + ", age is " + _s(age)
}
```
