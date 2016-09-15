/// <reference path="videoGl.ts" />
namespace ttLibJs {
    import VideoGL = ttLibJs.video.VideoGL;
    export namespace video {
        /**
         * yuvの動画データをcanvasに表示するdrawer
         * 最終的にはcanvasではなくvideoにも書き込みできる方がのぞましいだろう。
         */
        export class SceneDrawer {
            private yuvGl:VideoGL;
            private yTexture:WebGLTexture;
            private uTexture:WebGLTexture;
            private vTexture:WebGLTexture;
            private width:number;
            private height:number;
            /**
             * コンストラクタ
             * @param target 描画対象canvasエレメント
             */
            constructor(target:HTMLCanvasElement) {
                this.width = parseInt(target.getAttribute('width'));
                this.height = parseInt(target.getAttribute('height'));
                // ここでtargetがcanvasでないものを有効にする場合(videoとか)
                // 内側にcanvasをつくってそこからstreamを取得 videoに紐付ける的な動作が必要
                this.yuvGl = new VideoGL(target);
                var vs:string = `uniform mat4 a,b,c,g,k;attribute mediump vec4 d,e;varying mediump vec2 f,n,o;void main(){gl_Position=b*a*d;f=(c*e).xy;n=(g*e).xy;o=(k*e).xy;}`;
                var fs:string = `varying mediump vec2 f,n,o;precision mediump float;uniform sampler2D h,i,j;const float k=16./255.;void main(){mediump vec3 l;lowp vec3 m;l.x=(texture2D(h,f).r-k);l.y=(texture2D(i,n).r-0.5);l.z=(texture2D(j,o).r-0.5);m=mat3(1.164,1.164,1.164,0.,-0.213,2.112,1.793,-0.533,0.)*l;gl_FragColor=vec4(m,1.)}`;
                this.yuvGl.setupShaderFromSource(
                    vs,
                    fs,
                    'b',
                    VideoGL.createMat4Identity());
                this.yuvGl.setVertex([
                    -1.0, -1.0,
                     1.0, -1.0,
                     1.0,  1.0,
                    -1.0,  1.0
                ]);
                this.yuvGl.setUv([
                    0.0, 1.0,
                    1.0, 1.0,
                    1.0, 0.0,
                    0.0, 0.0
                ]);
                var samplerYLocation:WebGLUniformLocation = this.yuvGl.getUniformLocation('h');
                var samplerULocation:WebGLUniformLocation = this.yuvGl.getUniformLocation('i');
                var samplerVLocation:WebGLUniformLocation = this.yuvGl.getUniformLocation('j');
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
            public draw(
                    y:Uint8Array, yStride:number,
                    u:Uint8Array, uStride:number,
                    v:Uint8Array, vStride:number) {
                if(y.length == 0 || u.length == 0 || v.length == 0) {
                    return;
                }
                // やっぱりここでtexture cをつかってstrideの調整してるっぽいですね。
                // できたら変更になったら送る・・・にしたい。
                var texLocation:WebGLUniformLocation = this.yuvGl.getUniformLocation('c');
                this.yuvGl.refGl().uniformMatrix4fv(texLocation, false, new Float32Array([
                    1.0 * this.width / yStride, 0.0, 0.0, 0.0,
                    0.0, 1.0, 0.0, 0.0,
                    0.0, 0.0, 1.0, 0.0,
                    0.0, 0.0, 0.0, 1.0
                ]));
                texLocation = this.yuvGl.getUniformLocation('g');
                this.yuvGl.refGl().uniformMatrix4fv(texLocation, false, new Float32Array([
                    0.5 * this.width / uStride, 0.0, 0.0, 0.0,
                    0.0, 1.0, 0.0, 0.0,
                    0.0, 0.0, 1.0, 0.0,
                    0.0, 0.0, 0.0, 1.0
                ]));
                texLocation = this.yuvGl.getUniformLocation('k');
                this.yuvGl.refGl().uniformMatrix4fv(texLocation, false, new Float32Array([
                    0.5 * this.width / vStride, 0.0, 0.0, 0.0,
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
            }
            /**
             * 閉じる
             */
            public close():void {
            }
        }
    }
}