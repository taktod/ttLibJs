/// <reference path="ttLibjs.ts" />
/// <reference path="../../typings/index.d.ts" />

var player:any = null;

var decodeStack:any = [];

class AudioDecoder {
    constructor() {

    }
    public decode(data:Uint8Array):boolean {
        return true;
    }
}

$(function() {
    document.getElementById("start").addEventListener("click", () => {
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
/*
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
        });*/
//        console.log("aacのデータをAudioContextで再生してみたいと思う。ただし後ろに無音aacをつけてやる方向で・・・");

//alert("hogehoge");
/*
        console.log("開始します。");
        // とりあえず、scriptNodeによる再生動作
        var context:AudioContext = new AudioContext();
        player = new tt.ScriptPlayer(context, 2);
        var playerNode:AudioNode = player.refNode();
        var bufSrc = context.createBufferSource();
        bufSrc.start(0);
        bufSrc.connect(playerNode);
        playerNode.connect(context.destination);
        // webSocketでデータをもらう。
        var ws:WebSocket = new WebSocket("ws://192.168.11.8:8080/");
        ws.binaryType = "arraybuffer";
        ws.onmessage = (e:MessageEvent) => {
            var pcm:Int16Array = new Int16Array(e.data);
            player.queueInt16Array(pcm, false);
        };
        ws.onopen = (e) => {
            console.log("mp3デコードしたデータを取得します。");
            // サーバー側でdecodeして応答を取得
            ws.send("mp3decode");
        };
        // */
        // iOSの場合はこっちの方が安定して動作するのか・・・
        var context:AudioContext = new AudioContext();
        player = new tt.BufferPlayer(context, 44100, 2);
        var playerNode:AudioNode = player.refNode();
        var bufSrc = context.createBufferSource();
        bufSrc.start(0);
        bufSrc.connect(playerNode);
        playerNode.connect(context.destination);
        var ws:WebSocket = new WebSocket("ws://192.168.11.8:8080/");
        ws.binaryType = "arraybuffer";
        ws.onmessage = (e:MessageEvent) => {
            var pcm:Int16Array = new Int16Array(e.data);
            player.queueInt16Array2(pcm, true);
        };
        ws.onopen = (e) => {
            // サーバー側でdecodeして応答を取得
            ws.send("mp3decode");
        };// */
        /*
        var context:AudioContext = new AudioContext();
        player = new tt.BufferPlayer(context, 44100, 1);
        var playerNode:AudioNode = player.refNode();
        playerNode.connect(context.destination);
        var ws:WebSocket = new WebSocket("ws://localhost:8080/");
        ws.binaryType = "arraybuffer";
        var count = 0;
        ws.onmessage = (e:MessageEvent) => {
            count ++;
            if(count > 10) {
                ws.close();
            }
            console.log("データ受け取り");
            console.log(new Uint8Array(e.data));
            context.decodeAudioData(e.data, (buffer:AudioBuffer) => {
                console.log("decode完了");
                var pcm:Int16Array = new Int16Array(buffer.length);
                var pcmF32:Float32Array = buffer.getChannelData(0);
                for(var i = 0;i < buffer.length;++ i) {
                    pcm[i] = pcmF32[i] * 32767;
                }
                console.log(pcm);
                decodeStack.push(pcm);
                player.queueInt16Array2(pcm, true);
            }, () => {
                console.log("エラー発生");
            });
        };
        ws.onopen = (e) => {
            // サーバー側でdecodeして応答を取得
            ws.send("mp3");
        };// */
    });
});
