---
title: SE6
date: 2024-09-19T10:31:39Z
tags: []
---

### object

#### closure

closure=inner function+external function variable

```javascript
function f1() {
    let i=0
    function f2() {
        i++
        console.log(i)
    }
    return f2
}
const f=f1()
```

#### construct object

```javascript
function Pig(name,age,gender){
    this.name = name
    this.age = age
    this.gender = gender
    }
const pappe = new Pig('佩奇',6,'女')
```

Instance members: methods and properties on property objects

Static members: static properties and methods

##### convention

1. can only start with a capital letter
2. can only be executed using the 'new' operator

##### prototype

```javascript
function Pig(name,age){
    this.name = name
    this.age = age
    }
Pig.prototype.sing=function(){}
const pappe = new Pig('佩奇',6)
```

1. each cpmstructor has a prototype property
2. This object mounting function will not create functions on the prototype multiple times during object instantiation, saving memory

##### constructor

1. Refers back to the constructor created

##### object prototype

​`__proto__`​ =`[[proto]]`​

##### inherit

```javascript
function Person(){
        this.gender=1
}
function A(uname,age){
       this.uname = uname;
       this.age = age;
}
A.prototype=new Person()
A.prototype.constructor=A
```

##### Prototype Chain

Inheritance based on prototype objects associates different constructor objects together

##### instanceof

You can use `instanceof`​ to check if the prototype property of the constructor appears on the prototype chain of an instance object

### function

#### parmeter

* dynamics parmeter

  ```javascript
  arguments
  ```

  > The paseudo array includes all the parameters passed in
  >
* remaining parameters

  ```javascript
  function f(...<parameter name>){
      <parameter name> //array
  }
  ```

#### Arrow function

```javascript
const <function name> = () =>{}
```

##### rule

1. If the function has only one line, it can be written on one line, {} can be omitted, and there is no need to write a return to have a return value. If the return dictionary needs to be written, () needs to be added
2. if there is only parameter,()can beomitted

##### this

the arrow function does not have this,it wil only use this from the higer-level scope chain

#### deconstruction

```javascript
{name:newname,age:newage}={name:lsy;age:19}
```

1. The variable names for deconstruction need to be consistent with those in the object
2. Rename: The previous name is the opposite name, followed by the new name that needs to be changed. If not changed, do not use write

##### multistage

```javascript
obj={
    a:1
    b:{
        b1:2
        b2:3
        }
    c:4
}
{a,b:{b1,b2},c}=obj
```

### array

#### Expand operator

```javascript
...<array>
```

#### deconstruction array

```javascript
[a,b]=[1,2]
```

1. Assign the variables on the left to the variables on the right in sequence
2. Support multidimensional arrays

### copy

#### shallow copy

If it is a complex data type, only copy the address

1. object

    ```javascript
    Object.assign(<new>,<old>)
    ```

2. array

    ```javascript
    Array.prototype.concat()
    ```

#### deep copy

1. recursion
2. json
3. Library functions

### performance optimization

||explain|
| ----------| --------------------------------------------------------------------------------|
|debounce|Frequent triggering of events within a unit time, only executing the last time|
|throttle|Frequent triggering of events per unit time, only executed once|
