---
title: object
date: 2024-08-07T11:01:38Z
tags: []
---

### timer

#### intermittent

##### open

```javascript
let <timer name> =setInterval(<function name>,<time(ms)>)
```

```javascript
let <timer name> =setInterval(function(){},<time(ms)>)
```

> return is id number

##### clear

```javascript
clearInterval(<timer name>)
```

#### delayed

##### open delayed

```javascript
let <timer name> =setTimeout(<function name>,<time(ms)>)
```

clear

```javascript
clearTimeout(<timer name>)
```

### this object

```javascript
this
```

> when a function is passed to another function call

#### Change direction

1. call

    > Call a function and change this to point to
    >

    ```javascript
    <function>.call(<thisArg>,<arg1>,<arg2>,...)
    ```

    * thisArg：The specified 'this' points to
    * arg1,arg2：Transferred parameters
2. apply

    > Call a function and change this to point to
    >

    ```javascript
    <function>.apply(<thisArg>,[<argsArray>])
    ```

    * thisArg：The specified 'this' points to
    * `<argsArray>`：The parameters passed must be included in the array
3. bind

    > Will not call a function but will change it to point to
    >

    ```javascript
    <function>.bind(<thisArg>,<arg1>,<arg2>,...)
    ```

    * thisArg：The specified 'this' points to
    * arg1,arg2：Transferred parameters
    * return：Pointing function

### callback function

> representing the current environment, who is clling it

### get site and size

```javascript
<DOM>.getBoundingClientRect()
```

### windows

```mindmap
- windows
    - navigator
    - loctation
    - document
    - history
    - screen
```

### location

```javascript
location
```

> saved various parts of the url

#### attribute

* href：full url
* search：？The latter part
* hash：#The latter part

#### function

* reload(`<parameter>`)

  true：force flush

### navigator

```javascript
navigator
```

> browser related information

### history

```javascript
history
```

> history and address bar operations

#### history function

* forward
* back
* go(`<number>`)：positive number forward,negative number backward

### storage

#### localstorage

```javascript
localStorage
```

> 1. permanently stored locally in the form of key value pairs
> 2. multiple pages can be shared

##### save

```javascript
localStorage.setItem("<key>","<value>")
```

##### get

```javascript
localStorage,getItem("<key>")
```

##### revise

```javascript
localStorage.setItem("<key>")
```

##### strore complex data types

```javascript
JSON.tsringify(<complex data>)
```

> convert complex data types to json for storage

###### reverce

```javascript
JSON.parse(<JSON string>)
```

### sessionstorage

> 1. The lifecycle to close tthe browser
> 2. the same page can be shared
>
> other are the same as localstorage

#### get all keys

```javascript
Object.keys(<object name>)
```

> Returned is an array

#### get all values

```javascript
Object.values(<object name>)
```

> Returned is an array

#### add object

```javascript
Object.assign(<new>,<old>)
```
