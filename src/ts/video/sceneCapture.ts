/// <reference path="videoGl.ts" />
namespace ttLibJs {
    import VideoGL = ttLibJs.video.VideoGL;
    export namespace video {
        /**
         * videoで流れているデータをcaptureする。
         */
        export class SceneCapture {
            private canvas:HTMLCanvasElement;
            private width:number;
            private height:number;
            private sceneGl:VideoGL;
            private captureGl:VideoGL;
            private captureTexture:WebGLTexture;
            private videoTexture:WebGLTexture;
            /**
             * コンストラクタ
             * @param width  横サイズ
             * @param height 縦サイズ
             */
            constructor(
                    width:number,
                    height:number) {
                this.canvas = <HTMLCanvasElement>document.createElement('canvas');
                this.canvas.setAttribute('width', width.toString());
                this.canvas.setAttribute('height', height.toString());
                this.width = width;
                this.height = height;
                this.sceneGl = new VideoGL(this.canvas);
                var hWidth = width / 2;
                var hHeight = height / 2;
                var vsSrc:string = "uniform mat4 m;uniform mat4 j;attribute vec4 p;attribute vec2 u;varying mediump vec2 v;void main(){gl_Position=j*m*p;v=u;}";
                var fsSrc:string = "varying mediump vec2 v;uniform sampler2D t;void main(){gl_FragColor=texture2D(t, v);}";
                this.sceneGl.setupShaderFromSource(
                    vsSrc,
                    fsSrc,
                    'j',
                    VideoGL.createMat4Ortho(
                        -hWidth, hWidth, -hHeight, hHeight, -1, 1
                    )
                );
                this.sceneGl.setVertex([
                    -hWidth, -hHeight,  
                     hWidth, -hHeight,
                     hWidth,  hHeight,
                    -hWidth,  hHeight
                ]);
                this.sceneGl.setUv([
                    0.0, 1.0,
                    1.0, 1.0,
                    1.0, 0.0,
                    0.0, 0.0
                ]);
                var samplerTexLocation = this.sceneGl.getUniformLocation('t');
                this.sceneGl.uniform1i(samplerTexLocation, 0);

                this.captureGl = new VideoGL(this.canvas);
                var capFsSrc:string = `
varying mediump vec2 v;precision mediump float;uniform sampler2D c;uniform float d;uniform float e;const mat3 o=mat3(0.183,-0.101,0.439,0.614,-0.339,-0.399,0.062,0.439,-0.04);const vec3 f=vec3(16./255.,0.5,0.5);
void main(){mediump vec4 g;float a,b;float x,y;mediump vec3 h;lowp vec3 i;a=v.x;b=v.y;if(2.*b>1.){b=b-0.5;x=4.*a-floor(4.*a)+d/2.;y=2.*b+(1.-floor(4.*a))*e-e/2.;h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.x=i.x;x=x+d;
h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.y=i.x;x=x+d;h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.z=i.x;x=x+d;h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.w=i.x;gl_FragColor=g;}else{x=8.*a-floor(8.*a)+d;y=8.*b+(2.-floor(8.*a))*2.*e-e;
if(y>3.){y=y-floor(y);h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.x=i.y;x=x+2.*d;h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.y=i.y;x=x+2.*d;h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.z=i.y;x=x+2.*d;h=texture2D(c,vec2(x,y)).rgb;
i=o*h+f;g.w=i.y;gl_FragColor=g;}else {y=y-floor(y);h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.x=i.z;x=x+2.*d;h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.y=i.z;x=x+2.*d;h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.z=i.z;x=x+2.*d;
h=texture2D(c,vec2(x,y)).rgb;i=o*h+f;g.w=i.z;gl_FragColor=g;}}}`;
                this.captureGl.setupShaderFromSource(
                    vsSrc,
                    capFsSrc,
                    'j',
                    VideoGL.createMat4Identity()
                );
                this.captureGl.setVertex([
                    -1.0, -1.0,
                     1.0, -1.0,
                     1.0,  1.0,
                    -1.0,  1.0
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
                this.captureTexture = this.captureGl.createArrayTexture(
                    this.captureGl.refGl().TEXTURE0,
                    null,
                    null,
                    this.captureGl.refGl().RGBA,
                    this.width,
                    this.height);
            }
            /**
             * 描画データを取り出す。
             * @param source 映像ソース canvasかvideoタグ
             * @param target データ設置先yuv420のデータとしてデータが保持されます。
             */
            public drain(
                    source:any,
                    target:Uint8Array):boolean {
                if(source == null) {
                    return false;
                }
                if(!(source instanceof HTMLVideoElement) && !(source instanceof HTMLCanvasElement)) {
                    return false;
                }
                if(source.readyState != 4) {
                    // have enough dataのときのみ動作させれば十分と思われ。
                    return true;
                }
                this.sceneGl.viewport();
                this.sceneGl.clear();
                this.sceneGl.useProgram();
                this.sceneGl.updateMvMatrix('m');
                this.videoTexture = this.sceneGl.createTexture(
                    this.sceneGl.refGl().TEXTURE0,
                    this.videoTexture,
                    source);
                this.sceneGl.updateVertexUv('p', 'u');
                this.sceneGl.drawArrays();

                this.sceneGl.bindTexture(
                    this.sceneGl.refGl().TEXTURE0,
                    this.captureTexture);
                this.sceneGl.refGl().copyTexImage2D(
                    this.sceneGl.refGl().TEXTURE_2D,
                    0,
                    this.sceneGl.refGl().RGBA,
                    0,
                    0,
                    this.width,
                    this.height,
                    0);

                this.captureGl.viewport();
                this.captureGl.clear();
                this.captureGl.useProgram();
                this.captureGl.updateMvMatrix('m');
                this.captureGl.bindTexture(
                    this.captureGl.refGl().TEXTURE0,
                    this.captureTexture);
                this.captureGl.updateVertexUv('p', 'u');
                this.captureGl.drawArrays();
                this.captureGl.refGl().readPixels(
                    0,
                    0,
                    this.width / 2,
                    this.height * 3 / 4,
                    this.captureGl.refGl().RGBA,
                    this.captureGl.refGl().UNSIGNED_BYTE,
                    target);
                this.captureGl.flush();
                return true;
            }
            /**
             * 閉じます。
             */
            public close():void {
            }
        }
    }
}