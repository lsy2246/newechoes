---
title: Docker
date: 2024-07-02T13:04:06Z
tags: []
---


### 常见命令

* 创建运行容器

  ```docker
  docker run [options] IMAGE [command]
  ```

  * command

    * ​`-d`​：后台运行
    * ​`--name [name]`​：容器名称
    * ​`-p [host port]:[container port]`​：映射端口
    * ​`-v [/host/data]:[/container/data]`​：绑定挂载一个数据卷,如果数据卷不存在会自动创建
    * ​`-e [KEY]=[VALUE]`​：环境变量
    * ​`--network [my-network]`​：指定连接到一个网络
    * ​`[image]:[tag]`​：未指定版本时,默认是latest,代表最新版本
* 拉取镜像

  未指定版本时,默认是latest,代表最新版本

  ```docker
  docker pull [image]:[tag]
  ```

* 查看指定镜像

  不写镜像名查看所有镜像

  ```docker
  docker images [image]
  ```

* 删除指定镜像

  ```docker
  docker rmi [image]
  ```

* 保存镜像

  ```docker
  docker [options] sava [image:tag]
  ```

  * options

    * ​`-o [name]`​：文件保存文件名
* 加载镜像

  ```docker
  docker load [OPTIONS]
  ```

  * options

    * ​`-i [name]`​：镜像文件名
    * ​`-q`​：不输入提示内容
* 列出运行的容器

  ```docker
  docker ps [options]
  ```

  * options

    * ​`-a`​：列出包括未运行的容器
    * ​`-q`​：仅显示容器ID
* 停止容器

  ```docker
  docker stop [container]
  ```

* 启动容器

  ```docker
  docker start [container]
  ```

* 删除容器

  ```docker
  docker rm [container]
  ```

  * ​`-f`​：强制删除
* 查看容器详情

  ```docker
  docker inspect [container]
  ```

* 查看容器日志

  ```docker
  docker logs [options] [container]
  ```

  * ​`-f`​：跟随日志输出（实时显示日志）
* 在运行的容器中执行命令

  ```docker
  docker exec [OPTIONS] [container] [COMMAND]  [bash]
  ```

  * ​`-i`​：保持标准输入打开，即使没有连接。
  * ​`-t`​：分配一个伪终端
  * ​`-u`​：以指定用户的身份运行命令
  * ​`-d`​：在后台运行
  * ​`-e`​：设置环境变量

### 数据卷

* 创建数据卷

  ```docker
  docker volume create
  ```

* 查看所有数据卷

  ```docker
  docker volume ls
  ```

* 删除指定数据卷

  ```docker
  docker volume rm [volume]
  ```

* 查看某个数据卷的详细

  ```docker
  docker volume inspect 
  ```

* 清除数据卷

  ```docker
  docker volume prune
  ```

### Dockerfile

包含构建镜像需要执行的指令

* 指定基础镜像

  ```docker
  FROM [image:tag]
  ```

* 环境变量

  ```docker
  ENV [key] [value]
  ```

* 将本地文件拷贝到容器的指定目录

  ```docker
  COPY [/host/file] [/container/file]
  ```

* 执行容器中的shell命令

  一般执行安装过程

  ```docker
  RUN [command]
  ```

* 容器暴露的端口给连接的其他服务，但不会映射到宿主机

  ```docker
  EXPOSE [port]
  ```

* 镜像中应用的启动命令

  ```docker
  ENTRYPOINT [command]
  ```

### 网络

* 创建

  ```docker
  docker network create [NETWORK]
  ```

* 查看

  ```docker
  docker network ls
  ```

* 删除指定网络

  ```docker
  docker network rm [NETWORK]
  ```

* 清楚未使用网络

  ```docker
  docker network prune
  ```

* 使指定容器加入指定网络

  ```docker
  docker network connect [NETWORK] [CONTAINER]
  ```

* 使指定容器离开指定网络

  ```docker
  docker network disconnect [NETWORK] [CONTAINER]
  ```

* 查看网络详细信息

  ```docker
  docker network inspect [NETWORK]
  ```

### Docker compose

#### 常见关键字

* 指定 Docker Compose 文件的版本号

  ```docker-compose
  version: "3.8"
  ```

* 定义各个服务，每个服务可以有多个配置项。

  ```docker-compose
  services:
    [server1]:
      ...
    [server2]:
      ...
  ```

* 定义 Docker 网络，用于连接各个服务

  ```docker-compose
  networks:
      - [NETWORK]:
  ```

* 定义 Docker 卷,用于持久化数据或者与宿主机共享数据。

  ```docker-compose
  volumes:
      - ​[/host/data]:[/container/data]​
  ```

* 指定使用的镜像名称。

  ```docker-compose
  ​[image]:[tag]​
  ```

* 指定构建 Docker 镜像时的 Dockerfile 路径。

  ```docker-compose
  build: [path]
  ```

* 将容器内部端口映射到宿主机，使外部可以访问容器服务。

  ```docker-compose
  ports:
      - "​[host port]:[container port]​"
  ```

* 定义环境变量

  ```docker-compose
  environment:
      - [KEY]=[VALUE]
  ```

* 指定容器启动时执行的命令

  ```docker-compose
  command:
      - "[command]"
  ```

* 指定服务启动所依赖的其他服务，会等待依赖的服务启动完成后再启动

  ```docker-compose
  depends_on:
      - service
  ```

* 定义容器退出时的重启策略

  ```docker-compose
  restart [strategy]
  ```

  ​`no`​：不重启

  ​`always`​：总是重启
* 指定给容器的名称。它是一个唯一标识符

  ```docker-compose
  container_name: [my_container]
  ```

* 容器暴露的端口给连接的其他服务，但不会映射到宿主机

  ```docker-compose
  expose:
    - "[port]"
  ```

#### 常用命令

1. 启动容器应用

    ```bash
    docker-compose up
    ```

    * ​`-d`​：在后台启动服务。
    * ​`--build`​：构建服务，即使镜像已存在。
2. **停止容器应用**：

    ```docker-compose
    docker-compose down
    ```

    ​`-v`​：同时移除卷

    ​`--rmi`​：同时删除镜像

‍
