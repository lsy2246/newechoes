---
title: array
date: 2024-09-12T20:54:42Z
tags: []
---


#### map

> can traverse an array and return a new array

```javascript
<array>.map(function(element,index){
    element //array element
    index //array index
    return element + 10 //Can be modified
})
```

#### forEach

> can traverse an array,but cannit return

```javascript
<array>.forEach(function(element,index){
    element //array element
    index //array index
})
```

1. index optional

#### filter

> can traverse an array and return a new array

```javascript
<array>.filter(function(element,index){
    element //array element
    index //array index
    return element > 10 //Can be compared
})
```

#### reduce

> Return the cumulative processing result, used for summation

```javascript
<array>.reduce(function(prev,current){
    return prev + current
},<initial value>)
```

#### join

> convert an array to a string

```javascript
<array>.join(["split symbol"])
```

> if the split symbol is empty,it is comma separated
