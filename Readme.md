# タイトル

ttLibJs

# 作者

taktod <poepoemix@hotmail.com> https://twitter.com/taktod

# 内容

自分で使うjsのライブラリ
基本typescriptで描いてあります。

# 必要なもの

macでの場合

brewで必要なものいれればいいと思う。
```
$ brew install node
$ brew install automake
$ brew install cmake
$ brew install libtool
$ npm install -g gulp
$ npm install -g tsd
$ npm install -g tsc
$ npm install -g electron-prebuilt
$ npm install -g electron-packager
$ npm install -g bower
```

// 開発では、これらをいれた。
// 実際に利用もしくは拡張する側だったらtsd installで必要なものが入る。
tsd install jquery -sro
tsd install MediaStream -sro
tsd install es6-promise -sro

bower initしてから
bower install -S jqueryでjqueryいれた。
bower.jsonに記述がはいるので
利用側はbower installで話が終わる。

  739  npm install --save-dev browser-sync
  740  npm install --save-dev del
  741  npm install --save-dev gulp
  742  npm install --save-dev gulp-concat
  743  npm install --save-dev gulp-exec
  744  npm install --save-dev gulp-plumber
  745  npm install --save-dev gulp-typescript
これらはnpm installで話が終わる。

あとはgulpを準備しなければならない。
今回はemscriptenまわりの動作がまったくない話になるので
そのあたりは楽だな。

tsdが古いっぽいのでtypingsをつかってみたんだが・・・
// こっちのes6-promiseつかわないとmediaStreamが死ぬ
typings install dt~es6-promise --global --save
typings install dt~webrtc/mediastream --global --save
typings install dt~emscripten --global --save
typings install dt~jquery --global --save

とりあえずこれでいけるか？