/// <reference path="ttLibjs.ts" />
/// <reference path="../../typings/index.d.ts" />

$(function() {
    console.log("ok");
    $("#start").on("click", () => {
        console.log("クリックされた。");
/*
// bufferPlayerによるbeep音再生テスト
        var context:AudioContext = new AudioContext();
        var beep:tt.BeepGenerator = new tt.BeepGenerator(440, 44100, 1);
        var player:tt.BufferPlayer = new tt.BufferPlayer(context);
        var playerNode:AudioNode = player.refNode();
        playerNode.connect(context.destination);
        var pcm:Int16Array = beep.makeBeepBySampleNum(240000);
        player.queueInt16Array(pcm, pcm.length, 44100, 1);
        */
/*
// scriptPlayerによるbeep音再生テスト
        var context:AudioContext = new AudioContext();
        var beep:tt.BeepGenerator = new tt.BeepGenerator(480, 44100, 1);
        var player:tt.ScriptPlayer = new tt.ScriptPlayer(context, 1);
        var playerNode:AudioNode = player.refNode();
        playerNode.connect(context.destination);
        var pcm:Int16Array = beep.makeBeepByMilisec(5000);
        player.queueInt16Array(pcm, false);
        */

// sceneCapture と sceneDrawerの動作テスト
        navigator.getUserMedia({
            audio:false,
            video:true
        },
        (stream:MediaStream) => {
            var original:HTMLVideoElement = <HTMLVideoElement>document.getElementById('original');
            original.src = URL.createObjectURL(stream);
            original.play();
            var display:HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('display');
            var capture:tt.SceneCapture = new tt.SceneCapture(320, 240);
            var drawer:tt.SceneDrawer = new tt.SceneDrawer(display);
            var yuv:Uint8Array = new Uint8Array(320 * 240 * 3 / 2);
            var wh:number = 320 * 240;
            (function() {
                capture.drain(original, yuv);
                drawer.draw(
                    yuv.subarray(0, wh), 320,
                    yuv.subarray(wh, wh + (wh >> 2)), 160,
                    yuv.subarray(wh + (wh >> 2), wh + (wh >> 1)), 160);
                requestAnimationFrame(<FrameRequestCallback>arguments.callee);
            })();
        },
        (error:MediaStreamError) => {
            console.log("error");
        });
    });
});
