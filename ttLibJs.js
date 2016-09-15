var ttLibJs;
(function (ttLibJs) {
    var audio;
    (function (audio) {
        /**
         * pcmのbeepデータを作る
         */
        var BeepGenerator = (function () {
            /**
             * コンストラクタ
             * @param targetHz   再生音の周波数 440がラの音
             * @param sampleRate 動作サンプルレート
             * @param channelNum 動作チャンネル数 1:モノラル 2:ステレオ
             */
            function BeepGenerator(targetHz, sampleRate, channelNum) {
                this.targetHz = targetHz;
                this.sampleRate = sampleRate;
                this.channelNum = channelNum;
                this.pos = 0;
            }
            /**
             * 指定ミリ秒のデータを生成する。
             * @param duration ミリ秒
             * @return 作成pcmデータ
             */
            BeepGenerator.prototype.makeBeepByMilisec = function (duration) {
                // サンプル数を計算して、処理する。
                var targetSampleNum = Math.floor(duration * this.sampleRate / 1000);
                return this.makeBeepBySampleNum(targetSampleNum);
            };
            /**
             * 指定サンプル数のデータを生成する
             * @param sampleNum サンプル数
             * @return 作成pcmデータ
             */
            BeepGenerator.prototype.makeBeepBySampleNum = function (sampleNum) {
                if (this.amplitude > 32767) {
                    this.amplitude = 32767;
                }
                else if (this.amplitude < -32767) {
                    this.amplitude = -32767;
                }
                var pcm = new Int16Array(sampleNum * this.channelNum);
                for (var i = 0; i < sampleNum; ++i) {
                    var data = Math.sin((i + this.pos) * 3.141592654 * 2 * this.targetHz / this.sampleRate) * 32767;
                    for (var j = 0; j < this.channelNum; ++j) {
                        pcm[this.channelNum * i + j] = data;
                    }
                }
                this.pos += sampleNum;
                return pcm;
            };
            /**
             * 閉じる
             */
            BeepGenerator.prototype.close = function () {
                // 終了処理
            };
            return BeepGenerator;
        }());
        audio.BeepGenerator = BeepGenerator;
    })(audio = ttLibJs.audio || (ttLibJs.audio = {}));
})(ttLibJs || (ttLibJs = {}));

var ttLibJs;
(function (ttLibJs) {
    var audio;
    (function (audio) {
        /**
         * 自作したAudioBufferを新規につくるための動作
         * まぁ型が合うだけである。
         */
        var MyAudioBufer = (function () {
            /**
             * コンストラクタ
             * @param buffer コピーする元ネタ
             */
            function MyAudioBufer(buffer) {
                this.duration = buffer.duration;
                this.length = buffer.length;
                this.numberOfChannels = buffer.numberOfChannels;
                this.sampleRate = buffer.sampleRate;
                this.channelData = [];
                for (var i = 0; i < this.numberOfChannels; ++i) {
                    this.channelData[i] = new Float32Array(buffer.getChannelData(i));
                }
            }
            /**
             * channelDataを参照する
             */
            MyAudioBufer.prototype.getChannelData = function (track) {
                return this.channelData[track];
            };
            return MyAudioBufer;
        }());
        audio.MyAudioBufer = MyAudioBufer;
    })(audio = ttLibJs.audio || (ttLibJs.audio = {}));
})(ttLibJs || (ttLibJs = {}));

/// <reference path="myAudioBuffer.ts" />
var ttLibJs;
(function (ttLibJs) {
    var audio;
    (function (audio) {
        /**
         * audioBufferを大量に再生にまわすことで動作するプレーヤー
         * nativeの処理に任せる部分が大きいので処理軽いか？
         * なお内部で自動的にリサンプルしてくれるところもグッド
         */
        var BufferPlayer = (function () {
            /**
             * コンストラクタ
             * @param context AudioContext
             */
            function BufferPlayer(context, sampleRate, channelNum) {
                var _this = this;
                this.context = context;
                this.gainNode = context.createGain();
                this.startPos = 0;
                this.isStartPlaying = true;
                this.pts = 0;
                this.holdAudioBuffers = null;
                this.holdPcm16Buffers = null;
                this.sampleRate = sampleRate;
                this.channelNum = channelNum;
                setInterval(function () {
                    while (_this.processPlay()) {
                        ;
                    }
                }, 1000);
            }
            /**
             * 動作nodeを参照します。
             * @return AudioContext
             */
            BufferPlayer.prototype.refNode = function () {
                return this.gainNode;
            };
            /**
             * 内部動作の開始位置を参照します。
             */
            BufferPlayer.prototype.refStartPos = function () {
                return this.startPos;
            };
            /**
             * AudioBufferを再生queueにまわします。
             * @param buffer      再生するbuffer
             * @param nonCopyMode bufferをそのまま利用するかあらたにcreateBufferするかの指定
             */
            BufferPlayer.prototype.queueBuffer = function (buffer, nonCopyMode) {
                if (this.context == null) {
                    return;
                }
                var bufferNode = this.context.createBufferSource();
                if (!nonCopyMode) {
                    var appendBuffer = this.context.createBuffer(buffer.numberOfChannels, buffer.length + 500, buffer.sampleRate);
                    for (var i = 0; i < buffer.numberOfChannels; ++i) {
                        var dest = appendBuffer.getChannelData(i);
                        var src = buffer.getChannelData(i);
                        dest.set(src);
                    }
                    bufferNode.buffer = appendBuffer;
                }
                else {
                    bufferNode.buffer = buffer;
                }
                bufferNode.connect(this.gainNode);
                if (this.isStartPlaying) {
                    this.isStartPlaying = false;
                    this.startPos = this.context.currentTime;
                }
                if (this.startPos + this.pts < this.context.currentTime) {
                    this.startPos = this.context.currentTime - this.pts;
                }
                bufferNode.start(this.startPos + this.pts);
                this.pts += buffer.length / buffer.sampleRate;
            };
            BufferPlayer.prototype.queueInt16Array2 = function (pcm, nonCopyMode) {
                if (this.context == null) {
                    return;
                }
                if (this.holdPcm16Buffers == null) {
                    this.holdAudioBuffers = null;
                    this.holdPcm16Buffers = [];
                }
                if (nonCopyMode) {
                    this.holdPcm16Buffers.push(pcm);
                }
                else {
                    this.holdPcm16Buffers.push(new Int16Array(pcm));
                }
                while (this.processPlay()) {
                    ;
                }
            };
            BufferPlayer.prototype.processPlay = function () {
                // データの再生を実施します。
                // 全部のデータをBuffer化してしまうと、データが多くなりすぎてきちんと動作できなくなることがある模様。
                // よってすぐに再生でないデータは、pcmのまま保持しておかなければならない。
                if (this.pts / this.sampleRate > this.context.currentTime + 5) {
                    return false;
                }
                if (this.holdPcm16Buffers == null) {
                    // 必要なデータがなくて処理できない。
                    return false;
                }
                var pcm = this.holdPcm16Buffers.shift();
                if (pcm == null) {
                    return false;
                }
                var length = pcm.length / this.channelNum;
                // コピーして保持しておくか、そのまま保持するかは重要なところ・・・
                var bufferNode = this.context.createBufferSource();
                // ここ・・・・lengthに+αつけておかないと、無音分追加されないのでは？
                var appendBuffer = this.context.createBuffer(this.channelNum, length + 500, this.sampleRate);
                for (var i = 0; i < this.channelNum; ++i) {
                    var dest = appendBuffer.getChannelData(i);
                    for (var j = 0; j < length; ++j) {
                        dest[j] = pcm[i + this.channelNum * j] / 32767;
                    }
                }
                bufferNode.buffer = appendBuffer;
                bufferNode.connect(this.gainNode);
                if (this.isStartPlaying) {
                    this.isStartPlaying = false;
                    this.startPos = this.context.currentTime;
                }
                if (this.startPos + this.pts / this.sampleRate < this.context.currentTime) {
                    // currentTimeより進み過ぎてしまった場合は、無音分startTimeを進ませておかないとこまったことになる。
                    this.startPos = this.context.currentTime - this.pts / this.sampleRate;
                }
                bufferNode.start(this.startPos + this.pts / this.sampleRate);
                this.pts += length; // 追加したpts分
                return true;
            };
            // あとはtimerの動作で必要に応じてデータをAudioBuffer化していきます。
            /**
             * int16Arrayのpcmデータを再生にまわします。
             * @param pcm        再生するpcm
             * @param length     pcmのサンプル数
             * @param sampleRate サンプルレート
             * @param channelNum チャンネル数
             */
            BufferPlayer.prototype.queueInt16Array = function (pcm, length, sampleRate, channelNum) {
                if (this.context == null) {
                    return;
                }
                // 全部のデータをBuffer化してしまうと、データが多くなりすぎてきちんと動作できなくなることがある模様。
                // よってすぐに再生でないデータは、pcmのまま保持しておかなければならない。
                // コピーして保持しておくか、そのまま保持するかは重要なところ・・・
                var bufferNode = this.context.createBufferSource();
                // ここ・・・・lengthに+αつけておかないと、無音分追加されないのでは？
                var appendBuffer = this.context.createBuffer(channelNum, length, sampleRate);
                for (var i = 0; i < channelNum; ++i) {
                    var dest = appendBuffer.getChannelData(i);
                    for (var j = 0; j < length; ++j) {
                        dest[j] = pcm[i + channelNum * j] / 32767;
                    }
                }
                bufferNode.buffer = appendBuffer;
                bufferNode.connect(this.gainNode);
                if (this.isStartPlaying) {
                    this.isStartPlaying = false;
                    this.startPos = this.context.currentTime;
                }
                if (this.startPos + this.pts < this.context.currentTime) {
                    // currentTimeより進み過ぎてしまった場合は、無音分startTimeを進ませておかないとこまったことになる。
                    this.startPos = this.context.currentTime - this.pts;
                }
                bufferNode.start(this.startPos + this.pts + 5);
                this.pts += length / sampleRate; // 追加したpts分
            };
            /**
             * 閉じる
             */
            BufferPlayer.prototype.close = function () {
                if (this.context == null) {
                    return;
                }
                this.gainNode.disconnect();
                this.gainNode = null;
                this.context = null;
            };
            return BufferPlayer;
        }());
        audio.BufferPlayer = BufferPlayer;
    })(audio = ttLibJs.audio || (ttLibJs.audio = {}));
})(ttLibJs || (ttLibJs = {}));

/// <reference path="myAudioBuffer.ts" />
var ttLibJs;
(function (ttLibJs) {
    var audio;
    (function (audio) {
        /**
         * ScriptProcessorNodeによる音声の再生動作
         * こっちはリアルタイムな処理したりできる。と思う
         */
        var ScriptPlayer = (function () {
            /**
             * コンストラクタ
             * @param context 動作対象AudioContext
             * @param channelNum 動作チャンネル数 1:モノラル 2:ステレオ
             */
            function ScriptPlayer(context, channelNum) {
                var _this = this;
                this.processorNode = context.createScriptProcessor(1024, // iOSの場合はここにデータを設置しないとエラーになった。iOS8での話
                channelNum, channelNum);
                this.processorNode.onaudioprocess = function (ev) {
                    _this._onaudioprocess(ev);
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
            ScriptPlayer.prototype.refNode = function () {
                return this.processorNode;
            };
            /**
             * bufferを再生queueにいれる。
             * @param buffer 再生させたいaudioBuffer
             * @param nonCopyMode trueなら入力bufferをそのまま使う falseならデータをコピーして使う。
             */
            ScriptPlayer.prototype.queueBufer = function (buffer, nonCopyMode) {
                if (this.processorNode == null) {
                    return;
                }
                if (buffer.numberOfChannels != this.channelNum) {
                    console.log("channel数がかわったbufferが追加されています。");
                    return;
                }
                if (this.holdAudioBuffers == null) {
                    this.holdAudioBuffers = [];
                    this.holdPcm16Buffers = null;
                    this.totalHoldSampleNum = 0;
                    this.usingAudioBuffer = null;
                    this.usingPcm16Buffer = null;
                    this.usingBufferPos = 0;
                }
                this.totalHoldSampleNum += buffer.getChannelData(0).length;
                if (nonCopyMode) {
                    this.holdAudioBuffers.push(buffer);
                }
                else {
                    // bufferのコピーをつくるわけだが、bufferはコピーできないので、Float32Arrayを保持するbufferをつくろうと思う。
                    this.holdAudioBuffers.push(new ttLibJs.audio.MyAudioBufer(buffer));
                }
            };
            /**
             * int16Arrayのpcmを再生queueにいれる。
             * @param pcm         pcmデータ
             * @param nonCopyMode データをコピーするかどうかフラグ
             */
            ScriptPlayer.prototype.queueInt16Array = function (pcm, nonCopyMode) {
                // ここで追加されている
                if (this.processorNode == null) {
                    return;
                }
                if (this.holdPcm16Buffers == null) {
                    this.holdAudioBuffers = null;
                    this.holdPcm16Buffers = [];
                    this.totalHoldSampleNum = 0;
                    this.usingAudioBuffer = null;
                    this.usingPcm16Buffer = null;
                    this.usingBufferPos = 0;
                }
                this.totalHoldSampleNum += pcm.length / this.channelNum;
                if (nonCopyMode) {
                    this.holdPcm16Buffers.push(pcm);
                }
                else {
                    this.holdPcm16Buffers.push(new Int16Array(pcm));
                }
            };
            ScriptPlayer.prototype._onaudioprocess = function (ev) {
                if (this.isStart || this.holdPcm16Buffers.length > 50) {
                    this.isStart = true;
                    var outputBuffer = ev.outputBuffer;
                    if (outputBuffer.getChannelData(0).length > this.totalHoldSampleNum) {
                        // ここ、コピーしておかないと、よくわからない音がでる懸念がある
                        // 基本ラストデータのゴミがはいっている。
                        for (var i = 0; i < outputBuffer.numberOfChannels; ++i) {
                            var ary = outputBuffer.getChannelData(i);
                            ary.set(new Float32Array(ary.length));
                        }
                        return;
                    }
                    if (this.holdAudioBuffers != null) {
                        this._onBufferProcess(outputBuffer);
                    }
                    else if (this.holdPcm16Buffers != null) {
                        this._onPcm16Process(outputBuffer);
                    }
                }
            };
            ScriptPlayer.prototype._onBufferProcess = function (outputBuffer) {
                var targetPos = 0;
                do {
                    if (this.usingAudioBuffer == null) {
                        this.usingAudioBuffer = this.holdAudioBuffers.shift();
                        this.usingBufferPos = 0;
                        if (this.usingAudioBuffer == null) {
                            return;
                        }
                    }
                    var targetSize = outputBuffer.getChannelData(0).length - targetPos;
                    var holdSize = this.usingAudioBuffer.getChannelData(0).length - this.usingBufferPos;
                    var appendSize = (targetSize < holdSize) ? targetSize : holdSize;
                    // 利用するbufferにはいっているデータとoutputBufferに書き込み実施すべきデータ量を比較する必要がある。
                    // データをコピーしていく。
                    for (var i = 0; i < outputBuffer.numberOfChannels; ++i) {
                        var destAry = outputBuffer.getChannelData(i);
                        var srcAry = this.usingAudioBuffer.getChannelData(i);
                        destAry.set(srcAry.subarray(this.usingBufferPos, this.usingBufferPos + appendSize), targetPos);
                    }
                    // コピーおわったらフラグを移動する。
                    this.usingBufferPos += appendSize;
                    targetPos += appendSize;
                    this.totalHoldSampleNum -= appendSize;
                    if (this.usingBufferPos == this.usingAudioBuffer.getChannelData(0).length) {
                        // usingBufferの中身を利用しおわった。
                        this.usingAudioBuffer = null;
                    }
                } while (targetPos < outputBuffer.getChannelData(0).length);
            };
            ScriptPlayer.prototype._onPcm16Process = function (outputBuffer) {
                var targetPos = 0;
                do {
                    if (this.usingPcm16Buffer == null) {
                        this.usingPcm16Buffer = this.holdPcm16Buffers.shift();
                        this.usingBufferPos = 0;
                        if (this.usingPcm16Buffer == null) {
                            return;
                        }
                    }
                    var targetSize = outputBuffer.getChannelData(0).length - targetPos;
                    var holdSize = this.usingPcm16Buffer.length / this.channelNum - this.usingBufferPos;
                    var appendSize = (targetSize < holdSize) ? targetSize : holdSize;
                    // 利用するbufferにはいっているデータとoutputBufferに書き込み実施すべきデータ量を比較する必要がある。
                    // データをコピーしていく。
                    for (var i = 0; i < outputBuffer.numberOfChannels; ++i) {
                        var destAry = outputBuffer.getChannelData(i);
                        var srcAry = this.usingPcm16Buffer;
                        // usingBufferPos以降にあるデータをappendSize分コピーする。
                        // コピー先はtargetPosから導き出す。
                        for (var j = 0; j < appendSize; ++j) {
                            destAry[targetPos + j] = srcAry[this.channelNum * (this.usingBufferPos + j) + i] / 32767;
                        }
                    }
                    // コピーおわったらフラグを移動する。
                    this.usingBufferPos += appendSize;
                    targetPos += appendSize;
                    this.totalHoldSampleNum -= appendSize;
                    if (this.usingBufferPos == this.usingPcm16Buffer.length / this.channelNum) {
                        // usingBufferの中身を利用しおわった。
                        this.usingPcm16Buffer = null;
                    }
                } while (targetPos < outputBuffer.getChannelData(0).length);
            };
            /**
             * 後始末
             */
            ScriptPlayer.prototype.close = function () {
                // 終了処理
                // とりあえずdisconnectしとく。
                this.processorNode.disconnect();
                this.processorNode = null;
            };
            return ScriptPlayer;
        }());
        audio.ScriptPlayer = ScriptPlayer;
    })(audio = ttLibJs.audio || (ttLibJs.audio = {}));
})(ttLibJs || (ttLibJs = {}));

var ttLibJs;
(function (ttLibJs) {
    var video;
    (function (video) {
        /**
         * video処理用に利用するwebGL
         * この処理は公にしないので、適当にしとく。
         */
        var VideoGL = (function () {
            function VideoGL(canvas) {
                this.canvas = canvas;
                this.gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
                this.program = null;
                this.vertex = null;
                this.vertexBuffer = this.gl.createBuffer();
                this.uv = null;
                this.uvBuffer = this.gl.createBuffer();
            }
            VideoGL.prototype.setupShaderFromSource = function (vertSrc, fragSrc, pjName, pjMatrix) {
                this.program = this._createProgram(this._createShaderFromSource('x-shader/x-vertex', vertSrc), this._createShaderFromSource('x-shader/x-fragment', fragSrc));
                this.useProgram();
                var pjLocation = this.gl.getUniformLocation(this.program, pjName);
                this.gl.uniformMatrix4fv(pjLocation, false, pjMatrix);
                this.setMvMatrix(VideoGL.createMat4Identity());
            };
            // texture自体をつくっておく。
            VideoGL.prototype.createTexture = function (textureId, id, data) {
                this.gl.activeTexture(textureId);
                var texture = id;
                if (id == null) {
                    texture = this.gl.createTexture();
                }
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                this.gl.pixelStorei(this.gl.PACK_ALIGNMENT, 1);
                this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                if (data instanceof HTMLVideoElement) {
                    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
                }
                else if (data instanceof HTMLCanvasElement) {
                    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
                }
                else if (data == null) {
                    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
                }
                else {
                    this.gl.deleteTexture(texture);
                    return 0;
                }
                return texture;
            };
            VideoGL.prototype.createArrayTexture = function (textureId, id, data, format, width, height) {
                this.gl.activeTexture(textureId);
                var texture = id;
                if (id == null) {
                    texture = this.gl.createTexture();
                }
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                this.gl.pixelStorei(this.gl.PACK_ALIGNMENT, 1);
                this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, format, width, height, 0, format, this.gl.UNSIGNED_BYTE, data);
                return texture;
            };
            VideoGL.prototype.bindTexture = function (textureId, texture) {
                this.gl.activeTexture(textureId);
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            };
            VideoGL.prototype.drawArrays = function () {
                this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
            };
            // vertexやuvの構成要素は2に固定しておく。
            VideoGL.prototype.setVertex = function (vertex) {
                this.vertex = new Float32Array(vertex);
            };
            VideoGL.prototype.setUv = function (uv) {
                this.uv = new Float32Array(uv);
            };
            VideoGL.prototype.flush = function () {
                this.gl.flush();
            };
            VideoGL.prototype.uniform1i = function (location, val) {
                this.gl.uniform1i(location, val);
            };
            VideoGL.prototype.uniform1f = function (location, val) {
                this.gl.uniform1f(location, val);
            };
            // mvMatrixを更新する。
            VideoGL.prototype.setMvMatrix = function (mvMatrix) {
                this.mvMatrix = mvMatrix;
            };
            // 現在保持しているprogramを使うように設定する。
            VideoGL.prototype.useProgram = function () {
                this.gl.useProgram(this.program);
            };
            // vertexとuvの情報を保持しているもので更新する。
            VideoGL.prototype.updateVertexUv = function (posName, uvName) {
                var attrPosLocation = this.gl.getAttribLocation(this.program, posName);
                this.gl.enableVertexAttribArray(attrPosLocation);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
                this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertex, this.gl.STATIC_DRAW);
                this.gl.vertexAttribPointer(attrPosLocation, 2, this.gl.FLOAT, false, 0, 0);
                var attrUVLocation = this.gl.getAttribLocation(this.program, uvName);
                this.gl.enableVertexAttribArray(attrUVLocation);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.uvBuffer);
                this.gl.bufferData(this.gl.ARRAY_BUFFER, this.uv, this.gl.STATIC_DRAW);
                this.gl.vertexAttribPointer(attrUVLocation, 2, this.gl.FLOAT, false, 0, 0);
            };
            // 描画領域を今保持しているviewportにする。
            VideoGL.prototype.viewport = function () {
                this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            };
            VideoGL.prototype.updateMvMatrix = function (mvName) {
                var mvLocation = this.gl.getUniformLocation(this.program, mvName);
                this.gl.uniformMatrix4fv(mvLocation, false, this.mvMatrix);
            };
            VideoGL.prototype.clear = function () {
                this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
                this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            };
            VideoGL.prototype.getUniformLocation = function (name) {
                return this.gl.getUniformLocation(this.program, name);
            };
            VideoGL.prototype.refProgram = function () {
                return this.program;
            };
            VideoGL.prototype.refGl = function () {
                return this.gl;
            };
            VideoGL.prototype._createShaderFromSource = function (type, src) {
                if (this.gl == null) {
                    return null;
                }
                var shader;
                switch (type) {
                    case 'x-shader/x-vertex':
                        shader = this.gl.createShader(this.gl.VERTEX_SHADER);
                        break;
                    case 'x-shader/x-fragment':
                        shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
                        break;
                    default:
                        return null;
                }
                this.gl.shaderSource(shader, src);
                this.gl.compileShader(shader);
                if (this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
                    return shader;
                }
                else {
                    console.log(this.gl.getShaderInfoLog(shader));
                    return null;
                }
            };
            VideoGL.prototype._createProgram = function (vs, fs) {
                if (this.gl == null) {
                    return null;
                }
                var program = this.gl.createProgram();
                this.gl.attachShader(program, vs);
                this.gl.attachShader(program, fs);
                this.gl.linkProgram(program);
                if (this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
                    return program;
                }
                else {
                    console.log(this.gl.getProgramInfoLog(program));
                    return null;
                }
            };
            VideoGL.createMat4Ortho = function (left, right, bottom, top, near, far) {
                var rl = right - left;
                var tb = top - bottom;
                var fn = far - near;
                var tx = -(right + left) / (right - left);
                var ty = -(top + bottom) / (top - bottom);
                var tz = -(far + near) / (far - near);
                return new Float32Array([
                    2.0 / rl, 0.0, 0.0, tx,
                    0.0, 2.0 / tb, 0.0, ty,
                    0.0, 0.0, 2.0 / fn, tz,
                    0.0, 0.0, 0.0, 1.0
                ]);
            };
            VideoGL.createMat4Identity = function () {
                return new Float32Array([
                    1.0, 0.0, 0.0, 0.0,
                    0.0, 1.0, 0.0, 0.0,
                    0.0, 0.0, 1.0, 0.0,
                    0.0, 0.0, 0.0, 1.0
                ]);
            };
            return VideoGL;
        }());
        video.VideoGL = VideoGL;
    })(video = ttLibJs.video || (ttLibJs.video = {}));
})(ttLibJs || (ttLibJs = {}));

/// <reference path="videoGl.ts" />
var ttLibJs;
(function (ttLibJs) {
    var video;
    (function (video) {
        /**
         * videoで流れているデータをcaptureする。
         */
        var SceneCapture = (function () {
            /**
             * コンストラクタ
             * @param width  横サイズ
             * @param height 縦サイズ
             */
            function SceneCapture(width, height) {
                this.canvas = document.createElement('canvas');
                this.canvas.setAttribute('width', width.toString());
                this.canvas.setAttribute('height', height.toString());
                this.width = width;
                this.height = height;
                this.sceneGl = new video.VideoGL(this.canvas);
                var hWidth = width / 2;
                var hHeight = height / 2;
                var vsSrc = "uniform mat4 m;uniform mat4 j;attribute vec4 p;attribute vec2 u;varying mediump vec2 v;void main(){gl_Position=j*m*p;v=u;}";
                var fsSrc = "varying mediump vec2 v;uniform sampler2D t;void main(){gl_FragColor=texture2D(t, v);}";
                this.sceneGl.setupShaderFromSource(vsSrc, fsSrc, 'j', video.VideoGL.createMat4Ortho(-hWidth, hWidth, -hHeight, hHeight, -1, 1));
                this.sceneGl.setVertex([
                    -hWidth, -hHeight,
                    hWidth, -hHeight,
                    hWidth, hHeight,
                    -hWidth, hHeight
                ]);
                this.sceneGl.setUv([
                    0.0, 1.0,
                    1.0, 1.0,
                    1.0, 0.0,
                    0.0, 0.0
                ]);
                var samplerTexLocation = this.sceneGl.getUniformLocation('t');
                this.sceneGl.uniform1i(samplerTexLocation, 0);
                this.captureGl = new video.VideoGL(this.canvas);
                var capFsSrc = "\nvarying mediump vec2 v;precision mediump float;uniform sampler2D c;uniform float d;uniform float e;const mat3 o=mat3(0.183,-0.101,0.439,0.614,-0.339,-0.399,0.062,0.439,-0.04);const vec3 f=vec3(16./255.,0.5,0.5);\nvoid main(){mediump vec4 g;float a,b;float x,y;mediump vec3 h;lowp vec3 i;a=v.x;b=v.y;if(2.*b>1.){b=b-0.5;x=4.*a-floor(4.*a)+d/2.;y=2.*b+(1.-floor(4.*a))*e-e/2.;h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.x=i.x;x=x+d;\nh=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.y=i.x;x=x+d;h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.z=i.x;x=x+d;h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.w=i.x;gl_FragColor=g;}else{x=8.*a-floor(8.*a)+d;y=8.*b+(2.-floor(8.*a))*2.*e-e;\nif(y>3.){y=y-floor(y);h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.x=i.y;x=x+2.*d;h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.y=i.y;x=x+2.*d;h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.z=i.y;x=x+2.*d;h=texture2D(c,vec2(x,y)).rgb;\ni=o*h+f;g.w=i.y;gl_FragColor=g;}else {y=y-floor(y);h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.x=i.z;x=x+2.*d;h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.y=i.z;x=x+2.*d;h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.z=i.z;x=x+2.*d;\nh=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.w=i.z;gl_FragColor=g;}}}";
                this.captureGl.setupShaderFromSource(vsSrc, capFsSrc, 'j', video.VideoGL.createMat4Identity());
                this.captureGl.setVertex([
                    -1.0, -1.0,
                    1.0, -1.0,
                    1.0, 1.0,
                    -1.0, 1.0
                ]);
                this.captureGl.setUv([
                    0.0, 1.0,
                    1.0, 1.0,
                    1.0, 0.0,
                    0.0, 0.0
                ]);
                var captureTexLocation = this.captureGl.getUniformLocation('c');
                this.captureGl.uniform1i(captureTexLocation, 0);
                var xStepLocation = this.captureGl.getUniformLocation('d');
                this.captureGl.uniform1f(xStepLocation, 1.0 / this.width);
                var yStepLocation = this.captureGl.getUniformLocation('e');
                this.captureGl.uniform1f(yStepLocation, 1.0 / this.height);
                this.captureTexture = this.captureGl.createArrayTexture(this.captureGl.refGl().TEXTURE0, null, null, this.captureGl.refGl().RGBA, this.width, this.height);
            }
            /**
             * 描画データを取り出す。
             * @param source 映像ソース canvasかvideoタグ
             * @param target データ設置先yuv420のデータとしてデータが保持されます。
             */
            SceneCapture.prototype.drain = function (source, target) {
                if (source == null) {
                    return false;
                }
                if (!(source instanceof HTMLVideoElement) && !(source instanceof HTMLCanvasElement)) {
                    return false;
                }
                if (source.readyState != 4) {
                    // have enough dataのときのみ動作させれば十分と思われ。
                    return true;
                }
                this.sceneGl.viewport();
                this.sceneGl.clear();
                this.sceneGl.useProgram();
                this.sceneGl.updateMvMatrix('m');
                this.videoTexture = this.sceneGl.createTexture(this.sceneGl.refGl().TEXTURE0, this.videoTexture, source);
                this.sceneGl.updateVertexUv('p', 'u');
                this.sceneGl.drawArrays();
                this.sceneGl.bindTexture(this.sceneGl.refGl().TEXTURE0, this.captureTexture);
                this.sceneGl.refGl().copyTexImage2D(this.sceneGl.refGl().TEXTURE_2D, 0, this.sceneGl.refGl().RGBA, 0, 0, this.width, this.height, 0);
                this.captureGl.viewport();
                this.captureGl.clear();
                this.captureGl.useProgram();
                this.captureGl.updateMvMatrix('m');
                this.captureGl.bindTexture(this.captureGl.refGl().TEXTURE0, this.captureTexture);
                this.captureGl.updateVertexUv('p', 'u');
                this.captureGl.drawArrays();
                this.captureGl.refGl().readPixels(0, 0, this.width / 2, this.height * 3 / 4, this.captureGl.refGl().RGBA, this.captureGl.refGl().UNSIGNED_BYTE, target);
                this.captureGl.flush();
                return true;
            };
            /**
             * 閉じます。
             */
            SceneCapture.prototype.close = function () {
            };
            return SceneCapture;
        }());
        video.SceneCapture = SceneCapture;
    })(video = ttLibJs.video || (ttLibJs.video = {}));
})(ttLibJs || (ttLibJs = {}));

/// <reference path="videoGl.ts" />
var ttLibJs;
(function (ttLibJs) {
    var video;
    (function (video) {
        /**
         * yuvの動画データをcanvasに表示するdrawer
         * 最終的にはcanvasではなくvideoにも書き込みできる方がのぞましいだろう。
         */
        var SceneDrawer = (function () {
            /**
             * コンストラクタ
             * @param target 描画対象canvasエレメント
             */
            function SceneDrawer(target) {
                this.width = parseInt(target.getAttribute('width'));
                this.height = parseInt(target.getAttribute('height'));
                // ここでtargetがcanvasでないものを有効にする場合(videoとか)
                // 内側にcanvasをつくってそこからstreamを取得 videoに紐付ける的な動作が必要
                this.yuvGl = new video.VideoGL(target);
                var vs = "uniform mat4 a;uniform mat4 b;uniform mat4 c;attribute mediump vec4 d;attribute mediump vec4 e;varying mediump vec2 f;void main(){gl_Position=b*a*d;f=(c*e).xy;}";
                var fs = "varying mediump vec2 f;precision mediump float;uniform sampler2D h;uniform sampler2D i;uniform sampler2D j;const float k=16./255.;void main(){mediump vec3 l;lowp vec3 m;l.x=(texture2D(h,f).r-k);l.y=(texture2D(i,f).r-0.5);l.z=(texture2D(j,f).r-0.5);\nm=mat3(1.164,1.164,1.164,0.,-0.213,2.112,1.793,-0.533,0.)*l;gl_FragColor=vec4(m,1.);}";
                this.yuvGl.setupShaderFromSource(vs, fs, 'b', video.VideoGL.createMat4Identity());
                this.yuvGl.setVertex([
                    -1.0, -1.0,
                    1.0, -1.0,
                    1.0, 1.0,
                    -1.0, 1.0
                ]);
                this.yuvGl.setUv([
                    0.0, 1.0,
                    1.0, 1.0,
                    1.0, 0.0,
                    0.0, 0.0
                ]);
                var samplerYLocation = this.yuvGl.getUniformLocation('h');
                var samplerULocation = this.yuvGl.getUniformLocation('i');
                var samplerVLocation = this.yuvGl.getUniformLocation('j');
                this.yuvGl.uniform1i(samplerYLocation, 0);
                this.yuvGl.uniform1i(samplerULocation, 1);
                this.yuvGl.uniform1i(samplerVLocation, 2);
            }
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
            SceneDrawer.prototype.draw = function (y, yStride, u, uStride, v, vStride) {
                if (y.length == 0 || u.length == 0 || v.length == 0) {
                    return;
                }
                var texLocation = this.yuvGl.getUniformLocation('c');
                this.yuvGl.refGl().uniformMatrix4fv(texLocation, false, new Float32Array([
                    1.0 * this.width / yStride, 0.0, 0.0, 0.0,
                    0.0, 1.0, 0.0, 0.0,
                    0.0, 0.0, 1.0, 0.0,
                    0.0, 0.0, 0.0, 1.0
                ]));
                this.yuvGl.viewport();
                this.yuvGl.clear();
                this.yuvGl.useProgram();
                this.yuvGl.updateMvMatrix('a');
                this.yuvGl.createArrayTexture(this.yuvGl.refGl().TEXTURE0, this.yTexture, y, this.yuvGl.refGl().LUMINANCE, yStride, this.height);
                this.yuvGl.createArrayTexture(this.yuvGl.refGl().TEXTURE1, this.uTexture, u, this.yuvGl.refGl().LUMINANCE, uStride, this.height / 2);
                this.yuvGl.createArrayTexture(this.yuvGl.refGl().TEXTURE2, this.vTexture, v, this.yuvGl.refGl().LUMINANCE, vStride, this.height / 2);
                this.yuvGl.updateVertexUv('d', 'e');
                this.yuvGl.drawArrays();
                this.yuvGl.flush();
            };
            /**
             * 閉じる
             */
            SceneDrawer.prototype.close = function () {
            };
            return SceneDrawer;
        }());
        video.SceneDrawer = SceneDrawer;
    })(video = ttLibJs.video || (ttLibJs.video = {}));
})(ttLibJs || (ttLibJs = {}));

/// <reference path="audio/beepGenerator.ts" />
/// <reference path="audio/bufferPlayer.ts" />
/// <reference path="audio/scriptPlayer.ts" />
/// <reference path="video/sceneCapture.ts" />
/// <reference path="video/sceneDrawer.ts" />
// ttLibJsのベースになるところ。
var tt;
(function (tt) {
    tt.BeepGenerator = ttLibJs.audio.BeepGenerator;
    tt.BufferPlayer = ttLibJs.audio.BufferPlayer;
    tt.ScriptPlayer = ttLibJs.audio.ScriptPlayer;
    tt.SceneCapture = ttLibJs.video.SceneCapture;
    tt.SceneDrawer = ttLibJs.video.SceneDrawer;
})(tt || (tt = {}));
