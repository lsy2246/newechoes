import { visit } from 'unist-util-visit';

export function rehypeTables() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'table') {
        // 创建表格容器
        const tableContainer = {
          type: 'element',
          tagName: 'div',
          properties: { 
            className: ['table-container']
          },
          children: [node]
        };
        
        // 替换原始表格节点
        parent.children[index] = tableContainer;
      }
    });
  };
}