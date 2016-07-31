/// <reference path="audio/beepGenerator.ts" />
/// <reference path="audio/bufferPlayer.ts" />
/// <reference path="audio/scriptPlayer.ts" />
/// <reference path="video/sceneCapture.ts" />
/// <reference path="video/sceneDrawer.ts" />

// ttLibJsのベースになるところ。
namespace tt {
    export import BeepGenerator = ttLibJs.audio.BeepGenerator;
    export import BufferPlayer  = ttLibJs.audio.BufferPlayer;
    export import ScriptPlayer  = ttLibJs.audio.ScriptPlayer;
    export import SceneCapture  = ttLibJs.video.SceneCapture;
    export import SceneDrawer   = ttLibJs.video.SceneDrawer;
}
