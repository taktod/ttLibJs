declare namespace ttLibJs {
    namespace audio {
        /**
         * pcmのbeepデータを作る
         */
        class BeepGenerator {
            private pos;
            private targetHz;
            private sampleRate;
            private channelNum;
            amplitude: number;
            /**
             * コンストラクタ
             * @param targetHz   再生音の周波数 440がラの音
             * @param sampleRate 動作サンプルレート
             * @param channelNum 動作チャンネル数 1:モノラル 2:ステレオ
             */
            constructor(targetHz: number, sampleRate: number, channelNum: number);
            /**
             * 指定ミリ秒のデータを生成する。
             * @param duration ミリ秒
             * @return 作成pcmデータ
             */
            makeBeepByMilisec(duration: number): Int16Array;
            /**
             * 指定サンプル数のデータを生成する
             * @param sampleNum サンプル数
             * @return 作成pcmデータ
             */
            makeBeepBySampleNum(sampleNum: number): Int16Array;
            /**
             * 閉じる
             */
            close(): void;
        }
    }
}

declare namespace ttLibJs {
    namespace audio {
        /**
         * 自作したAudioBufferを新規につくるための動作
         * まぁ型が合うだけである。
         */
        class MyAudioBufer implements AudioBuffer {
            duration: number;
            length: number;
            numberOfChannels: number;
            sampleRate: number;
            private channelData;
            /**
             * コンストラクタ
             * @param buffer コピーする元ネタ
             */
            constructor(buffer: AudioBuffer);
            /**
             * channelDataを参照する
             */
            getChannelData(track: number): Float32Array;
        }
    }
}

/// <reference path="myAudioBuffer.d.ts" />
declare namespace ttLibJs {
    namespace audio {
        /**
         * audioBufferを大量に再生にまわすことで動作するプレーヤー
         * nativeの処理に任せる部分が大きいので処理軽いか？
         * なお内部で自動的にリサンプルしてくれるところもグッド
         */
        class BufferPlayer {
            private context;
            private gainNode;
            private startPos;
            private isStartPlaying;
            private pts;
            private holdPcm16Buffers;
            private holdAudioBuffers;
            private channelNum;
            private sampleRate;
            /**
             * コンストラクタ
             * @param context AudioContext
             */
            constructor(context: AudioContext, sampleRate: number, channelNum: number);
            /**
             * 動作nodeを参照します。
             * @return AudioContext
             */
            refNode(): AudioNode;
            /**
             * 内部動作の開始位置を参照します。
             */
            refStartPos(): number;
            /**
             * AudioBufferを再生queueにまわします。
             * @param buffer      再生するbuffer
             * @param nonCopyMode bufferをそのまま利用するかあらたにcreateBufferするかの指定
             */
            queueBuffer(buffer: AudioBuffer, nonCopyMode: boolean): void;
            queueInt16Array2(pcm: Int16Array, nonCopyMode: boolean): void;
            private processPlay();
            /**
             * int16Arrayのpcmデータを再生にまわします。
             * @param pcm        再生するpcm
             * @param length     pcmのサンプル数
             * @param sampleRate サンプルレート
             * @param channelNum チャンネル数
             */
            queueInt16Array(pcm: Int16Array, length: number, sampleRate: number, channelNum: number): void;
            /**
             * 閉じる
             */
            close(): void;
        }
    }
}

/// <reference path="myAudioBuffer.d.ts" />
declare namespace ttLibJs {
    namespace audio {
        /**
         * ScriptProcessorNodeによる音声の再生動作
         * こっちはリアルタイムな処理したりできる。と思う
         */
        class ScriptPlayer {
            private processorNode;
            private channelNum;
            private totalHoldSampleNum;
            private holdAudioBuffers;
            private holdPcm16Buffers;
            private usingAudioBuffer;
            private usingPcm16Buffer;
            private usingBufferPos;
            isStart: boolean;
            /**
             * コンストラクタ
             * @param context 動作対象AudioContext
             * @param channelNum 動作チャンネル数 1:モノラル 2:ステレオ
             */
            constructor(context: AudioContext, channelNum: number);
            /**
             * AudioNode参照
             * @return AudioNode
             */
            refNode(): AudioNode;
            /**
             * bufferを再生queueにいれる。
             * @param buffer 再生させたいaudioBuffer
             * @param nonCopyMode trueなら入力bufferをそのまま使う falseならデータをコピーして使う。
             */
            queueBufer(buffer: AudioBuffer, nonCopyMode: boolean): void;
            /**
             * int16Arrayのpcmを再生queueにいれる。
             * @param pcm         pcmデータ
             * @param nonCopyMode データをコピーするかどうかフラグ
             */
            queueInt16Array(pcm: Int16Array, nonCopyMode: boolean): void;
            private _onaudioprocess(ev);
            private _onBufferProcess(outputBuffer);
            private _onPcm16Process(outputBuffer);
            /**
             * 後始末
             */
            close(): void;
        }
    }
}

declare namespace ttLibJs {
    namespace video {
        /**
         * video処理用に利用するwebGL
         * この処理は公にしないので、適当にしとく。
         */
        class VideoGL {
            private canvas;
            private gl;
            private program;
            private mvMatrix;
            private vertex;
            private vertexBuffer;
            private uv;
            private uvBuffer;
            constructor(canvas: HTMLCanvasElement);
            setupShaderFromSource(vertSrc: string, fragSrc: string, pjName: string, pjMatrix: Float32Array): void;
            createTexture(textureId: number, id: WebGLTexture, data: any): WebGLTexture;
            createArrayTexture(textureId: number, id: WebGLTexture, data: Uint8Array, format: number, width: number, height: number): WebGLTexture;
            bindTexture(textureId: number, texture: WebGLTexture): void;
            drawArrays(): void;
            setVertex(vertex: Array<number>): void;
            setUv(uv: Array<number>): void;
            flush(): void;
            uniform1i(location: WebGLUniformLocation, val: number): void;
            uniform1f(location: WebGLUniformLocation, val: number): void;
            setMvMatrix(mvMatrix: Float32Array): void;
            useProgram(): void;
            updateVertexUv(posName: string, uvName: string): void;
            viewport(): void;
            updateMvMatrix(mvName: string): void;
            clear(): void;
            getUniformLocation(name: string): WebGLUniformLocation;
            refProgram(): WebGLProgram;
            refGl(): WebGLRenderingContext;
            private _createShaderFromSource(type, src);
            private _createProgram(vs, fs);
            static createMat4Ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Float32Array;
            static createMat4Identity(): Float32Array;
        }
    }
}

/// <reference path="videoGl.d.ts" />
declare namespace ttLibJs {
    namespace video {
        /**
         * videoで流れているデータをcaptureする。
         */
        class SceneCapture {
            private canvas;
            private width;
            private height;
            private sceneGl;
            private captureGl;
            private captureTexture;
            private videoTexture;
            /**
             * コンストラクタ
             * @param width  横サイズ
             * @param height 縦サイズ
             */
            constructor(width: number, height: number);
            /**
             * 描画データを取り出す。
             * @param source 映像ソース canvasかvideoタグ
             * @param target データ設置先yuv420のデータとしてデータが保持されます。
             */
            drain(source: any, target: Uint8Array): boolean;
            /**
             * 閉じます。
             */
            close(): void;
        }
    }
}

/// <reference path="videoGl.d.ts" />
declare namespace ttLibJs {
    namespace video {
        /**
         * yuvの動画データをcanvasに表示するdrawer
         * 最終的にはcanvasではなくvideoにも書き込みできる方がのぞましいだろう。
         */
        class SceneDrawer {
            private yuvGl;
            private yTexture;
            private uTexture;
            private vTexture;
            private width;
            private height;
            /**
             * コンストラクタ
             * @param target 描画対象canvasエレメント
             */
            constructor(target: HTMLCanvasElement);
            /**
             * 描画実施
             * @param y       y要素データ
             * @param yStride y要素データのstride値
             * @param u       u要素データ
             * @param uStride u要素データのstride値
             * @param v       v要素データ
             * @param vStride v要素データのstride値
             * @note 基本yuv420であることを期待します。
             * y要素の縦横サイズがwとhとすると
             * uとv要素の縦横サイズはw/2とh/2になる
             * ただし変換の都合上、データ保持量がちょうどwと同じにならないことがあるため
             * stride値を設定できるようにしました。
             * yStrideとwidth、u及びvStrideとwidth/2の比率は一定であるとしています。
             */
            draw(y: Uint8Array, yStride: number, u: Uint8Array, uStride: number, v: Uint8Array, vStride: number): void;
            /**
             * 閉じる
             */
            close(): void;
        }
    }
}

/// <reference path="audio/beepGenerator.d.ts" />
/// <reference path="audio/bufferPlayer.d.ts" />
/// <reference path="audio/scriptPlayer.d.ts" />
/// <reference path="video/sceneCapture.d.ts" />
/// <reference path="video/sceneDrawer.d.ts" />
declare namespace tt {
    export import BeepGenerator = ttLibJs.audio.BeepGenerator;
    export import BufferPlayer = ttLibJs.audio.BufferPlayer;
    export import ScriptPlayer = ttLibJs.audio.ScriptPlayer;
    export import SceneCapture = ttLibJs.video.SceneCapture;
    export import SceneDrawer = ttLibJs.video.SceneDrawer;
}
