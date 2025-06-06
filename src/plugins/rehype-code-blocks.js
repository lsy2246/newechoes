import { visit } from 'unist-util-visit';

export function rehypeCodeBlocks() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      // 只处理代码块元素
      if (
        node.tagName === 'pre' && 
        node.children.length === 1 && 
        node.children[0].tagName === 'code'
      ) {
        const codeElement = node.children[0];
        
        // 获取语言类名
        const classNames = codeElement.properties.className || [];
        const languageClass = classNames.find(
          className => typeof className === 'string' && className.startsWith('language-')
        );
        
        // 从父节点获取 Shiki 设置的语言标识（dataLanguage 属性）
        let shikiLanguage = '';
        if (node.properties && node.properties.dataLanguage) {
          shikiLanguage = node.properties.dataLanguage;
        }
        
        // 提取语言标识 - 优先使用 language 类，其次使用 Shiki 语言标识
        const language = languageClass
          ? languageClass.split('-')[1].toUpperCase()
          : (shikiLanguage ? shikiLanguage.toUpperCase() : 'TEXT');
          
        // 跳过处理 mermaid 图表
        if (language === 'MERMAID') {
          return;
        }
        
        // 提取原始代码 - 改进提取逻辑，处理Shiki高亮的代码
        let codeContent = '';
        
        // 判断是否是Shiki高亮的代码块
        const isShikiHighlighted = 
          (node.properties && node.properties.style && node.properties.style.includes('background-color')) || 
          (node.properties && node.properties.className && 
           node.properties.className.some(cls => typeof cls === 'string' && 
           (cls.includes('shiki') || cls.includes('astro-code'))));
        
        if (isShikiHighlighted) {
          // 从Shiki高亮的代码块中提取文本
          // 深度遍历获取所有文本节点内容
          const extractTextFromNode = (node) => {
            if (!node) return '';
            
            if (node.type === 'text') {
              return node.value || '';
            }
            
            if (node.type === 'element' && node.children) {
              // 特别处理行元素
              if (node.tagName === 'span' && node.properties && 
                  node.properties.className && 
                  node.properties.className.includes('line')) {
                return node.children.map(extractTextFromNode).join('') + '\n';
              }
              
              return node.children.map(extractTextFromNode).join('');
            }
            
            return '';
          };
          
          // 从整个代码元素提取文本
          codeContent = extractTextFromNode(codeElement).trim();
        } else {
          // 处理普通代码块
          if (codeElement.children) {
            codeContent = codeElement.children
              .map(child => {
                if (child.type === 'text') return child.value || '';
                
                // 处理已包含行结构的代码块
                if (child.type === 'element' && child.tagName === 'span' && 
                    child.properties && child.properties.className && 
                    child.properties.className.includes('line')) {
                  // 递归提取行内所有文本
                  const lineContent = (child.children || [])
                    .map(lineChild => {
                      if (lineChild.type === 'text') return lineChild.value || '';
                      if (lineChild.type === 'element' && lineChild.children) {
                        return lineChild.children
                          .map(c => c.type === 'text' ? (c.value || '') : '')
                          .join('');
                      }
                      return '';
                    })
                    .join('');
                  
                  return lineContent + '\n';
                }
                
                // 其他元素递归处理
                if (child.type === 'element' && child.children) {
                  return child.children
                    .map(c => c.type === 'text' ? (c.value || '') : '')
                    .join('');
                }
                
                return '';
              })
              .join('');
          }
        }
        
        // 保留原始代码内容用于复制功能
        const originalCode = codeContent.trim();
        
        // 如果无法提取代码内容，尝试使用其他方法
        if (!originalCode && codeElement.properties && codeElement.properties.dataValue) {
          // 某些插件会将原始代码存储在dataValue属性中
          codeContent = codeElement.properties.dataValue;
        }
        
        // 检查代码内容是否为空，如果为空则跳过处理
        if (!codeContent.trim()) {
          console.warn('Warning: Empty code block detected, skipping enhancement');
          return;
        }
        
        // 保留原始Shiki属性，确保语法高亮正常
        let nodeStyle = node.properties.style || '';
        let nodeClasses = [...(node.properties.className || [])];
        
        // 检查是否已经有行号类，如果没有则添加
        if (!nodeClasses.includes('line-numbers')) {
          nodeClasses.push('line-numbers');
        }
        
        // 确保原始Shiki主题类存在
        ['astro-code', 'theme-light', 'theme-dark'].forEach(cls => {
          if (!nodeClasses.includes(cls)) {
            nodeClasses.push(cls);
          }
        });

        // 创建语言标签内容
        const langDivChildren = [
          {
            type: 'element',
            tagName: 'svg',
            properties: {
              xmlns: 'http://www.w3.org/2000/svg',
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': '2',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round'
            },
            children: [
              {
                type: 'element',
                tagName: 'polyline',
                properties: { points: '16 18 22 12 16 6' }
              },
              {
                type: 'element',
                tagName: 'polyline',
                properties: { points: '8 6 2 12 8 18' }
              }
            ]
          }
          // 移除文本节点，将通过CSS伪元素生成
        ];
        
        // 创建复制按钮内容
        const copyButtonChildren = [
          {
            type: 'element',
            tagName: 'svg',
            properties: {
              xmlns: 'http://www.w3.org/2000/svg',
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': '2',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
              class: 'w-4 h-4'
            },
            children: [
              {
                type: 'element',
                tagName: 'rect',
                properties: { x: '9', y: '9', width: '13', height: '13', rx: '2', ry: '2' }
              },
              {
                type: 'element',
                tagName: 'path',
                properties: { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }
              }
            ]
          }
          // 移除文本节点，将通过CSS伪元素生成
        ];
        
        // 计算代码行数，用于生成行号
        const lineCount = originalCode.split('\n').length;
        
        // 生成行号元素
        const lineNumberElements = [];
        for (let i = 1; i <= lineCount; i++) {
          lineNumberElements.push({
            type: 'element',
            tagName: 'div',
            properties: { className: ['line-number'] },
            children: [] // 移除文本节点，行号将通过CSS伪元素生成
          });
        }
        
        // 创建新的代码块容器结构
        const codeBlockContainer = {
          type: 'element',
          tagName: 'div',
          properties: { 
            className: ['code-block-container', 'astro-code-container'],
            'data-language': language.toLowerCase(),
            'data-theme': 'light dark' // 表明支持双主题
          },
          children: [
            // 标题栏
            {
              type: 'element',
              tagName: 'div',
              properties: { className: ['code-block-header'] },
              children: [
                // 语言标签
                {
                  type: 'element',
                  tagName: 'div',
                  properties: { 
                    className: ['code-block-lang'],
                    'data-language': language // 添加data属性存储语言名称
                  },
                  children: langDivChildren
                },
                // 复制按钮 - 使用 data-code 属性存储编码后的代码内容
                {
                  type: 'element',
                  tagName: 'button',
                  properties: { 
                    className: ['code-block-copy'],
                    'data-code': Buffer.from(originalCode, 'utf-8').toString('base64'),
                    'data-copy-text': '复制' // 添加data属性存储复制文本
                  },
                  children: copyButtonChildren
                }
              ]
            },
            // 代码内容区域 - 修改结构，将代码内容和行号分离
            {
              type: 'element',
              tagName: 'div',
              properties: { className: ['code-block-content'] },
              children: [
                // 行号容器
                {
                  type: 'element',
                  tagName: 'nav',
                  properties: { className: ['line-numbers-container'] },
                  children: lineNumberElements
                },
                // 代码内容容器
                {
                  type: 'element',
                  tagName: 'div',
                  properties: { className: ['code-content-container'] },
                  children: [
                    // 保留原始的 pre 元素及其所有关键属性
                    {
                      type: 'element',
                      tagName: 'pre',
                      properties: {
                        style: nodeStyle,
                        className: nodeClasses,
                        // 其他可能的重要属性
                        'data-theme': node.properties['data-theme']
                      },
                      children: [
                        // 保留原始的code元素，不做修改
                        codeElement
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        };
        
        // 替换原始节点
        parent.children[index] = codeBlockContainer;
      }
    });
  };
} 