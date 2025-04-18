---
title: react
date: 2024-10-22T23:16:05Z
tags: []
---


* JSX语法

  ```npm
  function App(){
      return (<button>button</button>)
  }
  export {App};
  ```

  ```npm
  import {App} from './App.tsx';

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
      <App />
  );
  ```
  
* react组件必须以大写开头
* jsx比html更加严格，必须闭合标签。不能返回多个JSX标签，必须包裹在一个共享的父级中
* 可以利用`className`​来指定一个CSS标签
* 可以在大括号内引用JS变量，JS函数，JS对象
* props

  > 传递参数
  >

  * 可以使用解构，解构出单独的值
  * 可以给prop一个默认值
  * 如果props传递重复可以使用展开语法来传递
* state

  * 每次更新state都会请求一次新的渲染
  * 每次调用时，系统都会提供一个state调用时的快照
  * 使用更新函数，就可以使事件处理先处理更新函数
  * react会在函数处理完之后更新state叫做批处理
  * 将state视为只读
  * 只有替换了值，才算是正在的更新
  * 可以存储任意类型的javascript
  * 可以使用展开对象复制未重新赋值的对象
  * 数组

    * 可以使用展开语法再进行添加或更新
    * 可以使用`filter`​过滤
  * 对象展开是浅拷贝
  * 使用`[变量]`​可以实现属性的动态命名
  * 可以覆盖默认行为
* 渲染不会将没有改变状态已经改变过的组件重新渲染
* 用key可以区分
* reducer：将数据和行为关联到一起
* context：可以创建一个上下文对象，可以向下方整个树提供信息
* Effect：只有依赖项更新时间才会调用，可以在return里面写清楚副作用
* ref：可以储存，但是更新之后不会重新渲染节点，也可以用它指向DOM节点
* 自定义Hook

  * 自定义以use开头的的函数，将可以复用的功能封装出去
  * 只能在顶层调用，不能被嵌套
