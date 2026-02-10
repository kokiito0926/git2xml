## git2xml

git2xmlは、Gitのリポジトリ内のファイルをXML形式でまとめることができるコマンドラインのツールです。  
ローカルにファイルを展開せずに、リポジトリを一つのファイルとして抽出できるため、大規模言語モデルのプロンプトに最適です。

## インストール

```bash
$ npm install --global @kokiito0926/git2xml
```

## 使用方法

GitのリポジトリのURLを指定して、コマンドを実行します。

```bash
$ git2xml https://github.com/kokiito0926/git2xml.git
```

--patternsのオプションを用いると、特定のファイルのみを含めることができます。

```bash
$ git2xml https://github.com/kokiito0926/git2xml.git --patterns "**/*.js"
```

--ignoreのオプションを用いると、特定のファイルを除外することができます。

```bash
$ git2xml https://github.com/kokiito0926/git2xml.git --ignore ./package-lock.json 
```

## ライセンス

[MIT](LICENSE)
