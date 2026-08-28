import { Renderer, Program, Mesh, Plane, Uniform } from 'https://esm.sh/wtc-gl@1.0.0-beta.43';
import { Vec2, Vec3, Vec4, Mat2, Mat3, Mat4, Quat } from 'https://esm.sh/wtc-math';

const vertShader = `#version 300 es
in vec3 position;in vec2 uv;in vec3 normal;out vec2 v_uv;out vec3 v_n;out vec3 v_pos;out vec3 c;uniform float u_time;uniform vec2 u_resolution;uniform vec2 u_position;uniform float u_zoom;uniform float u_seed;
vec3 pal(in float t,in vec3 a,in vec3 b,in vec3 c,in vec3 d){return a+b*cos(6.28318*(c*t+d));}
vec3 random3(vec3 c){float j=4096.0*sin(dot(c,vec3(17.0,59.4,15.0)));vec3 r;r.z=fract(512.0*j);j*=.125;r.x=fract(512.0*j);j*=.125;r.y=fract(512.0*j);return r-0.5;}
const float F3=0.3333333;const float G3=0.1666667;
float simplex3d(vec3 p){vec3 s=floor(p+dot(p,vec3(F3)));vec3 x=p-s+dot(s,vec3(G3));vec3 e=step(vec3(0.0),x-x.yzx);vec3 i1=e*(1.0-e.zxy);vec3 i2=1.0-e.zxy*(1.0-e);vec3 x1=x-i1+G3;vec3 x2=x-i2+2.0*G3;vec3 x3=x-1.0+3.0*G3;vec4 w,d;w.x=dot(x,x);w.y=dot(x1,x1);w.z=dot(x2,x2);w.w=dot(x3,x3);w=max(0.6-w,0.0);d.x=dot(random3(s),x);d.y=dot(random3(s+i1),x1);d.z=dot(random3(s+i2),x2);d.w=dot(random3(s+1.0),x3);w*=w;w*=w;d*=w;return dot(d,vec4(52.0));}
#define numOctaves 3
float fbm(in vec3 x,in float H){float G=exp2(-H);float f=1.0;float a=1.0;float t=0.0;for(int i=0;i<numOctaves;i++){t+=a*simplex3d(f*x);f*=2.5;a*=G;}return t;}
vec2 getScreenSpace(){vec2 uv=(position.xy*u_resolution.xy-0.5*u_resolution.xy)/min(u_resolution.y,u_resolution.x);return uv;}
float smin(float a,float b,float k){float h=clamp(0.5+0.5*(a-b)/k,0.0,1.0);return mix(a,b,h)-k*h*(1.0-h);}
void main(){mat2 rot=mat2(1,0,0,1);vec2 tuv=position.xy*rot*u_zoom+u_position*2.;float n=simplex3d(vec3(tuv*.5,-1000.+u_time));float nc=n;n+=simplex3d(vec3(tuv*2.*.3+4.7,-1000.+u_time*.5)*2.)*.8;float ncol=simplex3d(vec3(100.+tuv*.1,-1000.+u_time*.5)*2.)*.8;vec3 offset=vec3((nc*-.5)/u_zoom*.5*min(u_resolution.y,u_resolution.x),n/u_zoom*.5*min(u_resolution.y,u_resolution.x),-(n*.5+.5));vec3 pos=position;pos*=vec3(u_resolution.xy,1.);pos+=offset;pos/=vec3(u_resolution.xy,1.);pos.xy*=rot;offset/=vec3(u_resolution.xy,1.);c=pal(nc*.5+u_seed,vec3(.7),vec3(.3),vec3(1.0,.95,.9),vec3(0.0,0.33,0.67));pos.z=smin(pos.z,-1.,-0.2);gl_Position=vec4(pos,1.0);v_uv=uv;v_pos=pos.xyz;v_n=offset;}`;

const fragShader = `#version 300 es
precision highp float;uniform vec2 u_resolution;uniform float u_time;uniform vec2 u_mouse;uniform sampler2D s_noise;uniform sampler2D b_noise;in vec2 v_uv;in vec3 c;in vec3 v_n;in vec3 v_pos;out vec4 colour;
vec2 getScreenSpace(){vec2 uv=(gl_FragCoord.xy-0.5*u_resolution.xy)/min(u_resolution.y,u_resolution.x);return uv;}
float ndot(vec2 a,vec2 b){return a.x*b.x-a.y*b.y;}
float sdRhombus(in vec2 p,in vec2 b){p=abs(p);float h=clamp(ndot(b-2.0*p,b)/dot(b,b),-1.0,1.0);float d=length(p-0.5*b*vec2(1.0-h,1.0+h));return d*sign(p.x*b.y+p.y*b.x-b.x*b.y);}
void main(){vec2 uv=getScreenSpace();uv*=1.;float m=abs(fract(v_uv.y*100.*max(.2,smoothstep(.6,-.6,uv.y+uv.x))-u_time*5.)-.5)-.3;vec2 vv_uv=v_uv*(u_resolution.y>u_resolution.x?vec2((u_resolution.x/u_resolution.y),1.):vec2(1.,(u_resolution.y/u_resolution.x)));vv_uv=fract(vv_uv*20.)-.5;m=length(vv_uv)-.4;m=sdRhombus(vv_uv,vec2(.5));vec3 U=dFdx(v_pos);vec3 V=dFdy(v_pos);vec3 n=normalize(cross(U,V));float mask=smoothstep(fwidth(m),0.,m);vec3 lightDir=normalize(vec3(10.0,-10.0,10.0));float d=dot(n,lightDir)*0.1+0.2;float ls=smoothstep(0.01,0.35,d);vec3 finalColor=c*ls;float gray=dot(finalColor,vec3(0.2126,0.7152,0.0722));vec3 saturatedColor=mix(vec3(gray),finalColor,0.3);colour=vec4(saturatedColor,1.0);}`;

class StripeHeader {
    uniforms;dimensions;autoResize=true;onBeforeRender;onAfterRender;u_time;u_resolution;u_seed;gl;renderer;program;mesh;lastTime=0;_playing=false;
    constructor({vertex,fragment,dimensions=new Vec2(window.innerWidth,window.innerHeight),container,autoResize=true,uniforms={}}={}){
        this.onBeforeRender=()=>{};this.onAfterRender=()=>{};this.render=this.render.bind(this);this.resize=this.resize.bind(this);this.autoResize=autoResize;this.dimensions=dimensions;
        this.u_time=new Uniform({name:'time',value:0,kind:'float'});
        this.u_resolution=new Uniform({name:'resolution',value:this.dimensions.array,kind:'float_vec2'});
        this.u_seed=new Uniform({name:'seed',value:Math.random()*10000+1000,kind:'float'});
        this.uniforms=Object.assign({},uniforms,{u_time:this.u_time,u_resolution:this.u_resolution,u_seed:this.u_seed});
        this.renderer=new Renderer({antialias:true});this.gl=this.renderer.gl;container.appendChild(this.gl.canvas);this.gl.clearColor(1,1,1,1);
        if(this.autoResize){window.addEventListener('resize',this.resize,false);this.resize();}else{this.renderer.dimensions=dimensions;this.u_resolution.value=this.dimensions.scaleNew(this.renderer.dpr).array;}
        const geometry=new Plane(this.gl,{width:4,height:4,widthSegments:Math.floor(window.innerWidth/20),heightSegments:Math.floor(window.innerHeight/5)});
        this.program=new Program(this.gl,{vertex,fragment,uniforms:this.uniforms});
        this.mesh=new Mesh(this.gl,{geometry,program:this.program});this.playing=true;
    }
    resize(){
        this.dimensions=new Vec2(window.innerWidth,window.innerHeight);this.u_resolution.value=this.dimensions.scaleNew(this.renderer.dpr).array;this.renderer.dimensions=this.dimensions;
        const geometry=new Plane(this.gl,{width:3,height:3,widthSegments:Math.floor(window.innerWidth/20),heightSegments:Math.floor(window.innerHeight/5)});
        this.mesh=new Mesh(this.gl,{geometry,program:this.program});
    }
    render(t){
        const diff=t-this.lastTime;this.lastTime=t;
        if(this.playing)this.animationFrameId=requestAnimationFrame(this.render);
        this.u_time.value+=diff*5e-5;this.onBeforeRender(t);this.renderer.render({scene:this.mesh});this.onAfterRender(t);
    }
    set playing(v){
        if(this._playing!==true&&v===true){this.lastTime=performance.now();this.animationFrameId=requestAnimationFrame(this.render);this._playing=true;}
        else if(v===false){cancelAnimationFrame(this.animationFrameId);this.lastTime=0;this._playing=false;}
    }
    get playing(){return this._playing===true;}
    destroy(){this.playing=false;window.removeEventListener('resize',this.resize);if(this.gl&&this.gl.canvas&&this.gl.canvas.parentNode)this.gl.canvas.parentNode.removeChild(this.gl.canvas);}
}

window.initWebGLShaderBg=function(container){
    const vShaderSource=vertShader.replace('%%rn%%',`${.1+Math.random()*.3}+${Math.random()*Math.PI}`);
    const FSWrapper=new StripeHeader({fragment:fragShader,vertex:vShaderSource,container});
    const {uniforms}=FSWrapper;let angle=0.;
    uniforms.u_position=new Uniform({name:"position",value:[0,2],kind:"vec2"});
    uniforms.u_zoom=new Uniform({name:"zoom",value:1.,kind:"float"});
    uniforms.u_rotation=new Uniform({name:"rotation",value:angle,kind:"float"});
    let zoom=uniforms.u_zoom.value,tzoom=1.,velocity=new Vec2(0,0),lastmouse=new Vec2(0,0),startmouse=new Vec2(0,0),startrotation=angle,rotation=angle,pointerdown=false,keys={rotation:false},rotating=false,zooming=false,interactionFrameId;
    const handleKeyDown=e=>{if(e.key==='Control')keys.rotation=true;},handleKeyUp=e=>{if(e.key==='Control')keys.rotation=false;};
    const handlePointerDown=e=>{
        if(e.target.closest('a, button, .glowing-card, #oneko, #oneko-skin-menu, .bullet, #chat-modal'))return;
        if(!keys.rotation){pointerdown=true;lastmouse=new Vec2(e.clientX,e.clientY);}else{rotating=true;startrotation=rotation+new Vec2(window.innerWidth*.5,window.innerHeight*.5).subtract(new Vec2(e.clientX,e.clientY)).angle;}
        startmouse=lastmouse.clone();
    };
    const handlePointerUp=()=>{pointerdown=rotating=false;};
    const handlePointerMove=e=>{
        if(zooming)return;
        if(rotating)rotation=startrotation-new Vec2(window.innerWidth*.5,window.innerHeight*.5).subtract(new Vec2(e.clientX,e.clientY)).angle;
        else if(pointerdown){
            const thismouse=new Vec2(e.clientX,e.clientY),dd=(1./Math.min(window.innerWidth,window.innerHeight))*uniforms.u_zoom.value,diff=lastmouse.subtract(thismouse),c=Math.cos(uniforms.u_rotation.value),s=Math.sin(uniforms.u_rotation.value),mat=new Mat2(c,s,-s,c);
            velocity=diff.clone();uniforms.u_position.value=new Vec2(...uniforms.u_position.value).add(diff.transformByMat2New(mat).multiply(new Vec2(dd,-dd))).array;lastmouse=thismouse;
        }
    };
    window.addEventListener('keydown',handleKeyDown);window.addEventListener('keyup',handleKeyUp);window.addEventListener('pointerdown',handlePointerDown);window.addEventListener('pointerup',handlePointerUp);window.addEventListener('pointermove',handlePointerMove);
    const runmouse=()=>{
        const scalar=pointerdown?.1:.98;
        if(velocity.length>0.01){velocity.scale(scalar);const c=Math.cos(uniforms.u_rotation.value),s=Math.sin(uniforms.u_rotation.value),mat=new Mat2(c,s,-s,c);let dd=(1./Math.min(window.innerWidth,window.innerHeight))*uniforms.u_zoom.value;uniforms.u_position.value=new Vec2(...uniforms.u_position.value).add(velocity.transformByMat2New(mat).multiplyNew(new Vec2(dd,-dd))).array;}
        zoom+=(tzoom-zoom)*.1;uniforms.u_zoom.value=zoom;uniforms.u_rotation.value=rotation;if(FSWrapper.playing)interactionFrameId=requestAnimationFrame(runmouse);
    };
    interactionFrameId=requestAnimationFrame(runmouse);
    return()=>{cancelAnimationFrame(interactionFrameId);window.removeEventListener('keydown',handleKeyDown);window.removeEventListener('keyup',handleKeyUp);window.removeEventListener('pointerdown',handlePointerDown);window.removeEventListener('pointerup',handlePointerUp);window.removeEventListener('pointermove',handlePointerMove);FSWrapper.destroy();};
};

/* ==========================================================================
   壁纸变量配置：
   - 左上角（日间 3 张）：BG_TOP_LEFT_1 / BG_TOP_LEFT_2 / BG_TOP_LEFT_3
   - 右上角（夜间 3 张）：BG_TOP_RIGHT_1 / BG_TOP_RIGHT_2 / BG_TOP_RIGHT_3
   - 左下角：BG_BOTTOM_LEFT
   - 右下角（日间 3 张）：BG_BOTTOM_RIGHT_1 / BG_BOTTOM_RIGHT_2 / BG_BOTTOM_RIGHT_3
   ========================================================================== */
const BG_TOP_LEFT_1 = 'https://file.garden/ZWlUCY4S7Xz2vypS/archived%20backgrounds/colours/green/dddf143.jpg#repeat+mask:rgba(127,225,221,0.2)';
const BG_TOP_LEFT_2 = 'https://textures.neocities.org/textures/abstract-brown-and-grey/397.GIF#repeat+mask:rgba(127,225,221,0.2)';

const BG_TOP_LEFT_3 = 'https://textures.neocities.org/textures/fabric/rope195.jpg#repeat+mask:rgba(127,225,221,0.2)';



const BG_TOP_RIGHT_1 = 'https://artwork.neocities.org/bgs/stardown.gif#repeat';

const BG_TOP_RIGHT_2 = 'https://artwork.neocities.org/bgs/nightani.gif#repeat';

const BG_TOP_RIGHT_3 = 'https://artwork.neocities.org/bgs/movingstars.gif#repeat';



const BG_BOTTOM_LEFT = 'webgl-shader';


const BG_BOTTOM_RIGHT_1 = 'https://textures.neocities.org/textures/stone-and-brick/GRYCON7.JPG#repeat+mask:rgba(127,225,221,0.2)';
const BG_BOTTOM_RIGHT_2 = 'https://textures.neocities.org/textures/wood/woodgrain2195.jpg#repeat+mask:rgba(127,225,221,0.2)';
const BG_BOTTOM_RIGHT_3 = 'https://textures.neocities.org/textures/paper-and-sponge/paper.jpg#repeat+mask:rgba(127,225,221,0.2)';

// 读取本地存储中用户的粒子特效偏好（默认开启 true）
let userParticlesPref = localStorage.getItem('particlesPref') !== null ? (localStorage.getItem('particlesPref') === 'true') : true;
window.isParticlesEnabled = false;

let bgChangeSequence = 0, currentPage = 2, pagesContainer, bullets, isPlaying = false, currentBgIndex = 0;
let isParticlesAllowedOnCurrentBg = false;

// 各模式轮巡索引
let currentTopLeftStep = -1;
let currentTopRightStep = -1;
let currentBottomRightStep = -1;

const glowingCard = document.querySelector('.glowing-card'), audio = document.getElementById('audioPlayer');

const bgTopLeftList = [
    { name: 'top-left-1', value: BG_TOP_LEFT_1, isLight: true, allowParticles: false },
    { name: 'top-left-2', value: BG_TOP_LEFT_2, isLight: true, allowParticles: false },
    { name: 'top-left-3', value: BG_TOP_LEFT_3, isLight: true, allowParticles: false }
];

const bgTopRightList = [
    { name: 'top-right-1', value: BG_TOP_RIGHT_1, isLight: false, allowParticles: true },
    { name: 'top-right-2', value: BG_TOP_RIGHT_2, isLight: false, allowParticles: true },
    { name: 'top-right-3', value: BG_TOP_RIGHT_3, isLight: false, allowParticles: false }
];

const bgBottomRightList = [
    { name: 'bottom-right-1', value: BG_BOTTOM_RIGHT_1, isLight: true, allowParticles: false },
    { name: 'bottom-right-2', value: BG_BOTTOM_RIGHT_2, isLight: true, allowParticles: false },
    { name: 'bottom-right-3', value: BG_BOTTOM_RIGHT_3, isLight: true, allowParticles: false }
];

const bgPresets = [
    ...bgTopLeftList,
    ...bgTopRightList,
    { name: 'bottom-left', value: BG_BOTTOM_LEFT, isLight: true, allowParticles: false },
    ...bgBottomRightList
];

// 全局切换聊天室打开/关闭（按需懒加载）
function toggleChatModal() {
    const chatModal = document.getElementById('chat-modal');
    const iframe = document.getElementById('chattable-iframe');
    
    if (chatModal) {
        const isOpening = !chatModal.classList.contains('active');
        if (isOpening && iframe && !iframe.src) {
            const dataSrc = iframe.getAttribute('data-src') || iframe.getAttribute('src');
            if (dataSrc) iframe.src = dataSrc;
            if (typeof window.chattable !== 'undefined' && window.chattable.initialize) {
                try { window.chattable.initialize(); } catch (e) {}
            }
        }
        chatModal.classList.toggle('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    pagesContainer = document.querySelector('.pages');
    bullets = document.querySelectorAll('.bullet');

    const btnThemeLight = document.getElementById('btn-theme-light');
    if (btnThemeLight) {
        btnThemeLight.addEventListener('click', () => {
            currentTopLeftStep = (currentTopLeftStep + 1) % bgTopLeftList.length;
            currentBgIndex = currentTopLeftStep;
            const p = bgTopLeftList[currentTopLeftStep];
            switchBackground(p.value, p.isLight, p.allowParticles);
        });
    }

    const btnThemeDark = document.getElementById('btn-theme-dark');
    if (btnThemeDark) {
        btnThemeDark.addEventListener('click', () => {
            currentTopRightStep = (currentTopRightStep + 1) % bgTopRightList.length;
            currentBgIndex = 3 + currentTopRightStep;
            const p = bgTopRightList[currentTopRightStep];
            switchBackground(p.value, p.isLight, p.allowParticles);
        });
    }

    const btnBg1 = document.getElementById('btn-bg-1');
    if (btnBg1) {
        btnBg1.addEventListener('click', () => {
            currentBgIndex = 6;
            switchBackground(BG_BOTTOM_LEFT, true, false);
        });
    }

    const btnBg2 = document.getElementById('btn-bg-2');
    if (btnBg2) {
        btnBg2.addEventListener('click', () => {
            currentBottomRightStep = (currentBottomRightStep + 1) % bgBottomRightList.length;
            currentBgIndex = 7 + currentBottomRightStep;
            const p = bgBottomRightList[currentBottomRightStep];
            switchBackground(p.value, p.isLight, p.allowParticles);
        });
    }

    document.querySelectorAll('.theme-toggle, .day-toggle').forEach(b => {
        const r = () => b.classList.remove('icon-shrink-force', 'icon-scale-active');
        b.addEventListener('mouseenter', r);
        b.addEventListener('mouseleave', r);
        b.addEventListener('click', function () {
            r();
            this.classList.add('icon-scale-active');
            setTimeout(() => {
                this.classList.remove('icon-scale-active');
                this.classList.add('icon-shrink-force');
            }, 350);
        });
    });

    const rewardContainer = document.getElementById('rewardContainer');
    if (rewardContainer) rewardContainer.addEventListener('click', () => rewardContainer.classList.toggle('show-qr'));
    
    const rewardWx = document.getElementById('reward-wx');
    if (rewardWx) rewardWx.addEventListener('click', e => e.stopPropagation());
    
    const rewardZfb = document.getElementById('reward-zfb');
    if (rewardZfb) rewardZfb.addEventListener('click', e => e.stopPropagation());

    const profilePic = document.getElementById('profile-pic');
    if (profilePic) profilePic.addEventListener('click', triggerConfetti);

    const spotifyWrap = document.getElementById('spotify-card-wrap');
    if (spotifyWrap) spotifyWrap.addEventListener('click', () => window.open('https://open.spotify.com/track/3UkRfA9F62DYYDzqOskoov', '_blank'));

    const btnSpotifyPlay = document.getElementById('btn-spotify-play');
    if (btnSpotifyPlay) btnSpotifyPlay.addEventListener('click', e => { e.stopPropagation(); togglePlay(e.currentTarget); });

    const btnVcard = document.getElementById('btn-vcard');
    if (btnVcard) btnVcard.addEventListener('click', () => typeof downloadVCard === 'function' && downloadVCard());

    if (bullets) bullets.forEach(b => b.addEventListener('click', function () { switchPageTo(parseInt(this.dataset.page)); }));

    if (typeof ClipboardJS !== 'undefined') {
        let clipboard = new ClipboardJS('#wechatBtn', { text: () => "lllIIllIIlIII" });
        clipboard.on('success', () => { alert('👉微信号复制成功,即将前往微信！'); window.location.href = 'wechat://'; });
    }

    // Chattable 弹窗绑定
    const chatModal = document.getElementById('chat-modal');
    const openChatBtn = document.getElementById('btn-open-chat');

    if (openChatBtn) {
        openChatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleChatModal();
        });
    }

    if (chatModal) {
        chatModal.addEventListener('click', (e) => {
            if (e.target === chatModal) {
                chatModal.classList.remove('active');
            }
        });
    }

    // 初始化核心模块（不再死等 window.onload）
    loadMusicPlayer();
    initKeyboardControls();
    isParticlesAllowedOnCurrentBg = false;
    updateParticlesDisplay();
    switchPageTo(2);
});

function updateParticlesDisplay() {
    const c = document.getElementById('shuicheCanvas');
    if (!c) return;
    const shouldShow = isParticlesAllowedOnCurrentBg && userParticlesPref;
    window.isParticlesEnabled = shouldShow;
    if (shouldShow) {
        c.style.display = 'block';
        if (window.bgEngine?.start) window.bgEngine.start();
    } else {
        c.style.display = 'none';
        if (window.bgEngine?.stop) window.bgEngine.stop();
    }
}

let bgLayerIndex = 0;
function crossfadeBackground(bgVal, isLight, allowParticles = false) {
    const curId = ++bgChangeSequence, container = document.getElementById('bg-container');
    if (!container) return;

    isParticlesAllowedOnCurrentBg = allowParticles;

    let rawVal = bgVal;
    const match = rawVal.match(/url\(['"]?(.*?)['"]?\)/);
    if (match) rawVal = match[1];

    let underColor = null;
    const colorMatch = rawVal.match(/\+color:([#0-9a-zA-Z(),.]+)/i);
    if (colorMatch) underColor = colorMatch[1];

    let maskColor = null;
    const maskMatch = rawVal.match(/\+mask:([#0-9a-zA-Z(),.]+)/i);
    if (maskMatch) maskColor = maskMatch[1];

    let blendMode = null;
    const blendMatch = rawVal.match(/\+blend:([a-z-]+)/i);
    if (blendMatch) blendMode = blendMatch[1];

    const filters = [];
    const satMatch = rawVal.match(/\+sat:([0-9.]+)/i);
    if (satMatch) filters.push(`saturate(${satMatch[1]})`);
    const contrastMatch = rawVal.match(/\+contrast:([0-9.]+)/i);
    if (contrastMatch) filters.push(`contrast(${contrastMatch[1]})`);
    const grayMatch = rawVal.match(/\+gray:([0-9.]+)/i);
    if (grayMatch) filters.push(`grayscale(${grayMatch[1]})`);
    const brightMatch = rawVal.match(/\+bright:([0-9.]+)/i);
    if (brightMatch) filters.push(`brightness(${brightMatch[1]})`);

    let targetOpacity = '1';
    const opacityMatch = rawVal.match(/@([0-9.]+)/);
    if (opacityMatch) targetOpacity = opacityMatch[1];

    const repeatMatch = rawVal.match(/#repeat(?::([^\s@+#'"]+))?/i);
    const isRepeat = !!repeatMatch || /repeat/i.test(rawVal);
    const repeatSize = repeatMatch && repeatMatch[1] ? repeatMatch[1] : 'auto';

    let cleanUrl = rawVal.split(/[#+@]/)[0].trim();
    if (cleanUrl.startsWith('http://')) {
        cleanUrl = cleanUrl.replace('http://', 'https://');
    }

    const isVideo = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(cleanUrl);
    const isWebGL = bgVal === 'webgl-shader';
    
    const start = (el = null) => {
        if (curId !== bgChangeSequence) return;
        bgLayerIndex++;
        const layer = document.createElement('div');
        layer.className = 'bg-layer';
        layer.style.zIndex = bgLayerIndex;

        if (filters.length > 0) layer.style.filter = filters.join(' ');
        if (blendMode) layer.style.backgroundBlendMode = blendMode;

        if (isWebGL) {
            if (typeof window.initWebGLShaderBg === 'function') layer._cleanup = window.initWebGLShaderBg(layer);
        } else if (isVideo && el) {
            el.style.width = el.style.height = "100%";
            el.style.objectFit = "cover";
            layer.appendChild(el);
        } else {
            if (/^https?|images\/|\.\//.test(cleanUrl)) {
                if (maskColor) {
                    layer.style.backgroundImage = `linear-gradient(${maskColor}, ${maskColor}), url('${cleanUrl}')`;
                    layer.style.backgroundSize = `auto, ${repeatSize}`;
                    layer.style.backgroundRepeat = `no-repeat, ${isRepeat ? 'repeat' : 'no-repeat'}`;
                    layer.style.backgroundPosition = 'center, top left';
                } else {
                    layer.style.backgroundImage = `url('${cleanUrl}')`;
                    layer.style.backgroundRepeat = isRepeat ? 'repeat' : 'no-repeat';
                    layer.style.backgroundPosition = isRepeat ? 'top left' : 'center';
                    layer.style.backgroundSize = isRepeat ? repeatSize : 'cover';
                }
                if (underColor) {
                    layer.style.backgroundColor = underColor;
                }
            } else {
                layer.style.background = bgVal;
            }
        }

        container.appendChild(layer);
        document.body.classList.toggle('light', isLight);
        document.documentElement.style.setProperty('--fg', isLight ? 'black' : '#f0f0f0');
        
        updateParticlesDisplay();

        void layer.offsetWidth;
        requestAnimationFrame(() => requestAnimationFrame(() => layer.style.opacity = targetOpacity));

        setTimeout(() => {
            if (curId !== bgChangeSequence) return;
            container.querySelectorAll('.bg-layer').forEach(l => {
                if (l !== layer) {
                    if (typeof l._cleanup === 'function') l._cleanup();
                    l.remove();
                }
            });
            updateParticlesDisplay();
        }, 850);
    };

    if (isWebGL) {
        start();
    } else if (isVideo) {
        const v = document.createElement('video');
        v.src = cleanUrl;
        v.muted = v.loop = v.playsInline = v.autoplay = true;
        v.onloadeddata = () => start(v);
        v.onerror = () => start();
    } else if (/^https?|images\//.test(cleanUrl)) {
        const img = new Image();
        img.src = cleanUrl;
        img.onload = img.onerror = () => start();
    } else {
        start();
    }
}

function switchBackground(v, isLight = true, allowParticles = false) {
    if (v === 'webgl-shader' || v.includes('gradient') || /^(#|rgb|hsl)/.test(v.trim())) {
        crossfadeBackground(v, isLight, allowParticles);
    } else {
        crossfadeBackground(v, isLight, allowParticles);
    }
}

// 双击屏幕手动切换粒子
(function initDoubleClickToggle() {
    let lastToggle = 0;
    const toggle = e => {
        let now = Date.now();
        if (now - lastToggle < 500) return;
        lastToggle = now;

        if (!isParticlesAllowedOnCurrentBg) return;
        if (e.target?.closest?.('#oneko, #oneko-skin-menu, a, button, svg, img, video, .bullet, .link-card, .spotify-card, .play-btn, .theme-toggle, .day-toggle, #chat-modal')) return;

        userParticlesPref = !userParticlesPref;
        localStorage.setItem('particlesPref', userParticlesPref);
        updateParticlesDisplay();
    };

    document.addEventListener('dblclick', toggle);
    let lastTouch = 0, multi = false;
    document.addEventListener('touchstart', e => { if (e.touches.length > 1) multi = true; }, { passive: true });
    document.addEventListener('touchend', e => {
        if (e.touches.length > 0) return;
        if (multi) { multi = false; lastTouch = 0; return; }
        let now = Date.now();
        if (now - lastTouch <= 400) { toggle(e); lastTouch = 0; } else lastTouch = now;
    });
})();

(function initBackgroundEngine() {
    const count = 1000;
    let scene, camera, renderer, animId = null, mouseX = 0, mouseY = 0, halfX = window.innerWidth / 2, halfY = window.innerHeight / 2, clock, geom, posAttr, posArr, velArr, resizeTimeout;
    function init() {
        if (typeof THREE === 'undefined') { setTimeout(init, 50); return; }
        const canvas = document.getElementById('shuicheCanvas');
        if (!canvas) return;
        clock = new THREE.Clock();
        geom = new THREE.BufferGeometry();
        posAttr = new THREE.BufferAttribute(new Float32Array(6 * count), 3);
        posAttr.setUsage(THREE.DynamicDrawUsage);
        geom.setAttribute('position', posAttr);
        geom.setAttribute('velocity', new THREE.BufferAttribute(new Float32Array(2 * count), 1));
        posArr = posAttr.array;
        velArr = geom.getAttribute('velocity').array;
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 1, 500);
        camera.position.z = 200;
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        renderer.setClearColor(0, 0);
        for (let i = 0; i < count; i++) {
            const x = Math.random() * 800 - 400, y = Math.random() * 800 - 400, z = Math.random() * 400 - 200;
            posArr[6 * i] = posArr[6 * i + 3] = x;
            posArr[6 * i + 1] = posArr[6 * i + 4] = y;
            posArr[6 * i + 2] = posArr[6 * i + 5] = z;
        }
        scene.add(new THREE.LineSegments(geom, new THREE.LineBasicMaterial({ color: 0xffffff })));
        window.addEventListener('resize', debounceResize, { passive: true });
        document.body.addEventListener('pointermove', e => { mouseX = e.clientX - halfX; mouseY = e.clientY - halfY; }, { passive: true });
        if (window.isParticlesEnabled) { clock.start(); anime(); }
    }
    function debounceResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (!renderer || !camera) return;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            halfX = window.innerWidth / 2;
            halfY = window.innerHeight / 2;
        }, 100);
    }
    function anime() {
        let delta = Math.min(clock.getDelta(), 0.1), ts = delta / (1 / 60);
        for (let i = 0; i < count; i++) {
            velArr[2 * i] += 0.015 * ts;
            velArr[2 * i + 1] += 0.015 * ts;
            posArr[6 * i + 2] += (velArr[2 * i] + 0.03) * ts;
            posArr[6 * i + 5] += velArr[2 * i + 1] * ts;
            if (posArr[6 * i + 2] > 200) {
                let z = Math.random() * 200 - 200;
                posArr[6 * i + 2] = posArr[6 * i + 5] = z;
                velArr[2 * i] = velArr[2 * i + 1] = 0;
            }
        }
        posAttr.needsUpdate = true;
        camera.position.x += (-mouseX * 0.1 - camera.position.x) * 0.02;
        camera.position.y += (-mouseY * 0.1 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
        animId = requestAnimationFrame(anime);
    }
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && animId !== null) { cancelAnimationFrame(animId); animId = null; }
        else if (!document.hidden && animId === null && window.isParticlesEnabled) { clock?.start(); anime(); }
    });
    window.bgEngine = { start: () => { if (animId === null) { clock?.start(); anime(); } }, stop: () => { if (animId !== null) { cancelAnimationFrame(animId); animId = null; } } };
    window.bgRenderer = { setClearColor: (c, a) => renderer?.setClearColor(c, a) };
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

function updateGlowingShadow() { if (glowingCard) glowingCard.style.boxShadow = '0px 10px 15px rgba(0, 0, 0, 0), 0 0 56px #fff inset'; }
function switchPageTo(page) {
    if (page < 1 || page > 3) return;
    currentPage = page;
    if (pagesContainer) pagesContainer.style.transform = `translateX(-${(page - 1) * 100}%)`;
    if (bullets) bullets.forEach(b => b.classList.toggle('active', parseInt(b.dataset.page) === page));
}

function togglePlay(btn) {
    if (!audio) return;
    if (audio.paused) {
        audio.play().catch(()=>{});
        btn.classList.add('playing');
        btn.querySelector('.btn-text').innerText = 'Pause';
        isPlaying = true;
    } else {
        audio.pause();
        btn.classList.remove('playing');
        btn.querySelector('.btn-text').innerText = 'Play';
        isPlaying = false;
    }
}
if (audio) {
    audio.addEventListener('ended', () => {
        isPlaying = false;
        const btn = document.querySelector('.play-btn');
        if (btn) { btn.classList.remove('playing'); btn.querySelector('.btn-text').innerText = 'Play'; }
    });
}
document.addEventListener('play', e => {
    document.querySelectorAll('audio').forEach(el => {
        if (el !== e.target && !el.paused) {
            el.pause();
            if (el.id === 'audioPlayer') {
                const btn = document.querySelector('.play-btn');
                if (btn) { btn.classList.remove('playing'); btn.querySelector('.btn-text').innerText = 'Play'; }
                isPlaying = false;
            }
        }
    });
}, true);

function loadMusicPlayer() {
    const root = document.querySelector("#root"), mainAudio = document.getElementById('mainAudio');
    if (!root || !mainAudio) return;

    let indexSong = 0, pendingCurrentTime = 0, isLocked = false, songsLength = null, selectedSong = null, songIsPlayed = false, progress_elmnt = null, songName_elmnt = null, sliderImgs_elmnt = null, singerName_elmnt = null, musicPlayerInfo_elmnt = null, progressBarIsUpdating = false, broadcastGuarantor_elmnt = null, isSwitchingMusic = false, preloadAbortController = null;
    window.musicControls = { playPause: handlePlayMusic, next: () => handleChangeMusic({ isPrev: false }), prev: () => handleChangeMusic({ isPrev: true }) };

    function savePlaybackState() {
        if (selectedSong) localStorage.setItem('musicPlayerState', JSON.stringify({ currentSongIndex: indexSong, isPlaying: !selectedSong.paused, volume: selectedSong.volume, currentTime: pendingCurrentTime > 0 ? pendingCurrentTime : selectedSong.currentTime }));
    }
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && savePlaybackState());
    window.addEventListener('beforeunload', savePlaybackState);
    setInterval(savePlaybackState, 5000);

    function updateUIForSong(idx) {
        updateInfo(songName_elmnt, songs[idx].songName);
        updateInfo(singerName_elmnt, songs[idx].artist);
        setProperty(sliderImgs_elmnt, "--index", -idx);
        if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: songs[idx].songName, artist: songs[idx].artist, artwork: [{ src: songs[idx].files.cover, sizes: '512x512', type: 'image/jpeg' }] });
    }
    function restorePlaybackState() {
        try {
            const state = localStorage.getItem('musicPlayerState');
            if (!state) { updateUIForSong(0); return; }
            const s = JSON.parse(state);
            if (s.currentSongIndex !== undefined && s.currentSongIndex >= 0 && s.currentSongIndex <= songsLength) {
                indexSong = s.currentSongIndex;
                if (s.currentTime !== undefined) pendingCurrentTime = s.currentTime;
                if (s.volume !== undefined) mainAudio.volume = s.volume;
                updateUIForSong(indexSong);
            } else updateUIForSong(0);
        } catch (e) { updateUIForSong(0); }
    }
    function preloadNextSongHead(nextIdx) {
        if (!songs[nextIdx]?.files.song) return;
        if (preloadAbortController) preloadAbortController.abort();
        preloadAbortController = new AbortController();
        fetch(songs[nextIdx].files.song, { headers: { 'Range': 'bytes=0-524288' }, signal: preloadAbortController.signal }).catch(() => { });
    }
    function handleChangeMusic({ isPrev = false, playListIndex = null }) {
        if (isLocked) return;
        let newIdx = playListIndex !== null ? playListIndex : (isPrev ? indexSong - 1 : indexSong + 1);
        if (newIdx < 0) newIdx = songsLength;
        if (newIdx > songsLength) newIdx = 0;
        if (newIdx === indexSong && playListIndex === null) return;
        let wasPlaying = songIsPlayed;
        isSwitchingMusic = true;
        indexSong = newIdx;
        pendingCurrentTime = 0;
        updateUIForSong(indexSong);
        mainAudio.src = songs[indexSong].files.song;
        if (wasPlaying) {
            let p = mainAudio.play();
            if (p !== undefined) {
                p.then(() => { isSwitchingMusic = false; }).catch(() => { isSwitchingMusic = songIsPlayed = false; if (broadcastGuarantor_elmnt) broadcastGuarantor_elmnt.classList.remove("click"); });
            }
            songIsPlayed = true;
            if (broadcastGuarantor_elmnt) broadcastGuarantor_elmnt.classList.add("click");
            preloadNextSongHead(indexSong + 1 > songsLength ? 0 : indexSong + 1);
        } else {
            isSwitchingMusic = false;
            preloadAbortController?.abort();
        }
        savePlaybackState();
    }
    function handlePlayMusic() {
        if (mainAudio.currentTime === mainAudio.duration && mainAudio.duration > 0) { handleChangeMusic({}); return; }
        if (!mainAudio.src || mainAudio.src === window.location.href || mainAudio.src === "") {
            mainAudio.src = songs[indexSong].files.song;
            mainAudio.play().catch(()=>{});
            songIsPlayed = true;
            if (broadcastGuarantor_elmnt) broadcastGuarantor_elmnt.classList.add("click");
            preloadNextSongHead(indexSong + 1 > songsLength ? 0 : indexSong + 1);
        } else mainAudio.paused ? (mainAudio.play().catch(()=>{}), preloadNextSongHead(indexSong + 1 > songsLength ? 0 : indexSong + 1)) : mainAudio.pause();
    }
    function updateTheProgressBar() {
        const d = this.duration, c = this.currentTime;
        if (isNaN(d) || d === 0 || !progress_elmnt) return;
        const r = c / d;
        setProperty(progress_elmnt, "--scale", r);
        setProperty(progress_elmnt, "--width", `${r * 100}%`);
    }
    function syncMediaSessionPosition() {
        if ('mediaSession' in navigator && !isNaN(mainAudio.duration) && isFinite(mainAudio.duration) && mainAudio.duration > 0) {
            try {
                let p = Math.max(0, Math.min(mainAudio.currentTime || 0, mainAudio.duration));
                navigator.mediaSession.setPositionState({ duration: mainAudio.duration, playbackRate: mainAudio.playbackRate || 1, position: p });
            } catch (e) { }
        }
    }
    function handleScrub(e) {
        e.preventDefault();
        if (!progress_elmnt) return;
        let cx = e.touches ? e.touches[0].clientX : e.clientX;
        const rect = progress_elmnt.getBoundingClientRect(), d = selectedSong.duration;
        if (isNaN(d) || d === 0) return;
        selectedSong.currentTime = (cx - rect.left) / progress_elmnt.offsetWidth * d;
    }
    const songs = [
        { "bg": "#c9bea28f", "artist": "SCSI-9", "songName": "Senorita Tristeza", "files": { "song": "music/Senorita Tristeza.mp3", "cover": "music/Senorita Tristeza.webp" }, "duration": "5:53" },
        { "bg": "#0896eba1", "artist": "Paradox Interactive", "songName": "Be Happy", "files": { "song": "music/Be Happy.mp3", "cover": "music/Be Happy.webp" }, "duration": "3:22" },
        { "bg": "#ebbe03", "artist": "Flower Face", "songName": "Jupiter", "files": { "song": "music/Jupiter.mp3", "cover": "music/Jupiter.webp" }, "duration": "4:31" },
        { "bg": "#ffc382", "artist": "La Femme", "songName": "Le jardin", "files": { "song": "music/Le jardin.mp3", "cover": "music/Le jardin.webp" }, "duration": "4:00" },
        { "bg": "#ffcbdc", "artist": "Still Corners", "songName": "Crying", "files": { "song": "music/Crying.mp3", "cover": "music/Crying.webp" }, "duration": "3:28" },
        { "bg": "#44c16fb5", "artist": "Marvel83'", "songName": "Alone With You", "files": { "song": "music/Alone With You.mp3", "cover": "music/Alone With You.webp" }, "duration": "4:53" },
        { "bg": "#ff4545", "artist": "Timecop1983", "songName": "Nightfall", "files": { "song": "music/Nightfall.mp3", "cover": "music/Nightfall.webp" }, "duration": "4:40" },
        { "bg": "#e5e7e9", "artist": "Lazer Boomerang", "songName": "R3cover", "files": { "song": "music/R3cover.mp3", "cover": "music/R3cover.webp" }, "duration": "3:34" }
    ];
    const musicPlayer = document.createElement("div"); musicPlayer.className = "music-player flex-column";
    const slider = document.createElement("div"); slider.className = "slider center"; slider.onclick = handleResizeSlider;
    const sliderContent = document.createElement("div"); sliderContent.className = "slider__content center";
    const playlistButton = document.createElement("button"); playlistButton.className = "music-player__playlist-button center button"; playlistButton.innerHTML = '<i class="icon-playlist"></i>';
    const broadcastGuarantor = document.createElement("button"); broadcastGuarantor.className = "music-player__broadcast-guarantor center button"; broadcastGuarantor.onclick = handlePlayMusic; broadcastGuarantor.innerHTML = '<i class="icon-play"></i><i class="icon-pause"></i>';
    const sliderImgs = document.createElement("div"); sliderImgs.className = "slider__imgs flex-row";
    songs.forEach(({ files: { cover }, songName }) => { const img = document.createElement("img"); img.src = cover; img.loading = "lazy"; img.className = "img"; img.alt = songName; sliderImgs.appendChild(img); });
    sliderContent.append(playlistButton, broadcastGuarantor, sliderImgs);
    const sliderControls = document.createElement("div"); sliderControls.className = "slider__controls center";
    const prevButton = document.createElement("button"); prevButton.className = "slider__switch-button flex-row button"; prevButton.innerHTML = '<i class="icon-back"></i>'; prevButton.onclick = () => handleChangeMusic({ isPrev: true });
    const musicInfo = document.createElement("div"); musicInfo.className = "music-player__info text_trsf-cap"; musicInfo.innerHTML = `<div><div class="music-player__singer-name"><div>${songs[0].songName}</div></div></div><div><div class="music-player__subtitle"><div>${songs[0].artist}</div></div></div>`;
    const nextButton = document.createElement("button"); nextButton.className = "slider__switch-button flex-row button"; nextButton.innerHTML = '<i class="icon-next"></i>'; nextButton.onclick = () => handleChangeMusic({ isPrev: false });
    const progress = document.createElement("div"); progress.className = "progress center"; progress.onpointerdown = e => { e.preventDefault(); handleScrub(e); progressBarIsUpdating = true; };
    const progressWrapper = document.createElement("div"); progressWrapper.className = "progress__wrapper"; const progressBar = document.createElement("div"); progressBar.className = "progress__bar"; const progressDot = document.createElement("div"); progressDot.className = "progress__dot";
    progressWrapper.appendChild(progressBar); progressWrapper.appendChild(progressDot); progress.appendChild(progressWrapper); sliderControls.append(prevButton, musicInfo, nextButton, progress); slider.append(sliderContent, sliderControls);
    const playlist = document.createElement("ul"); playlist.className = "music-player__playlist list";
    songs.forEach((song, index) => {
        const listItem = document.createElement("li"); listItem.className = "music-player__song"; listItem.dataset.index = index;
        listItem.innerHTML = `<div class="flex-row _align_center"><img src="${song.files.cover}" loading="lazy" class="img music-player__song-img" alt="${song.songName}"><div class="music-player__playlist-info text_trsf-cap"><b class="text_overflow">${song.songName}</b><div class="flex-row _justify_space-btwn"><span class="music-player__subtitle">${song.artist}</span><span class="music-player__song-duration">${song.duration}</span></div></div></div>`;
        playlist.appendChild(listItem);
    });
    playlist.addEventListener('click', e => { const item = e.target.closest('.music-player__song'); if (item) handleChangeMusic({ playListIndex: parseInt(item.dataset.index, 10) }); });
    musicPlayer.append(slider, playlist); root.innerHTML = ''; root.appendChild(musicPlayer);
    songsLength = songs.length - 1; progress_elmnt = document.querySelector(".progress"); sliderImgs_elmnt = document.querySelector(".slider__imgs"); songName_elmnt = document.querySelector(".music-player__singer-name"); musicPlayerInfo_elmnt = document.querySelector(".music-player__info"); singerName_elmnt = document.querySelector(".music-player__subtitle"); broadcastGuarantor_elmnt = document.querySelector(".music-player__broadcast-guarantor"); selectedSong = mainAudio;
    mainAudio.addEventListener('timeupdate', updateTheProgressBar);
    mainAudio.addEventListener('ended', () => { if (songIsPlayed) handleChangeMusic({}); });
    mainAudio.addEventListener('loadedmetadata', () => { if (pendingCurrentTime > 0) { mainAudio.currentTime = pendingCurrentTime; pendingCurrentTime = 0; } syncMediaSessionPosition(); });
    mainAudio.addEventListener('durationchange', syncMediaSessionPosition);
    mainAudio.addEventListener('play', () => { songIsPlayed = true; if (broadcastGuarantor_elmnt) broadcastGuarantor_elmnt.classList.add("click"); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; syncMediaSessionPosition(); });
    mainAudio.addEventListener('pause', () => { setTimeout(() => { if (mainAudio.paused && !isSwitchingMusic) { songIsPlayed = false; if (broadcastGuarantor_elmnt) broadcastGuarantor_elmnt.classList.remove("click"); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; syncMediaSessionPosition(); } }, 100); });
    mainAudio.addEventListener('seeked', syncMediaSessionPosition);
    controlSubtitleAnimation(musicPlayerInfo_elmnt, songName_elmnt);
    controlSubtitleAnimation(musicPlayerInfo_elmnt, singerName_elmnt);
    setTimeout(restorePlaybackState, 100);
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('previoustrack', () => handleChangeMusic({ isPrev: true }));
        navigator.mediaSession.setActionHandler('nexttrack', () => handleChangeMusic({ isPrev: false }));
        navigator.mediaSession.setActionHandler('play', () => mainAudio.play());
        navigator.mediaSession.setActionHandler('pause', () => mainAudio.pause());
        navigator.mediaSession.setActionHandler('seekto', details => { if (details.seekTime != null) mainAudio.currentTime = details.seekTime; });
    }
    function handleResizeSlider({ target }) {
        if (isLocked) return;
        if (target.classList.contains("music-player__info")) { this.classList.add("resize"); setProperty(this, "--controls-animate", "down running"); }
        else if (target.classList.contains("music-player__playlist-button")) { this.classList.remove("resize"); setProperty(this, "--controls-animate", "up running"); }
    }
    function controlSubtitleAnimation(p, c) {
        if (!p || !c || c.classList.contains("animate")) return;
        const el = c.firstChild;
        if (el && c.clientWidth > p.clientWidth) { c.appendChild(el.cloneNode(true)); c.classList.add("animate"); }
        if (el) setProperty(c.parentElement, "width", `${el.clientWidth}px`);
    }
    function setProperty(target, prop, val = "") { if (target) target.style.setProperty(prop, val); }
    function updateInfo(target, val) { if (!target) return; while (target.firstChild) target.removeChild(target.firstChild); const child = document.createElement("div"); child.appendChild(document.createTextNode(val)); target.appendChild(child); target.classList.remove("animate"); controlSubtitleAnimation(musicPlayerInfo_elmnt, target); }
    function handleResize() { setProperty(document.documentElement, "--vH", `${window.innerHeight * 0.01}px`); }
    window.addEventListener("resize", handleResize);
    window.addEventListener("transitionstart", ({ target }) => { if (target === sliderImgs_elmnt) { isLocked = true; setProperty(sliderImgs_elmnt, "will-change", "transform"); } });
    window.addEventListener("transitionend", ({ target, propertyName }) => { if (target === sliderImgs_elmnt) isLocked = false; if (target && target.classList.contains("slider") && propertyName === "height") { controlSubtitleAnimation(musicPlayerInfo_elmnt, songName_elmnt); controlSubtitleAnimation(musicPlayerInfo_elmnt, singerName_elmnt); } });
    const stopScrub = () => { if (progressBarIsUpdating) selectedSong.muted = progressBarIsUpdating = false; };
    const moveScrub = e => { if (progressBarIsUpdating) { e.preventDefault(); handleScrub(e); selectedSong.muted = true; } };
    window.addEventListener("pointerup", stopScrub);
    window.addEventListener("pointermove", moveScrub);
    window.addEventListener("touchend", stopScrub);
    window.addEventListener("touchmove", moveScrub);
    handleResize();
}

function initKeyboardControls() {
    document.addEventListener('keydown', e => {
        const key = e.key.toLowerCase();
        
        if (key === 'z') typeof window.onekoSleep === 'function' && window.onekoSleep();
        if (key === 's') typeof window.onekoCycleSkin === 'function' && window.onekoCycleSkin();
        if (key === 'k') typeof window.onekoToggleSkinMenu === 'function' && window.onekoToggleSkinMenu();
        
        if (key === 'c') {
            e.preventDefault();
            toggleChatModal();
        }
        
        if (e.key === 'Escape') {
            const chatModal = document.getElementById('chat-modal');
            if (chatModal && chatModal.classList.contains('active')) {
                chatModal.classList.remove('active');
            }
        }

        if (key === 'n' || key === 'm') triggerConfetti();
        
        if (key === 't') {
            currentBgIndex = (currentBgIndex + 1) % bgPresets.length;
            const p = bgPresets[currentBgIndex];
            switchBackground(p.value, p.isLight, p.allowParticles);
        }
        if (key === '1') {
            currentTopLeftStep = (currentTopLeftStep + 1) % bgTopLeftList.length;
            currentBgIndex = currentTopLeftStep;
            const p = bgTopLeftList[currentTopLeftStep];
            switchBackground(p.value, p.isLight, p.allowParticles);
        }
        if (key === '2') {
            currentTopRightStep = (currentTopRightStep + 1) % bgTopRightList.length;
            currentBgIndex = 3 + currentTopRightStep;
            const p = bgTopRightList[currentTopRightStep];
            switchBackground(p.value, p.isLight, p.allowParticles);
        }
        if (key === '3') {
            currentBgIndex = 6;
            switchBackground(BG_BOTTOM_LEFT, true, false);
        }
        if (key === '4') {
            currentBottomRightStep = (currentBottomRightStep + 1) % bgBottomRightList.length;
            currentBgIndex = 7 + currentBottomRightStep;
            const p = bgBottomRightList[currentBottomRightStep];
            switchBackground(p.value, p.isLight, p.allowParticles);
        }
        if (key === 'p') {
            if (isParticlesAllowedOnCurrentBg) {
                userParticlesPref = !userParticlesPref;
                localStorage.setItem('particlesPref', userParticlesPref);
                updateParticlesDisplay();
            }
        }
        if (!e.shiftKey) {
            if (e.key === 'ArrowRight') switchPageTo(currentPage + 1 > 3 ? 1 : currentPage + 1);
            if (e.key === 'ArrowLeft') switchPageTo(currentPage - 1 < 1 ? 3 : currentPage - 1);
            if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && currentPage === 1) {
                const pv = document.querySelector('#page1 .page-vertical');
                if (pv) {
                    e.preventDefault();
                    pv.scrollBy({ top: (e.key === 'ArrowUp' ? -1 : 1) * pv.clientHeight, behavior: 'smooth' });
                }
            }
        }
        if (window.musicControls) {
            if (e.code === 'Space') { e.preventDefault(); window.musicControls.playPause(); }
            if (e.shiftKey) {
                if (e.key === 'ArrowRight') window.musicControls.next();
                if (e.key === 'ArrowLeft') window.musicControls.prev();
            }
        }
    });
}

const scrollContainer = document.querySelector('.link-scroll-container');
let scrollTimeout;
if (scrollContainer) {
    scrollContainer.addEventListener('scroll', () => {
        scrollContainer.classList.add('scrolling');
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => scrollContainer.classList.remove('scrolling'), 1500);
    }, { passive: true });
}

let avatarSound = null;
async function initAvatarSound() {
    const audioUrl = "images/Cat.wav";
    try {
        const response = await fetch(audioUrl, { cache: 'force-cache' });
        const audioBlob = await response.blob();
        const blobUrl = URL.createObjectURL(audioBlob);
        avatarSound = new Audio(blobUrl);
        avatarSound.volume = 0.35;
    } catch (error) {
        avatarSound = new Audio(audioUrl);
        avatarSound.volume = 0.35;
    }
}
if ('requestIdleCallback' in window) { requestIdleCallback(() => initAvatarSound()); } else { setTimeout(initAvatarSound, 1500); }

function triggerConfetti() {
    if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 100 });
    if (avatarSound) { avatarSound.currentTime = 0; avatarSound.play().catch(e => console.log(e)); }
}

const video = document.getElementById('page1Video');
let videoLoaded = false;
if ('IntersectionObserver' in window && video) {
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!videoLoaded) { video.src = "music/Movie.MP4"; videoLoaded = true; }
                video.muted = true;
                video.play().catch(() => { });
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.5 });
    
    // 安全查找视频容器（兼容 page1-4 或 page1-5）
    const videoTarget = document.getElementById('page1-5') || document.getElementById('page1-4');
    if (videoTarget) {
        videoObserver.observe(videoTarget);
    }
}
if (video) video.addEventListener('click', () => video.muted = false);

const linkCards = document.querySelectorAll('.link-card');
linkCards.forEach(card => {
    const titleSpan = card.querySelector('.link-title');
    if (titleSpan && titleSpan.textContent) {
        const text = titleSpan.textContent.trim();
        titleSpan.innerHTML = `<span class="glitch-text" data-text="${text}">${text}</span>`;
    }
    const glitchEl = card.querySelector('.glitch-text');
    const startGlitch = () => { if (glitchEl) glitchEl.classList.add('active'); };
    const stopGlitch = () => { if (glitchEl) glitchEl.classList.remove('active'); };
    card.addEventListener('mouseenter', startGlitch);
    card.addEventListener('mouseleave', stopGlitch);
    card.addEventListener('touchstart', startGlitch, { passive: true });
    card.addEventListener('touchend', stopGlitch);
    card.addEventListener('touchcancel', stopGlitch);
});

// Oneko 猫咪跟随模块（自适配生命周期）
(function onekoInit() {
    function startOneko() {
        const nekoEl = document.createElement("div");
        const skinList = [
            { name: "classic", url: "images/oneko-classic.gif" }, { name: "black2", url: "images/black2.png" },
            { name: "black", url: "images/black.png" }, { name: "calico", url: "images/calico.png" },
            { name: "blue", url: "images/blue.png" }, { name: "holiday", url: "images/holiday.png" },
            { name: "kina", url: "images/kina.png" }, { name: "lucky", url: "images/lucky.png" },
            { name: "marmalade", url: "images/marmalade.png" }, { name: "mermaid", url: "images/mermaid.png" },
            { name: "usa", url: "images/usa.png" }, { name: "neon", url: "images/neon.png" },
            { name: "pink", url: "images/pink.png" }, { name: "socks", url: "images/socks.png" },
            { name: "dog", url: "images/dog.png" }
        ];
        const skinMenu = document.createElement("div");
        skinMenu.id = "oneko-skin-menu";
        skinMenu.style.cssText = `position:fixed;display:none;grid-template-columns:repeat(5, 32px);grid-template-rows:repeat(3, 32px);gap:8px;background:rgba(255,255,255,0.15);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);border:1px solid rgba(255,255,255,0.4);border-radius:12px;padding:10px;z-index:10000;box-shadow:0 4px 15px rgba(0,0,0,0), 0 0 90px rgba(255,255,255,0.4) inset;`;
        skinList.forEach(s => {
            const item = document.createElement("div");
            item.style.cssText = `width:32px;height:32px;background-color:rgba(0,0,0,0);background-image:url('${s.url}');background-position:-222px -95px;image-rendering:pixelated;cursor:var(--cursor-img),pointer;border-radius:4px;border:2px solid transparent;transition:border 0.2s, transform 0.2s;`;
            item.title = s.name;
            item.onmouseenter = () => { item.style.border = "1px solid #c299ff"; item.style.transform = "scale(1.1)"; };
            item.onmouseleave = () => { item.style.border = "1px solid transparent"; item.style.transform = "scale(1)"; };
            item.onclick = e => { e.stopPropagation(); changeSkin(s.url); };
            skinMenu.appendChild(item);
        });
        document.body.appendChild(skinMenu);

        function changeSkin(url) { if (url) { nekoEl.style.backgroundImage = `url('${url}')`; localStorage.setItem("oneko:skin", url); } }
        function showSkinMenu() {
            skinMenu.style.display = "grid";
            const w = skinMenu.offsetWidth, h = skinMenu.offsetHeight, rect = nekoEl.getBoundingClientRect();
            skinMenu.style.left = rect.left < window.innerWidth / 2 ? `${rect.right + 10}px` : `${rect.left - w - 10}px`;
            let top = rect.top + (rect.height / 2) - (h / 2);
            if (top + h > window.innerHeight) top = window.innerHeight - h - 10;
            skinMenu.style.top = `${Math.max(10, top)}px`;
        }
        window.onekoToggleSkinMenu = () => skinMenu.style.display === "grid" ? skinMenu.style.display = "none" : showSkinMenu();
        window.onekoCycleSkin = () => {
            const cur = localStorage.getItem("oneko:skin") || "images/oneko-classic.gif";
            let idx = (skinList.findIndex(s => s.url === cur) + 1) % skinList.length;
            changeSkin(skinList[idx].url);
        };
        document.addEventListener("pointerdown", e => { if (skinMenu.style.display === "grid" && e.target !== nekoEl && !skinMenu.contains(e.target)) skinMenu.style.display = "none"; });
        
        let nekoPosX = 32, nekoPosY = 32, mousePosX = 32, mousePosY = 32, frameCount = 0, idleTime = 0, idleAnimation = null, idleAnimationFrame = 0, forceSleep = false, grabbing = false, grabStop = true, nudge = false, kuroNeko = false, variant = "classic", lastClickTime = 0;
        function parseLocalStorage(k, f) { try { const v = JSON.parse(localStorage.getItem(`oneko:${k}`)); return typeof v === typeof f ? v : f; } catch (e) { return f; } }
        const nekoSpeed = 10, variants = [["classic", "Classic"], ["dog", "Dog"], ["tora", "Tora"], ["maia", "Maia"], ["vaporwave", "Vaporwave"]],
            spriteSets = { idle: [[-3, -3]], alert: [[-7, -3]], scratchSelf: [[-5, 0], [-6, 0], [-7, 0]], scratchWallN: [[0, 0], [0, -1]], scratchWallS: [[-7, -1], [-6, -2]], scratchWallE: [[-2, -2], [-2, -3]], scratchWallW: [[-4, 0], [-4, -1]], tired: [[-3, -2]], sleeping: [[-2, 0], [-2, -1]], N: [[-1, -2], [-1, -3]], NE: [[0, -2], [0, -3]], E: [[-3, 0], [-3, -1]], SE: [[-5, -1], [-5, -2]], S: [[-6, -3], [-7, -2]], SW: [[-5, -3], [-6, -1]], W: [[-4, -2], [-4, -3]], NW: [[-1, 0], [-1, -1]] };
        function sleep() { forceSleep = !forceSleep; nudge = false; localStorage.setItem("oneko:forceSleep", forceSleep); if (forceSleep) mousePosX = nekoPosX, mousePosY = nekoPosY; else resetIdleAnimation(); }
        window.onekoSleep = sleep;
        
        function create() {
            variant = parseLocalStorage("variant", "classic");
            kuroNeko = parseLocalStorage("kuroneko", false);
            if (!variants.some(v => v[0] === variant)) variant = "classic";
            const saved = localStorage.getItem("oneko:skin") || "images/oneko-classic.gif";
            nekoEl.id = "oneko";
            nekoEl.style.width = nekoEl.style.height = "32px";
            nekoEl.style.position = "fixed";
            nekoEl.style.backgroundImage = `url('${saved}')`;
            nekoEl.style.imageRendering = "pixelated";
            nekoEl.style.left = `${nekoPosX - 16}px`;
            nekoEl.style.top = `${nekoPosY - 16}px`;
            nekoEl.style.filter = kuroNeko ? "invert(100%)" : "none";
            nekoEl.style.zIndex = "9999";
            nekoEl.style.touchAction = nekoEl.style.userSelect = nekoEl.style.webkitUserSelect = "none";
            document.body.appendChild(nekoEl);
            
            function updateMousePos(e) {
                if (skinMenu.style.display === "grid") {
                    const rect = skinMenu.getBoundingClientRect();
                    if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) return;
                }
                let offL = window.visualViewport?.offsetLeft || 0, offT = window.visualViewport?.offsetTop || 0;
                mousePosX = e.clientX + offL;
                mousePosY = e.clientY + offT;
            }
            window.addEventListener("mousemove", e => !forceSleep && updateMousePos(e));
            window.addEventListener("pointermove", e => !forceSleep && e.pointerType === "touch" && updateMousePos(e));
            function handleResize() {
                if (window.visualViewport) {
                    let offL = window.visualViewport.offsetLeft, offT = window.visualViewport.offsetTop, w = window.visualViewport.width, h = window.visualViewport.height;
                    if (mousePosX < offL || mousePosX > offL + w || mousePosY < offT || mousePosY > offT + h) { mousePosX = offL + w / 2; mousePosY = offT + h / 2; }
                }
                if (forceSleep) { forceSleep = false; sleep(); }
            }
            window.addEventListener("resize", handleResize);
            if (window.visualViewport) { window.visualViewport.addEventListener("resize", handleResize); window.visualViewport.addEventListener("scroll", handleResize); }
            
            let clickTimeout = null;
            nekoEl.addEventListener("pointerdown", e => {
                if (e.button !== 0 && e.pointerType === "mouse") return;
                e.preventDefault();
                grabbing = true;
                let isDragging = false;
                try { nekoEl.setPointerCapture?.(e.pointerId); } catch (_) { }
                let startX = e.clientX, startY = e.clientY, startNekoX = nekoPosX, startNekoY = nekoPosY, grabInterval;
                const moveHandler = e => {
                    e.preventDefault();
                    const dx = e.clientX - startX, dy = e.clientY - startY, adx = Math.abs(dx), ady = Math.abs(dy);
                    if (adx > 5 || ady > 5) isDragging = true;
                    if (adx > ady && adx > 10) setSprite(dx > 0 ? "scratchWallW" : "scratchWallE", frameCount);
                    else if (ady > adx && dy > 10) setSprite(dy > 0 ? "scratchWallN" : "scratchWallS", frameCount);
                    if (grabStop || adx > 10 || ady > 10 || Math.sqrt(dx ** 2 + dy ** 2) > 10) {
                        grabStop = false;
                        clearTimeout(grabInterval);
                        grabInterval = setTimeout(() => { grabStop = true; nudge = false; startX = e.clientX; startY = e.clientY; startNekoX = nekoPosX; startNekoY = nekoPosY; }, 150);
                    }
                    nekoPosX = startNekoX + dx;
                    nekoPosY = startNekoY + dy;
                    nekoEl.style.left = `${nekoPosX - 16}px`;
                    nekoEl.style.top = `${nekoPosY - 16}px`;
                };
                const upHandler = e => {
                    grabbing = false;
                    nudge = true;
                    resetIdleAnimation();
                    window.removeEventListener("pointermove", moveHandler);
                    window.removeEventListener("pointerup", upHandler);
                    window.removeEventListener("pointercancel", upHandler);
                    try { nekoEl.releasePointerCapture?.(e.pointerId); } catch (_) { }
                    if (!isDragging) {
                        const cur = Date.now();
                        if (cur - lastClickTime < 300) { clearTimeout(clickTimeout); sleep(); lastClickTime = 0; }
                        else { lastClickTime = cur; clickTimeout = setTimeout(() => { if (forceSleep) sleep(); showSkinMenu(); }, 300); }
                    }
                };
                window.addEventListener("pointermove", moveHandler, { passive: false });
                window.addEventListener("pointerup", upHandler);
                window.addEventListener("pointercancel", upHandler);
            });
            nekoEl.addEventListener("contextmenu", e => { e.preventDefault(); kuroNeko = !kuroNeko; localStorage.setItem("oneko:kuroneko", kuroNeko); nekoEl.style.filter = kuroNeko ? "invert(100%)" : "none"; });
            window.onekoInterval = setInterval(frame, 100);
        }
        function getSprite(name, frame) { return spriteSets[name][frame % spriteSets[name].length]; }
        function setSprite(name, frame) { const s = getSprite(name, frame); nekoEl.style.backgroundPosition = `${s[0] * 32}px ${s[1] * 32}px`; }
        function resetIdleAnimation() { idleAnimation = null; idleAnimationFrame = 0; }
        function idle() {
            idleTime += 1;
            if (idleTime > 10 && Math.floor(Math.random() * 25) === 0 && idleAnimation == null) {
                let av = ["scratchSelf", "sleeping", "scratchSelf", "sleeping", "scratchSelf"], scW = false, scN = false, scE = false, scS = false;
                let offL = window.visualViewport?.offsetLeft || 0, offT = window.visualViewport?.offsetTop || 0;
                let vW = window.visualViewport?.width || window.innerWidth, vH = window.visualViewport?.height || window.innerHeight;
                if (nekoPosX < offL + 32) scW = true;
                if (nekoPosY < offT + 32) scN = true;
                if (nekoPosX > offL + vW - 32) scE = true;
                if (nekoPosY > offT + vH - 32) scS = true;
                document.querySelectorAll('.glowing-card, .spotify-card, .link-card').forEach(card => {
                    const r = card.getBoundingClientRect();
                    if (!r.width || !r.height) return;
                    const rL = r.left + offL, rR = r.right + offL, rT = r.top + offT, rB = r.bottom + offT, t = 32;
                    if (nekoPosY >= rT - t && nekoPosY <= rB + t) {
                        if (Math.abs(nekoPosX - rL) <= t) { if (nekoPosX <= rL) scE = true; else scW = true; }
                        if (Math.abs(nekoPosX - rR) <= t) { if (nekoPosX >= rR) scW = true; else scE = true; }
                    }
                    if (nekoPosX >= rL - t && nekoPosX <= rR + t) {
                        if (Math.abs(nekoPosY - rT) <= t) { if (nekoPosY <= rT) scS = true; else scN = true; }
                        if (Math.abs(nekoPosY - rB) <= t) { if (nekoPosY >= rB) scN = true; else scS = true; }
                    }
                });
                let walls = [];
                if (scW) walls.push("scratchWallW");
                if (scN) walls.push("scratchWallN");
                if (scE) walls.push("scratchWallE");
                if (scS) walls.push("scratchWallS");
                idleAnimation = walls.length > 0 && Math.random() < 0.4 ? walls[Math.floor(Math.random() * walls.length)] : av[Math.floor(Math.random() * av.length)];
            }
            if (forceSleep) idleAnimation = "sleeping";
            switch (idleAnimation) {
                case "sleeping":
                    if (idleAnimationFrame < 8 && nudge && forceSleep) { setSprite("idle", 0); break; }
                    else if (nudge) { nudge = false; resetIdleAnimation(); }
                    if (idleAnimationFrame < 8) { setSprite("tired", 0); break; }
                    setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
                    if (idleAnimationFrame > 192 && !forceSleep) resetIdleAnimation();
                    break;
                case "scratchWallN":
                case "scratchWallS":
                case "scratchWallE":
                case "scratchWallW":
                case "scratchSelf":
                    setSprite(idleAnimation, idleAnimationFrame);
                    if (idleAnimationFrame > 9) resetIdleAnimation();
                    break;
                default:
                    setSprite("idle", 0);
                    return;
            }
            idleAnimationFrame += 1;
        }
        function frame() {
            frameCount += 1;
            if (grabbing) { grabStop && setSprite("alert", 0); return; }
            const dx = nekoPosX - mousePosX, dy = nekoPosY - mousePosY, dist = Math.sqrt(dx ** 2 + dy ** 2);
            if (forceSleep && Math.abs(dy) < nekoSpeed && Math.abs(dx) < nekoSpeed) {
                nekoPosX = mousePosX;
                nekoPosY = mousePosY;
                nekoEl.style.left = `${nekoPosX - 16}px`;
                nekoEl.style.top = `${nekoPosY - 16}px`;
                idle();
                return;
            }
            if ((dist < nekoSpeed || dist < 48) && !forceSleep) { idle(); return; }
            idleAnimation = null;
            idleAnimationFrame = 0;
            if (idleTime > 1) { setSprite("alert", 0); idleTime = Math.min(idleTime, 7) - 1; return; }
            let dir = dy / dist > 0.5 ? "N" : "";
            dir += dy / dist < -0.5 ? "S" : "";
            dir += dx / dist > 0.5 ? "W" : "";
            dir += dx / dist < -0.5 ? "E" : "";
            if (!dir) dir = "idle";
            setSprite(dir, frameCount);
            nekoPosX -= (dx / dist) * nekoSpeed;
            nekoPosY -= (dy / dist) * nekoSpeed;
            let offL = window.visualViewport?.offsetLeft || 0, offT = window.visualViewport?.offsetTop || 0;
            let vW = window.visualViewport?.width || window.innerWidth, vH = window.visualViewport?.height || window.innerHeight;
            nekoPosX = Math.min(Math.max(offL + 16, nekoPosX), offL + vW - 16);
            nekoPosY = Math.min(Math.max(offT + 16, nekoPosY), offT + vH - 16);
            nekoEl.style.left = `${nekoPosX - 16}px`;
            nekoEl.style.top = `${nekoPosY - 16}px`;
        }
        create();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startOneko);
    } else {
        startOneko();
    }
})();

class CyberCat {
    #id; #posX = 0; #posY = 0; #imgElement; #width; #sensitivity; #currentLocationIndex = -1;
    static LEFT_IMG = "images/cybercat_left.png";
    static RIGHT_IMG = "images/cybercat_right.png";
    constructor(id = 0, sensitivity = 50) {
        this.#id = id;
        this.#width = 50;
        this.#sensitivity = sensitivity;
        this.#initElement();
        this.teleportRandom();
    }
    #initElement() {
        this.#imgElement = document.createElement("img");
        this.#imgElement.id = "cyberCat" + this.#id.toString();
        this.#imgElement.style.cssText = "position:fixed;width:" + this.#width + "px;height:" + this.#width + "px;z-index:9999;pointer-events:none;user-select:none;";
        this.#imgElement.alt = "cyber cat";
        document.body.appendChild(this.#imgElement);
    }
    meow() { console.log("eep! get away!! ฅ'ω'ฅ"); }
    #calculatePositions() {
        const winW = window.innerWidth, winH = window.innerHeight, card = document.querySelector(".glowing-card"), cardRect = card ? card.getBoundingClientRect() : null;
        const positions = [
            { x: 0, y: Math.floor(Math.random() * Math.max(10, winH - this.#width)), isLeft: true },
            { x: winW - this.#width, y: Math.floor(Math.random() * Math.max(10, winH - this.#width)), isLeft: false }
        ];
        if (cardRect) {
            const cardMinY = Math.max(10, cardRect.top), cardMaxY = Math.min(winH - this.#width - 10, cardRect.bottom - this.#width);
            const cardY = cardMaxY > cardMinY ? Math.floor(cardMinY + Math.random() * (cardMaxY - cardMinY)) : Math.floor(cardRect.top);
            positions.push({ x: cardRect.left - this.#width, y: cardY, isLeft: false }, { x: cardRect.right, y: cardY, isLeft: true });
        }
        return positions;
    }
    teleportRandom() {
        const candidates = this.#calculatePositions();
        if (!candidates || candidates.length === 0) return;
        let nextIndex;
        if (candidates.length > 1) {
            do { nextIndex = Math.floor(Math.random() * candidates.length); } while (nextIndex === this.#currentLocationIndex);
        } else { nextIndex = 0; }
        this.#currentLocationIndex = nextIndex;
        const target = candidates[nextIndex];
        this.setPosition(target.x, target.y, target.isLeft);
    }
    setPosition(x, y, isLeft) {
        this.#posX = x;
        this.#posY = y;
        if (!this.#imgElement) return;
        this.#imgElement.src = isLeft ? CyberCat.LEFT_IMG : CyberCat.RIGHT_IMG;
        this.#imgElement.style.left = x + "px";
        this.#imgElement.style.top = y + "px";
    }
    mouseCheck(mouseX, mouseY) {
        const inX = mouseX >= (this.#posX - this.#sensitivity) && mouseX <= (this.#posX + this.#width + this.#sensitivity);
        const inY = mouseY >= (this.#posY - this.#sensitivity) && mouseY <= (this.#posY + this.#width + this.#sensitivity);
        if (inX && inY) { this.meow(); this.teleportRandom(); }
    }
    get width() { return this.#width; }
}

let cyberCat = null;
function spawnCyberCat() { cyberCat = new CyberCat(0, 50); }
function checkMouse(e) { cyberCat?.mouseCheck(e.clientX, e.clientY); }
function windowChange() { cyberCat?.teleportRandom(); }

if (document.readyState === 'loading') {
    window.addEventListener("DOMContentLoaded", () => {
        spawnCyberCat();
        document.addEventListener("mousemove", checkMouse);
        window.addEventListener("resize", windowChange);
    });
} else {
    spawnCyberCat();
    document.addEventListener("mousemove", checkMouse);
    window.addEventListener("resize", windowChange);
}
