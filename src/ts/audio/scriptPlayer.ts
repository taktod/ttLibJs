/// <reference path="myAudioBuffer.ts" />

namespace ttLibJs {
    export namespace audio {
        /**
         * ScriptProcessorNodeによる音声の再生動作
         * こっちはリアルタイムな処理したりできる。と思う
         */
        export class ScriptPlayer {
            private processorNode:ScriptProcessorNode;
            private channelNum:number;
            private totalHoldSampleNum:number;
            private holdAudioBuffers:Array<AudioBuffer>;
            private holdPcm16Buffers:Array<Int16Array>;
            private usingAudioBuffer:AudioBuffer;
            private usingPcm16Buffer:Int16Array;
            private usingBufferPos:number;
            public isStart:boolean;
            /**
             * コンストラクタ
             * @param context 動作対象AudioContext
             * @param channelNum 動作チャンネル数 1:モノラル 2:ステレオ
             */
            constructor(
                    context:AudioContext,
                    channelNum:number) {
                this.processorNode = context.createScriptProcessor(
                    1024, // iOSの場合はここにデータを設置しないとエラーになった。iOS8での話
                    channelNum,
                    channelNum);
                this.processorNode.onaudioprocess = (ev:AudioProcessingEvent) => {
                    this._onaudioprocess(ev);
                };
                this.isStart = false;
                this.holdAudioBuffers = null;
                this.holdPcm16Buffers = [];
                this.totalHoldSampleNum = 0;
                this.channelNum = channelNum;
                this.usingAudioBuffer = null;
                this.usingPcm16Buffer = null;
                this.usingBufferPos = 0;
            }
            /**
             * AudioNode参照
             * @return AudioNode
             */
            public refNode():AudioNode {
                return this.processorNode;
            }
            /**
             * bufferを再生queueにいれる。
             * @param buffer 再生させたいaudioBuffer
             * @param nonCopyMode trueなら入力bufferをそのまま使う falseならデータをコピーして使う。
             */
            public queueBufer(
                    buffer:AudioBuffer,
                    nonCopyMode:boolean):void {
                if(this.processorNode == null) {
                    return;
                }
                if(buffer.numberOfChannels != this.channelNum) {
                    console.log("channel数がかわったbufferが追加されています。");
                    return;
                }
                if(this.holdAudioBuffers == null) {
                    this.holdAudioBuffers   = [];
                    this.holdPcm16Buffers   = null;
                    this.totalHoldSampleNum = 0;
                    this.usingAudioBuffer   = null;
                    this.usingPcm16Buffer   = null;
                    this.usingBufferPos     = 0;
                }
                this.totalHoldSampleNum += buffer.getChannelData(0).length;
                if(nonCopyMode) {
                    this.holdAudioBuffers.push(buffer);
                }
                else {
                    // bufferのコピーをつくるわけだが、bufferはコピーできないので、Float32Arrayを保持するbufferをつくろうと思う。
                    this.holdAudioBuffers.push(new ttLibJs.audio.MyAudioBufer(buffer));
                }
            }
            /**
             * int16Arrayのpcmを再生queueにいれる。
             * @param pcm         pcmデータ
             * @param nonCopyMode データをコピーするかどうかフラグ
             */
            public queueInt16Array(
                    pcm:Int16Array,
                    nonCopyMode:boolean):void {
                // ここで追加されている
                if(this.processorNode == null) {
                    return;
                }
                if(this.holdPcm16Buffers == null) {
                    this.holdAudioBuffers   = null;
                    this.holdPcm16Buffers   = [];
                    this.totalHoldSampleNum = 0;
                    this.usingAudioBuffer   = null;
                    this.usingPcm16Buffer   = null;
                    this.usingBufferPos     = 0;
                }
                this.totalHoldSampleNum += pcm.length / this.channelNum;
                if(nonCopyMode) {
                    this.holdPcm16Buffers.push(pcm);
                }
                else {
                    this.holdPcm16Buffers.push(new Int16Array(pcm));
                }
            }
            private _onaudioprocess(ev:AudioProcessingEvent) {
                if(this.isStart || this.holdPcm16Buffers.length > 50) {
                    this.isStart = true;
                    var outputBuffer:AudioBuffer = ev.outputBuffer;
                    if(outputBuffer.getChannelData(0).length > this.totalHoldSampleNum) {
                        // ここ、コピーしておかないと、よくわからない音がでる懸念がある
                        // 基本ラストデータのゴミがはいっている。
                        for(var i = 0;i < outputBuffer.numberOfChannels;++ i) {
                            var ary:Float32Array = outputBuffer.getChannelData(i);
                            ary.set(new Float32Array(ary.length));
                        }
                        return;
                    }
                    if(this.holdAudioBuffers != null) {
                        this._onBufferProcess(outputBuffer);
                    }
                    else if(this.holdPcm16Buffers != null) {
                        this._onPcm16Process(outputBuffer);
                    }
                }
            }
            private _onBufferProcess(outputBuffer:AudioBuffer):void {
                var targetPos:number = 0;
                do {
                    if(this.usingAudioBuffer == null) {
                        this.usingAudioBuffer = this.holdAudioBuffers.shift();
                        this.usingBufferPos = 0;
                        if(this.usingAudioBuffer == null) {
                            return;
                        }
                    }
                    var targetSize:number = outputBuffer.getChannelData(0).length - targetPos;
                    var holdSize:number = this.usingAudioBuffer.getChannelData(0).length - this.usingBufferPos;
                    var appendSize:number = (targetSize < holdSize) ? targetSize : holdSize;
                    // 利用するbufferにはいっているデータとoutputBufferに書き込み実施すべきデータ量を比較する必要がある。
                    // データをコピーしていく。
                    for(var i = 0;i < outputBuffer.numberOfChannels;++ i) {
                        var destAry:Float32Array = outputBuffer.getChannelData(i);
                        var srcAry:Float32Array = this.usingAudioBuffer.getChannelData(i);
                        destAry.set(srcAry.subarray(this.usingBufferPos, this.usingBufferPos + appendSize), targetPos);
                    }
                    // コピーおわったらフラグを移動する。
                    this.usingBufferPos += appendSize;
                    targetPos += appendSize;
                    this.totalHoldSampleNum -= appendSize;
                    if(this.usingBufferPos == this.usingAudioBuffer.getChannelData(0).length) {
                        // usingBufferの中身を利用しおわった。
                        this.usingAudioBuffer = null;
                    }
                } while(targetPos < outputBuffer.getChannelData(0).length);
            }
            private _onPcm16Process(outputBuffer:AudioBuffer):void {
                var targetPos:number = 0;
                do {
                    if(this.usingPcm16Buffer == null) {
                        this.usingPcm16Buffer = this.holdPcm16Buffers.shift();
                        this.usingBufferPos = 0;
                        if(this.usingPcm16Buffer == null) {
                            return;
                        }
                    }
                    var targetSize:number = outputBuffer.getChannelData(0).length - targetPos;
                    var holdSize:number = this.usingPcm16Buffer.length / this.channelNum - this.usingBufferPos;
                    var appendSize:number = (targetSize < holdSize) ? targetSize : holdSize;
                    // 利用するbufferにはいっているデータとoutputBufferに書き込み実施すべきデータ量を比較する必要がある。
                    // データをコピーしていく。
                    for(var i = 0;i < outputBuffer.numberOfChannels;++ i) {
                        var destAry:Float32Array = outputBuffer.getChannelData(i);
                        var srcAry:Int16Array = this.usingPcm16Buffer;
                        // usingBufferPos以降にあるデータをappendSize分コピーする。
                        // コピー先はtargetPosから導き出す。
                        for(var j = 0;j < appendSize;++ j) {
                            destAry[targetPos + j] = srcAry[this.channelNum * (this.usingBufferPos + j) + i] / 32767;
                        }
                    }
                    // コピーおわったらフラグを移動する。
                    this.usingBufferPos += appendSize;
                    targetPos += appendSize;
                    this.totalHoldSampleNum -= appendSize;
                    if(this.usingBufferPos == this.usingPcm16Buffer.length / this.channelNum) {
                        // usingBufferの中身を利用しおわった。
                        this.usingPcm16Buffer = null;
                    }
                } while(targetPos < outputBuffer.getChannelData(0).length);
            }
            /**
             * 後始末
             */
            public close():void {
                // 終了処理
                // とりあえずdisconnectしとく。
                this.processorNode.disconnect();
                this.processorNode = null;
            }
        }
    }
}