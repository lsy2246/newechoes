---
title: event
date: 2024-08-07T11:06:05Z
tags: []
---

### event listener

1. DOM L0

    ```javascript
    <DOM>.on<type>=function(){}
    ```

    > event will be cover
    >
2. DOM L2

    ```javascript
    <DOM>.addEventListener('<type>',<functiion>)
    ```

|type|作用|
| :-----------------------------------------: | :--------------------: |
|鼠标触发||
|click|鼠标点击|
|mousemove|鼠标移动|
|mouseenter|鼠标经过|
|mouseleave|鼠标离开|
|表单获得光标||
|focus|获得焦距|
|blur|失去焦距|
|键盘触发||
|keydown|键盘按下触发|
|keyup|键盘抬起触发|
|表单输入触发||
|input|用户输入触发|

### event object

#### get

1. The first cllback function bound to an event
2. name rule：`event`​ `e`​

```javascript
<DOM>.addEventListener('<event>',function(<e>){})
```

#### attribute

1. type
2. clientX/ClientY

    > get the position of the cursor relative to the visible upper left corner of the browser
    >
3. offsetX/offsetY

    > get the position of the cursor relative to the top left corner of the DOM element
    >
4. key

    > the value of pressing a key
    >

### event flow

The complete proxess of event execution

### event capturing

`<DOM>` executes events starting from the root element (for inside out)

> the third parameter of event monitoring is true

### event bubbling

`<DOM>` executes events starting from the outermost(from the outside in)

> the third parameter of event monitoring is false or default

### stop flow

```javascript
<e>.stopPropagation()
```

> prevent the flow of events

‍

‍

### event unbinding

#### L0

```javascript
<DOM>.on<operate> =null
```

#### L2

```javascript
<DOM>.removeEventListener('<operate>',<function>)
```

### mouse passong event

1. mode1

    ```javascript
    mouseober
    ```

    ```javascript
    mouseout
    ```

    > there will be bubbles
    >
2. mode2(recommand)

    ```javascript
    mouserenter
    ```

    ```javascript
    mouseleave
    ```

### difference in registration events

1. on

    * using the same object,subsequent registrations will overwrite the previous object
    * using null overwrite can unbind
    * bubble phase execution
2. event listeners

    * grammar

      ```javascript
      addEventListener(<type>,<function>,[capture])
      ```

    * using the same object,subsequent registrations not will overwrite the previous object
    * the capture staage can be datemined by the third parameter
    * anonymous function cannoy unbind

### event delegation

1. delegate object

    entrusted to the parent element
2. searching for the truly triggered element

    ```javascript
    <e>.target
    ```

### block default behavior

```javascript
<e>.preventDefault()
```

### loading event

1. triggered after loading external resources

    event name:`load`​
2. after the html document is fully loaded and parsed

    event name:`DOMcontentLoaded`​

### scrolling event

evnet name:`scroll`​

#### attribute scrolling

> the value of movement

1. scrollLeft
2. scrollTop
3. scrollTo(`<x>`,`<y>`)

### size event

event name:`resize`​

#### attribute size

> visible values

1. clientWidth
2. clientHeight
3. offsetWidth(only read)
4. offsetHeight(only read)

### mobile terminal

|screen touch|explain|
| --------------| -------------------------------------------------|
|touchstart|triggered when finger touches dom|
|touchmove|triggered when the finger slides ona dom|
|touchend|triggered when the finger moves away from a dom|
