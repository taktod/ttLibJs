namespace ttLibJs {
    export namespace video {
        /**
         * video処理用に利用するwebGL
         * この処理は公にしないので、適当にしとく。
         */
        export class VideoGL {
            private canvas:HTMLCanvasElement;
            private gl:WebGLRenderingContext;
            private program:WebGLProgram;
            private mvMatrix:Float32Array; // 移動用のmatrixは保持しておく。すぐに適応ではなく、他で設定 draw時に設定という動作になると思われるため。
            private vertex:Float32Array; // 2次元とする。
            private vertexBuffer:WebGLBuffer; // これ・・・使いまわせるような気がするんだよね。
            private uv:Float32Array; // こっちも2次元で扱う
            private uvBuffer:WebGLBuffer;
            constructor(canvas:HTMLCanvasElement) {
                this.canvas = canvas;
                this.gl = <WebGLRenderingContext>(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
                this.program = null;
                this.vertex = null;
                this.vertexBuffer = this.gl.createBuffer();
                this.uv = null;
                this.uvBuffer = this.gl.createBuffer();
            }
            public setupShaderFromSource(
                    vertSrc:string,
                    fragSrc:string,
                    pjName:string,
                    pjMatrix:Float32Array):void {
                this.program = this._createProgram(
                    this._createShaderFromSource('x-shader/x-vertex', vertSrc),
                    this._createShaderFromSource('x-shader/x-fragment', fragSrc)
                );
                this.useProgram();
                var pjLocation:WebGLUniformLocation = this.gl.getUniformLocation(this.program, pjName);
                this.gl.uniformMatrix4fv(pjLocation, false, pjMatrix);
                this.setMvMatrix(VideoGL.createMat4Identity());
            }
            // texture自体をつくっておく。
            public createTexture(textureId:number, id:WebGLTexture, data:any):WebGLTexture {
                this.gl.activeTexture(textureId);
                var texture = id;
                if(id == null) {
                    texture = this.gl.createTexture();
                }
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                this.gl.pixelStorei(this.gl.PACK_ALIGNMENT, 1);
                this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                if(data instanceof HTMLVideoElement) {
                    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, <HTMLVideoElement>data);
                }
                else if(data instanceof HTMLCanvasElement) {
                    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, <HTMLCanvasElement>data);
                }
                else if(data == null){
                    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
                }
                else {
                    this.gl.deleteTexture(texture);
                    return 0;
                }
                return texture;
            }
            public createArrayTexture(textureId:number, id:WebGLTexture, data:Uint8Array, format:number, width:number, height:number):WebGLTexture {
                this.gl.activeTexture(textureId);
                var texture = id;
                if(id == null) {
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
            }
            public bindTexture(textureId:number, texture:WebGLTexture) {
                this.gl.activeTexture(textureId);
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            }
            public drawArrays() {
                this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
            }
            // vertexやuvの構成要素は2に固定しておく。
            public setVertex(vertex:Array<number>) {
                this.vertex = new Float32Array(vertex);
            }
            public setUv(uv:Array<number>) {
                this.uv = new Float32Array(uv);
            }
            public flush() {
                this.gl.flush();
            }
            public uniform1i(location:WebGLUniformLocation, val:number) {
                this.gl.uniform1i(location, val);
            }
            public uniform1f(location:WebGLUniformLocation, val:number) {
                this.gl.uniform1f(location, val);
            }
            // mvMatrixを更新する。
            public setMvMatrix(mvMatrix:Float32Array) {
                this.mvMatrix = mvMatrix;
            }
            // 現在保持しているprogramを使うように設定する。
            public useProgram():void {
                this.gl.useProgram(this.program);
            }
            // vertexとuvの情報を保持しているもので更新する。
            public updateVertexUv(
                    posName:string,
                    uvName:string):void {
                var attrPosLocation:number = this.gl.getAttribLocation(this.program, posName);
                this.gl.enableVertexAttribArray(attrPosLocation);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
                this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertex, this.gl.STATIC_DRAW);
                this.gl.vertexAttribPointer(attrPosLocation, 2, this.gl.FLOAT, false, 0, 0);

                var attrUVLocation:number = this.gl.getAttribLocation(this.program, uvName);
                this.gl.enableVertexAttribArray(attrUVLocation);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.uvBuffer);
                this.gl.bufferData(this.gl.ARRAY_BUFFER, this.uv, this.gl.STATIC_DRAW);
                this.gl.vertexAttribPointer(attrUVLocation, 2, this.gl.FLOAT, false, 0, 0);
            }
            // 描画領域を今保持しているviewportにする。
            public viewport():void {
                this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            }
            public updateMvMatrix(mvName:string):void {
                var mvLocation:WebGLUniformLocation = this.gl.getUniformLocation(this.program, mvName);
                this.gl.uniformMatrix4fv(mvLocation, false, this.mvMatrix);
            }
            public clear() {
                this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
                this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            }
            public getUniformLocation(name:string):WebGLUniformLocation {
                return this.gl.getUniformLocation(this.program, name);
            }
            public refProgram():WebGLProgram {
                return this.program;
            }
            public refGl():WebGLRenderingContext {
                return this.gl;
            }
            private _createShaderFromSource(type:string, src:string):WebGLShader {
                if(this.gl == null) {
                    return null;
                }
                var shader:WebGLShader;
                switch(type) {
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
                if(this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
                    return shader;
                }
                else {
                    console.log(this.gl.getShaderInfoLog(shader));
                    return null;
                }
            }
            private _createProgram(vs:WebGLShader, fs:WebGLShader):WebGLProgram {
                if(this.gl == null) {
                    return null;
                }
                var program:WebGLProgram = this.gl.createProgram();
                this.gl.attachShader(program, vs);
                this.gl.attachShader(program, fs);
                this.gl.linkProgram(program);
                if(this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
                    return program;
                }
                else {
                    console.log(this.gl.getProgramInfoLog(program));
                    return null;
                }
            }
            public static createMat4Ortho(
                    left:number,
                    right:number,
                    bottom:number,
                    top:number,
                    near:number,
                    far:number):Float32Array {
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
            }
            public static createMat4Identity():Float32Array {
                return new Float32Array([
                    1.0, 0.0, 0.0, 0.0,
                    0.0, 1.0, 0.0, 0.0,
                    0.0, 0.0, 1.0, 0.0,
                    0.0, 0.0, 0.0, 1.0
                ]);
            }
        }
    }
}