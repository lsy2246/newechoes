---
title: regular expression
date: 2024-09-16T12:56:53Z
tags: []
---

### rule

```javascript
const <rule name> = /<rugular expression>/
```

### pick

1. pick for strings that comply with the rules and ruturn boolean

    ```javascript
    <rule>.test(<test string>)
    ```

2. search for string that complay with the rules, find ruturn array else return null

    ```javascript
    <rule>.exec(<test string>)
    ```

### replace

```javascript
<string>.replace(<rule>,<string>)
```
