# BCE-CLI

一个上传文件或文件夹到bos的命令行工具。

[![npm](https://img.shields.io/npm/v/bce-cli.svg)](https://www.npmjs.com/package/bce-cli)

## 安装

```shell
npm i bce-cli -g
```

## 示例

```shell
bce-cli putfolder ./folder-test -p 20191221t -e jpg -c no-cache -of
```

![QvRbNQ.png](https://s2.ax1x.com/2019/12/21/QvRbNQ.png)

## 使用

```shell
Usage: bce [options] [command]

Options:
  -V, --version              output the version number
  -h, --help                 output usage information

Commands:
  ls                         list all the buckets
  show <name>                show detail of the bucket
  add                        add bucket info
  use <name>                 change bucket
  remove <bucket>            delete bucket
  put [options] <file>       put file to bos
  putfolder [options] <dir>  put folder to bos
```

## 上传指令说明

|    指令       |     备注                       |
|---------------|-------------------------------|
| `bucket`   | 选择bucket，默认使用全局             |
| `prefix`   | 路径前缀                           |
| `limit`    | 并发上传数量，用于上传多个文件         |
| `ext`      | 指定上传后缀名，用于上传文件夹         |
| `flat`     | 上传文件平铺，默认保留文件夹层级关系    |
| `cache`    | 控制缓存，cache-control             |
| `md5`      | 对文件名进行MD5处理                  |
| `override` | 强制覆盖线上文件                     |
