---
title: "Hugo Theme Stack美化教程"
date: 2024-06-28T17:23:16+08:00
tags: []
---

### 安装

```bash
git clone https://github.com/CaiJimmy/hugo-theme-stack/ themes/hugo-theme-stack
```

官方文档: [Modify theme | Stack](https://stack.jimmycai.com/guide/modify-theme)

### 美化

下文`custom.scss`指的是`~hugo/themes/hugo-theme-stack/assets/scss/custom.scss`

#### 主题整体细节调整

在`custom.scss`中写入以下内容:

```bash
//----------------------------------------------------
// 页面基本配色
:root {
  // 全局顶部边距
  --main-top-padding: 30px;
  // 全局卡片圆角
  --card-border-radius: 25px;
  // 标签云卡片圆角
  --tag-border-radius: 8px;
  // 卡片间距
  --section-separation: 40px;
  // 全局字体大小
  --article-font-size: 1.8rem;
  // 行内代码背景色
  --code-background-color: #f8f8f8;
  // 行内代码前景色
  --code-text-color: #e96900;
  // 暗色模式下样式
  &[data-scheme="dark"] {
    // 行内代码背景色
    --code-background-color: #ff6d1b17;
    // 行内代码前景色
    --code-text-color: #e96900;
    // 暗黑模式下背景色
    --body-background: #000;
    // 暗黑模式下卡片背景色
    --card-background: hsl(225 13% 8% / 1);
  }
}
//------------------------------------------------------
// 修复引用块内容窄页面显示问题
a {
  word-break: break-all;
}

code {
  word-break: break-all;
}

//---------------------------------------------------
// 文章封面高度
.article-list article .article-image img {
  width: 100%;
  height: 200px !important;
  object-fit: cover;

  @include respond(md) {
      height: 250px !important;
  }

  @include respond(xl) {
      height: 285px !important;
  }
}

//--------------------------------------------------
// 文章内容图片圆角阴影
.article-page .main-article .article-content {
  img {
    max-width: 96% !important;
    height: auto !important;
    border-radius: 8px;
  }
}

//------------------------------------------------
// 文章内容引用块样式
.article-content {
  blockquote {
    border-left: 6px solid #358b9a1f !important;
    background: #3a97431f;
  }
}
// ---------------------------------------
// 代码块样式修改
.highlight {
  max-width: 102% !important;
  background-color: var(--pre-background-color);
  padding: var(--card-padding);
  position: relative;
  border-radius: 20px;
  margin-left: -7px !important;
  margin-right: -12px;
  box-shadow: var(--shadow-l1) !important;

  &:hover {
    .copyCodeButton {
      opacity: 1;
    }
  }

  // keep Codeblocks LTR
  [dir="rtl"] & {
    direction: ltr;
  }

  pre {
    margin: initial;
    padding: 0;
    margin: 0;
    width: auto;
  }
}

// light模式下的代码块样式调整
[data-scheme="light"] .article-content .highlight {
  background-color: #fff9f3;
}

[data-scheme="light"] .chroma {
  color: #ff6f00;
  background-color: #fff9f3cc;
}

//-------------------------------------------
// 设置选中字体的区域背景颜色
//修改选中颜色
::selection {
  color: #fff;
  background: #34495e;
}

a {
  text-decoration: none;
  color: var(--accent-color);

  &:hover {
    color: var(--accent-color-darker);
  }

  &.link {
    color: #4288b9ad;
    font-weight: 600;
    padding: 0 2px;
    text-decoration: none;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
}

//-------------------------------------------------
//文章封面高度更改
.article-list article .article-image img {
  width: 100%;
  height: 150px;
  object-fit: cover;

  @include respond(md) {
    height: 200px;
  }

  @include respond(xl) {
    height: 305px;
  }
}

//---------------------------------------------------
// 全局页面布局间距调整
.main-container {
  min-height: 100vh;
  align-items: flex-start;
  padding: 0 15px;
  gap: var(--section-separation);
  padding-top: var(--main-top-padding);

  @include respond(md) {
    padding: 0 37px;
  }
}

//--------------------------------------------------
//页面三栏宽度调整
.container {
  margin-left: auto;
  margin-right: auto;

  .left-sidebar {
    order: -3;
    max-width: var(--left-sidebar-max-width);
  }

  .right-sidebar {
    order: -1;
    max-width: var(--right-sidebar-max-width);

    /// Display right sidebar when min-width: lg
    @include respond(lg) {
      display: flex;
    }
  }

  &.extended {
    @include respond(md) {
      max-width: 1024px;
      --left-sidebar-max-width: 25%;
      --right-sidebar-max-width: 22% !important;
    }

    @include respond(lg) {
      max-width: 1280px;
      --left-sidebar-max-width: 20%;
      --right-sidebar-max-width: 30%;
    }

    @include respond(xl) {
      max-width: 1453px; //1536px;
      --left-sidebar-max-width: 15%;
      --right-sidebar-max-width: 25%;
    }
  }

  &.compact {
    @include respond(md) {
      --left-sidebar-max-width: 25%;
      max-width: 768px;
    }

    @include respond(lg) {
      max-width: 1024px;
      --left-sidebar-max-width: 20%;
    }

    @include respond(xl) {
      max-width: 1280px;
    }
  }
}

//-------------------------------------------------------
//全局页面小图片样式微调
.article-list--compact article .article-image img {
  width: var(--image-size);
  height: var(--image-size);
  object-fit: cover;
  border-radius: 17%;
}

//----------------------------------------------------
//固定代码块的高度
.article-content {
  .highlight {
      padding: var(--card-padding);
      pre {
          width: auto;
          max-height: 20em;
      }
  }
}

//--------------------------------------------------
// 修改首页搜索框样式
.search-form.widget input {
  font-size: 1.5rem;
  padding: 44px 25px 19px;
}
```

#### 菜单栏调整为圆角

在`custom.scss`中写入以下内容:

```bash
//----------------------------------------------------
// 下拉菜单改圆角样式
.menu {
  padding-left: 0;
  list-style: none;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: scroll;
  flex-grow: 1;
  font-size: 1.6rem;
  background-color: var(--card-background);

  box-shadow: var(--shadow-l2); //改个阴影
  display: none;
  margin: 0; //改为0
  border-radius: 10px; //加个圆角
  padding: 30px 30px;

  @include respond(xl) {
    padding: 15px 0;
  }

  &,
  .menu-bottom-section {
    gap: 30px;

    @include respond(xl) {
      gap: 25px;
    }
  }

  &.show {
    display: flex;
  }

  @include respond(md) {
    align-items: flex-end;
    display: flex;
    background-color: transparent;
    padding: 0;
    box-shadow: none;
    margin: 0;
  }

  li {
    position: relative;
    vertical-align: middle;
    padding: 0;

    @include respond(md) {
      width: 100%;
    }

    svg {
      stroke-width: 1.33;

      width: 20px;
      height: 20px;
    }

    a {
      height: 100%;
      display: inline-flex;
      align-items: center;
      color: var(--body-text-color);
      gap: var(--menu-icon-separation);
    }

    span {
      flex: 1;
    }

    &.current {
      a {
        color: var(--accent-color);
        font-weight: bold;
      }
    }
  }
}

```

#### 滚动条美化

在`custom.scss`中写入以下内容:

```bash
//------------------------------------------------
//将滚动条修改为圆角样式
//菜单滚动条美化
.menu::-webkit-scrollbar {
  display: none;
}

// 全局滚动条美化
html {
  ::-webkit-scrollbar {
    width: 20px;
  }

  ::-webkit-scrollbar-track {
    background-color: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background-color: #d6dee1;
    border-radius: 20px;
    border: 6px solid transparent;
    background-clip: content-box;
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: #a8bbbf;
  }
}

```

#### 归档页实现双栏

在`custom.scss`中写入以下内容:

```bash
//--------------------------------------------------
//归档页面双栏
/* 归档页面两栏 */
@media (min-width: 1024px) {
  .article-list--compact {
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: none;
    box-shadow: none;
    gap: 1rem;

    article {
      background: var(--card-background);
      border: none;
      box-shadow: var(--shadow-l2);
      margin-bottom: 8px;
      border-radius: 16px;
    }
  }
}

```

#### 文章页面左上角引入返回按钮

在`custom.scss`中,给返回按钮添加以下样式,不然返回按钮会显示异常:

```bash
//--------------------------------------------------
//引入左上角返回按钮
.back-home {
  background: var(--card-background);
  border-radius: var(--tag-border-radius);
  color: var(--card-text-color-tertiary);
  margin-right: 0.1rem;
  margin-top: 24px;
  display: inline-flex;
  align-items: center;
  font-size: 1.4rem;
  text-transform: uppercase;
  padding: 10px 20px 10px 15px;
  transition: box-shadow 0.3s ease;
  box-shadow: var(--shadow-l3);

  &:hover {
    box-shadow: var(--shadow-l2);
  }

  svg {
    margin-right: 5px;
    width: 20px;
    height: 20px;
  }

  span {
    font-weight: 500;
    white-space: nowrap;
  }
}

.main-container .right-sidebar {
  order: 2;
  max-width: var(--right-sidebar-max-width);

  /// Display right sidebar when min-width: lg
  @include respond(lg) {
    display: flex;
  }
}

main.main {
  order: 1;
  min-width: 0;
  max-width: 100%;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: var(--section-separation);

  @include respond(md) {
    padding-top: var(--main-top-padding);
  }
}

```

修改`~\hugo\themes\hugo-theme-stack\layouts\_default\single.html`

写入添加以下内容:

> 注意对照原主题,不要把重复的部分也写进去

```bash
.......已省略,请自己对照......  
    {{ partialCached "footer/footer" . }}

    {{ partialCached "article/components/photoswipe" . }}
{{ end }}

{{ define "left-sidebar" }}

{{ if (.Scratch.Get "TOCEnabled") }}
        <div id="article-toolbar" style="position: sticky;top: 5px;z-index: 1000;">
            <a href="{{ .Site.BaseURL | relLangURL }}" class="back-home">
                {{ (resources.Get "icons/back.svg").Content | safeHTML }}
                <span>{{ T "article.back" }}</span>
            </a>
        </div>
    {{ else }}
        {{ partial "sidebar/left.html" . }}
    {{ end }}
{{ end }}

{{ define "right-sidebar" }}
    {{ if .Scratch.Get "hasWidget" }}{{ partial "sidebar/right.html" (dict "Context" . "Scope" "page") }}{{ end}}
{{ end }}
```

#### 代码块引入MacOS窗口样式

在主题目录下的`assets`文件夹中的`img`文件夹中,创建一个名为`code-header.svg`的文件,在文件中写入以下内容:

```bash
<svg xmlns="http://www.w3.org/2000/svg" version="1.1"  x="0px" y="0px" width="450px" height="130px">
    <ellipse cx="65" cy="65" rx="50" ry="52" stroke="rgb(220,60,54)" stroke-width="2" fill="rgb(237,108,96)"/>
    <ellipse cx="225" cy="65" rx="50" ry="52"  stroke="rgb(218,151,33)" stroke-width="2" fill="rgb(247,193,81)"/>
    <ellipse cx="385" cy="65" rx="50" ry="52"  stroke="rgb(27,161,37)" stroke-width="2" fill="rgb(100,200,86)"/>
</svg>
```

在`custom.scss`文件中添加以下内容:

```bash
//----------------------------------------------------------
//为代码块顶部添加macos样式
.article-content {
  .highlight:before {
    content: "";
    display: block;
    background: url(../img/code-header.svg);
    height: 32px;
    width: 100%;
    background-size: 57px;
    background-repeat: no-repeat;
    margin-bottom: 5px;
    background-position: -1px 2px;
  }
}
```

#### 热力图

新建 `hugo/themes/hugo-theme-stack/layouts/shortcodes/heatmap.html`

```bash
<div id="heatmap" style="
  max-width: 1900px;
  height: 180px;
  padding: 2px;
  text-align: center;
  "
></div>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.3.0/dist/echarts.min.js"></script>
<script type="text/javascript">
  var chartDom = document.getElementById('heatmap');
  var myChart = echarts.init(chartDom);
  window.onresize = function() {
      myChart.resize();
  };
  var option;

  // echart heatmap data seems to only support two elements tuple
  // it doesn't render when each item has 3 value
  // it also only pass first 2 elements when reading event param
  // so here we build a map to store additional metadata like link and title
  // map format {date: [{wordcount, link, title}]}
  // for more information see https://blog.douchi.space/hugo-blog-heatmap
  var dataMap = new Map();
  {{ range ((where .Site.RegularPages "Type" "post")) }}
    var key = {{ .Date.Format "2006-01-02" }};
    var value = dataMap.get(key);
    var wordCount = {{ .WordCount }};
    var link = {{ .RelPermalink}};
    var title = {{ .Title }};
  
    // multiple posts in same day
    if (value == null) {
      dataMap.set(key, [{wordCount, link, title}]);
    } else {
      value.push({wordCount, link, title});
    }
  {{- end -}}

  var data = [];
  // sum up the word count
  for (const [key, value] of dataMap.entries()) {
    var sum = 0;
    for (const v of value) {
      sum += v.wordCount;
    }
    data.push([key, (sum / 1000).toFixed(1)]);
  }
  
  var startDate = new Date();
  var year_Mill = startDate.setFullYear((startDate.getFullYear() - 1));
  var startDate = +new Date(year_Mill);
  var endDate = +new Date();

  var dayTime = 3600 * 24 * 1000;
  startDate = echarts.format.formatTime('yyyy-MM-dd', startDate);
  endDate = echarts.format.formatTime('yyyy-MM-dd', endDate);

  // change date range according to months we want to render
  function heatmap_width(months){           
    var startDate = new Date();
    var mill = startDate.setMonth((startDate.getMonth() - months));
    var endDate = +new Date();
    startDate = +new Date(mill);

    endDate = echarts.format.formatTime('yyyy-MM-dd', endDate);
    startDate = echarts.format.formatTime('yyyy-MM-dd', startDate);

    var showmonth = [];
    showmonth.push([
        startDate,
        endDate
    ]);
    return showmonth
  };

  function getRangeArr() {
    const windowWidth = window.innerWidth;
    if (windowWidth >= 600) {
      return heatmap_width(12);
    } else if (windowWidth >= 400) {
      return heatmap_width(9);
    } else {
      return heatmap_width(6);
    }
  }

  option = {
    title: {
        top: 0,
        left: 'center',
        text: '热力图'
    },
    tooltip: {
      hideDelay: 1000,
      enterable: true,
      formatter: function (p) {
        const date = p.data[0];
        const posts = dataMap.get(date);
        var content = `${date}`;
        for (const [i, post] of posts.entries()) {
            content += "<br>";
            var link = post.link;
            var title = post.title;
            var wordCount = (post.wordCount / 1000).toFixed(1);
            content += `<a href="${link}" target="_blank">${title} | ${wordCount} k</a>`
        }
        return content;
      }
    },
    visualMap: {
        min: 0,
        max: 10,
        type: 'piecewise',
        orient: 'horizontal',
        left: 'center',
        top: 30,
      
        inRange: {   
          //  [floor color, ceiling color]
          color: ['#7aa8744c', '#7AA874' ] 
        },
        splitNumber: 4,
        text: ['千字', ''],
        showLabel: true,
        itemGap: 20,
    },
    calendar: {
        top: 80,
        left: 20,
        right: 4,
        cellSize: ['auto', 13],
        range: getRangeArr(),
        itemStyle: {
            color: '#F1F1F1',
            borderWidth: 1.5,
            borderColor: '#fff',
        },
        yearLabel: { show: false },
        // the splitline between months. set to transparent for now.
        splitLine: {
          lineStyle: {
            color: 'rgba(0, 0, 0, 0.0)',
            // shadowColor: 'rgba(0, 0, 0, 0.5)',
            // shadowBlur: 5,
            // width: 0.5,
            // type: 'dashed',
          }
        }
    },
    series: {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: data,
    }
  };
  myChart.setOption(option);
  myChart.on('click', function(params) {
    if (params.componentType === 'series') {
      // open the first post on the day
      const post = dataMap.get(params.data[0])[0];
      const link = window.location.origin + post.link;
      window.open(link, '_blank').focus();
    }
});
</script> 
```

文章里输入(将`\`删除)：

```markdown
    {\{< heatmap >}\}
```

#### 汉语和英语之间自动添加空格

在主题目录中的 `layouts/partials/footer/footer.html` 中写入以下内容

```bash
<script>
    (function(u, c) {
      var d = document, t = 'script', o = d.createElement(t),
          s = d.getElementsByTagName(t)[0];
      o.src = u;
      if (c) { o.addEventListener('load', function(e) { c(e); }); }
      s.parentNode.insertBefore(o, s);
    })('//cdn.bootcss.com/pangu/4.0.7/pangu.min.js', function() {
      pangu.spacingPage();
    });
</script>
```
