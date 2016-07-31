namespace ttLibJs {
    export namespace audio {
        /**
         * 自作したAudioBufferを新規につくるための動作
         * まぁ型が合うだけである。
         */
        export class MyAudioBufer implements AudioBuffer {
            duration:number;
            length:number;
            numberOfChannels:number;
            sampleRate:number;
            private channelData:Array<Float32Array>;
            /**
             * コンストラクタ
             * @param buffer コピーする元ネタ
             */
            constructor(buffer:AudioBuffer) {
                this.duration = buffer.duration;
                this.length = buffer.length;
                this.numberOfChannels = buffer.numberOfChannels;
                this.sampleRate = buffer.sampleRate;
                this.channelData = [];
                for(var i = 0;i < this.numberOfChannels;++ i) {
                    this.channelData[i] = new Float32Array(buffer.getChannelData(i));
                }
            }
            /**
             * channelDataを参照する
             */
            public getChannelData(track:number):Float32Array {
                return this.channelData[track];
            }
        }
    }
}