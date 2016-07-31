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
            /**
             * コンストラクタ
             * @param context AudioContext
             */
            constructor(context:AudioContext) {
                this.context = context;
                this.gainNode = context.createGain();
                this.startPos = 0;
                this.isStartPlaying = true;
                this.pts = 0;
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
                    this.startPos = this.context.currentTime;
                }
                bufferNode.start(this.startPos + this.pts);
                this.pts += buffer.length / buffer.sampleRate;
            }
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
                var bufferNode:AudioBufferSourceNode = this.context.createBufferSource();
                var appendBuffer:AudioBuffer = this.context.createBuffer(
                    channelNum,
                    length,
                    sampleRate);
                for(var i = 0;i < channelNum;++ i) {
                    var dest:Float32Array = appendBuffer.getChannelData(i);
                    for(var j = 0;j < length;++ j) {
                        dest[j] = pcm[channelNum * i + j] / 32767;
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
                console.log(this.startPos + this.pts);
                bufferNode.start(this.startPos + this.pts);
//                bufferNode.start(0); // こっちにすると即再生される ただし音がおかしくなる。
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