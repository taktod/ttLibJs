var gulp = require('gulp');
// typescript扱う
var typescript = require('gulp-typescript');
// jsを結合しておく
var concat = require('gulp-concat');
// 削除するのに使う
var del = require('del');
// shellを実行する場合に必要。今回はいらないかな。
var exec = require('gulp-exec');
// エラーおきても止めない
var plumber = require('gulp-plumber');
// ブラウザで確認する
var browserSync = require('browser-sync').create();

// destの中身をクリアしておく。
gulp.task('clean:dest', function() {
    return del.sync(['dest/**/*']);
});

// ttLibJsを作る。
gulp.task('make:ttLibJs:compile', function() {
    var ts = gulp.src(['src/ts/**/*.ts', '!src/ts/app.ts']).pipe(plumber())
        .pipe(typescript({declaration:true, noExternalResolve:true}));
    return ts.js.pipe(concat('ttLibJs.js')).pipe(gulp.dest('./')).on('end', function() {
        return ts.dts.pipe(concat('index.d.ts')).pipe(gulp.dest('./'));
    });
});

gulp.task('make:ttLibJs', ['make:ttLibJs:compile'], function() {
    // compileおわってから呼ばれるので、copyしておく。
    return gulp.src('ttLibJs.js')
        .pipe(gulp.dest('dest/js/'));
});

// appを作る
gulp.task('make:app', function() {
    return gulp.src(['src/ts/app.ts']).pipe(plumber())
        .pipe(typescript()).js.pipe(gulp.dest('dest/js/'));
});

// htmlのコピー
gulp.task('copy:html', function() {
    return gulp.src('src/*.html')
        .pipe(gulp.dest('dest'));
});

// bowerのデータコピー
gulp.task('copy:bower', function() {
    return gulp.src(
            ['src/js/bower_components/**'],
            {base:'src/js'})
        .pipe(gulp.dest('dest/js'));
});

// ts,htmlが編集されたらタスクを再実行
gulp.task('watch', function(){
    gulp.watch(
        ['src/ts/**/*.ts', '!src/ts/app.ts'],
        ['make:ttLibJs']);
    gulp.watch(
        ['src/ts/app.ts'],
        ['make:app']); 
    gulp.watch(
        ['src/*.html'],
        ['copy:html']); 
});

gulp.task('default', [
    'clean:dest',
    'make:ttLibJs',
    'make:app',
    'copy:html',
    'copy:bower',
    'watch'
], function() {
    // 全部おわったらbrowserSyncを実施しておく
    browserSync.init({
        server: {
            baseDir: 'dest'
        },
        files: [
            'dest/*.html',
            'dest/**/*.js', 
        ]
    });
});