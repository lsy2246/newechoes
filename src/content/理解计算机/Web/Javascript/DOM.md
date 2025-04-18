---
title: DOM
date: 2024-07-21T18:29:25Z
tags: []
---


### get DOM object

#### CSS selector

1. select for first matching element

    ```javascript
    document.querySelector('<CSS selector>')
    ```

2. select for all matching element

    ```javascript
    document.querySelectorAll('<CSS selector>')
    ```

    > there are pseudo array
    >
    > have length and index
    >
    > not have function such as push(),pop()
    >

#### Other method

1. select for matching ID

    ```javascript
    document.getElementById('<ID name>')
    ```

2. select for all matching Tag

    ```javascript
    document.getElementByTagName('<element name>')
    ```

3. select for all matching class

    ```javascript
    document.getElementClassName('<class name>')
    ```

### access

1. content

    * ```javascript
      <DOM>.innerText='<text>'
      ```

      > only recognize text,do not parse tags
      >
    * ```javascript
      <DOM>.innerHTML='<html>'
      ```

2. attribute

    ```javascript
    <DOM>.<attribute> = '<value>'
    ```

3. style

    > multiple words named with small humps
    >
    > ​`background-color`​ use `backgroundColor`​
    >

    ```javascript
    <DOM>.style.<style> ='<value>'
    ```

4. class

    ```javascript
    <element>.className = '<class name>'
    ```

5. classlist

    * add

      ```javascript
      <element>.classList.add('<class name>')
      ```

    * remove

      ```javascript
      <element>.classList.remove('<class name>')
      ```

    * swich

      ```javascript
      <element>.classList.toggle('<class name>')
      ```

    * find

      ```javascript
      <element>.classList.contains('<class name>')
      ```

‍

### custom attribute

#### name

```javascript
data-<name>
```

#### dataset

```javascript
<DOM>.dataset.<name>
```
