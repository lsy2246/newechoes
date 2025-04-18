---
title: pymssql
date: 2024-06-06T23:51:35Z
tags: []
---

```python
import pymssql
```

### 建立连接

```python
conn = pymssql.connect(server='server_name', user='username', password='password', database='database_name', port=port_number)
```

### 创建游标

```python
cursor = conn.cursor()
```

### 执行查询

```python
cursor.execute('SELECT * FROM table_name')
```

### 获取结果

获取一行结果

```python
row = cursor.fetchone()
```

获取所有结果

```python
rows = cursor.fetchall()
```

### 提交更改

```python
conn.commit()
```

### 关闭连接

```python
conn.close()
```
