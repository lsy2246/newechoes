---
title: node
date: 2024-09-01T14:18:55Z
tags: []
---

### classfication

1. element node
2. attribute node
3. text node

### find

* find parent node

  ```javascript
  <DOM>.parentNode
  ```
  
* find child node

  1. single

      ```javascript
      <DOM>.childNodes
      ```

      > get all child node include text node
      >

  2. children

      ```javascript
      <DOM>.children
      ```

      > only  get element node,return pseudo array
      >
* find brother node

  * next node

    ```javascript
    <DOM>.nextElementSibling
    ```

  * previous node

    ```javascript
    previousElementSibling
    ```

### create node

1. create

    ```javascript
    document.createElement('<tag>')
    ```

2. add

    * append

      > next
      >

      ```javascript
      <fater Element>.appendChild(<create Element>)
      ```

    * insert

      > before
      >

      ```javascript
      <fater Element>.insertBefore(<create Element>,<insert Element>)
      ```

### clone

```javascript
<Element>.cloneNode(<bool>)
```

> CloneNode will clone the same elements as the original label

* if true,it will clone descendant nodes
* default is false

### delet

```javascript
<father Element>.removeChild(<delete Element>)
```

> if there is no parent element,it cannot be deleted
