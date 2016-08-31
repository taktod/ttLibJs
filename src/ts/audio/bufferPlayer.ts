/// <reference path="myAudioBuffer.ts" />

namespace ttLibJs {
    export namespace audio {
        /**
         * audioBufferを大量に再生にまわすことで動作するプレーヤー
         * nativeの処理に任せる部分が大きいので処理軽いか？
         * なお内部で自動的にリサンプルしてくれるところもグッド
         */
        export class BufferPlayer {
            private context:AudioContext;
            private gainNode:GainNode;
            private startPos:number;
            private isStartPlaying:boolean;
            private pts:number;
            private holdPcm16Buffers:Array<Int16Array>;
            private holdAudioBuffers:Array<Int16Array>;
            private channelNum:number;
            private sampleRate:number;
            /**
             * コンストラクタ
             * @param context AudioContext
             */
            constructor(
                    context:AudioContext,
                    sampleRate:number,
                    channelNum:number) {
                this.context = context;
                this.gainNode = context.createGain();
                this.startPos = 0;
                this.isStartPlaying = true;
                this.pts = 0;
                this.holdAudioBuffers = null;
                this.holdPcm16Buffers = null;
                this.sampleRate = sampleRate;
                this.channelNum = channelNum;
                setInterval(() => {
                    while(this.processPlay()) {
                        ;
                    }
                }, 1000);
            }
            /**
             * 動作nodeを参照します。
             * @return AudioContext
             */
            public refNode():AudioNode {
                return this.gainNode;
            }
            /**
             * AudioBufferを再生queueにまわします。
             * @param buffer      再生するbuffer
             * @param nonCopyMode bufferをそのまま利用するかあらたにcreateBufferするかの指定
             */
            public queueBuffer(
                    buffer:AudioBuffer,
                    nonCopyMode:boolean):void {
                if(this.context == null) {
                    return;
                }
                var bufferNode:AudioBufferSourceNode = this.context.createBufferSource();
                if(!nonCopyMode) {
                    var appendBuffer:AudioBuffer = this.context.createBuffer(buffer.numberOfChannels, buffer.length + 500, buffer.sampleRate);
                    for(var i = 0;i < buffer.numberOfChannels;++ i) {
                        var dest:Float32Array = appendBuffer.getChannelData(i);
                        var src:Float32Array = buffer.getChannelData(i);
                        dest.set(src);
                    }
                    bufferNode.buffer = appendBuffer;
                }
                else {
                    bufferNode.buffer = buffer;
                }
                bufferNode.connect(this.gainNode);
                if(this.isStartPlaying) {
                    this.isStartPlaying = false;
                    this.startPos = this.context.currentTime;
                }
                if(this.startPos + this.pts < this.context.currentTime) {
                    this.startPos = this.context.currentTime - this.pts;
                }
                bufferNode.start(this.startPos + this.pts);
                this.pts += buffer.length / buffer.sampleRate;
            }
            public queueInt16Array2(
                    pcm:Int16Array,
                    nonCopyMode:boolean):void {
                if(this.context == null) {
                    return;
                }
                if(this.holdPcm16Buffers == null) {
                    this.holdAudioBuffers = null;
                    this.holdPcm16Buffers = [];
                }
                if(nonCopyMode) {
                    this.holdPcm16Buffers.push(pcm);
                }
                else {
                    this.holdPcm16Buffers.push(new Int16Array(pcm));
                }
                while(this.processPlay()) {
                    ;
                }
            }
            private processPlay():boolean {
                // データの再生を実施します。
                // 全部のデータをBuffer化してしまうと、データが多くなりすぎてきちんと動作できなくなることがある模様。
                // よってすぐに再生でないデータは、pcmのまま保持しておかなければならない。
                if(this.pts / this.sampleRate > this.context.currentTime + 5) {
                    return false;
                }
                if(this.holdPcm16Buffers == null) {
                    // 必要なデータがなくて処理できない。
                    return false;
                }
                var pcm:Int16Array = this.holdPcm16Buffers.shift();
                if(pcm == null) {
                    return false;
                }
                var length:number = pcm.length / this.channelNum;
                // コピーして保持しておくか、そのまま保持するかは重要なところ・・・
                var bufferNode:AudioBufferSourceNode = this.context.createBufferSource();
                // ここ・・・・lengthに+αつけておかないと、無音分追加されないのでは？
                var appendBuffer:AudioBuffer = this.context.createBuffer(
                    this.channelNum,
                    length + 500,
                    this.sampleRate);
                for(var i = 0;i < this.channelNum;++ i) {
                    var dest:Float32Array = appendBuffer.getChannelData(i);
                    for(var j = 0;j < length;++ j) {
                        dest[j] = pcm[i + this.channelNum * j] / 32767;
                    }
                }
                bufferNode.buffer = appendBuffer;
                bufferNode.connect(this.gainNode);
                if(this.isStartPlaying) {
                    this.isStartPlaying = false;
                    this.startPos = this.context.currentTime;
                }
                if(this.startPos + this.pts / this.sampleRate < this.context.currentTime) {
                    // currentTimeより進み過ぎてしまった場合は、無音分startTimeを進ませておかないとこまったことになる。
                    this.startPos = this.context.currentTime - this.pts / this.sampleRate;
                }
                bufferNode.start(this.startPos + this.pts / this.sampleRate);
                this.pts += length; // 追加したpts分
                return true;
            }

            // あとはtimerの動作で必要に応じてデータをAudioBuffer化していきます。
            /**
             * int16Arrayのpcmデータを再生にまわします。
             * @param pcm        再生するpcm
             * @param length     pcmのサンプル数
             * @param sampleRate サンプルレート
             * @param channelNum チャンネル数
             */
            public queueInt16Array(
                    pcm:Int16Array,
                    length:number,
                    sampleRate:number,
                    channelNum:number):void {
                if(this.context == null) {
                    return;
                }
                // 全部のデータをBuffer化してしまうと、データが多くなりすぎてきちんと動作できなくなることがある模様。
                // よってすぐに再生でないデータは、pcmのまま保持しておかなければならない。
                // コピーして保持しておくか、そのまま保持するかは重要なところ・・・
                var bufferNode:AudioBufferSourceNode = this.context.createBufferSource();
                // ここ・・・・lengthに+αつけておかないと、無音分追加されないのでは？
                var appendBuffer:AudioBuffer = this.context.createBuffer(
                    channelNum,
                    length,
                    sampleRate);
                for(var i = 0;i < channelNum;++ i) {
                    var dest:Float32Array = appendBuffer.getChannelData(i);
                    for(var j = 0;j < length;++ j) {
                        dest[j] = pcm[i + channelNum * j] / 32767;
                    }
                }
                bufferNode.buffer = appendBuffer;
                bufferNode.connect(this.gainNode);
                if(this.isStartPlaying) {
                    this.isStartPlaying = false;
                    this.startPos = this.context.currentTime;
                }
                if(this.startPos + this.pts < this.context.currentTime) {
                    // currentTimeより進み過ぎてしまった場合は、無音分startTimeを進ませておかないとこまったことになる。
                    this.startPos = this.context.currentTime - this.pts;
                }
                bufferNode.start(this.startPos + this.pts);
                this.pts += length / sampleRate; // 追加したpts分
            }
            /**
             * 閉じる
             */
            public close():void {
                if(this.context == null) {
                    return;
                }
                this.gainNode.disconnect();
                this.gainNode = null;
                this.context = null;
            }
        }
    }
}