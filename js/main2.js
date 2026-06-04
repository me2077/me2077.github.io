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
        if(this.playing){this.animationFrameId=requestAnimationFrame(this.render);}
        const v=this.u_time.value;this.u_time.value=v+diff*0.00005;this.onBeforeRender(t);this.renderer.render({scene:this.mesh});this.onAfterRender(t);
    }
    set playing(v){
        if(this._playing!==true&&v===true){this.lastTime=performance.now();this.animationFrameId=requestAnimationFrame(this.render);this._playing=true;}
        else if(v===false){cancelAnimationFrame(this.animationFrameId);this.lastTime=0;this._playing=false;}
    }
    get playing(){return this._playing===true;}
    destroy(){this.playing=false;window.removeEventListener('resize',this.resize);if(this.gl&&this.gl.canvas&&this.gl.canvas.parentNode){this.gl.canvas.parentNode.removeChild(this.gl.canvas);}}
}

window.initWebGLShaderBg=function(container){
    const vShaderSource=vertShader.replace('%%rn%%',`${.1+Math.random()*.3}+${Math.random()*Math.PI}`);
    const FSWrapper=new StripeHeader({fragment:fragShader,vertex:vShaderSource,container:container});
    const {uniforms}=FSWrapper;let angle=0.;
    uniforms.u_position=new Uniform({name:"position",value:[0,2],kind:"vec2"});
    uniforms.u_zoom=new Uniform({name:"zoom",value:1.,kind:"float"});
    uniforms.u_rotation=new Uniform({name:"rotation",value:angle,kind:"float"});
    let zoom=uniforms.u_zoom.value;let tzoom=1.;let velocity=new Vec2(0,0);let lastmouse=new Vec2(0,0);let startmouse=new Vec2(0,0);let startrotation=angle;let rotation=angle;let pointerdown=false;let keys={rotation:false};let rotating=false;let zooming=false;let interactionFrameId;
    const handleKeyDown=(e)=>{if(e.key==='Control')keys.rotation=true;};
    const handleKeyUp=(e)=>{if(e.key==='Control')keys.rotation=false;};
    const handlePointerDown=(e)=>{
        if(e.target.closest('a, button, .glowing-card, #oneko, #oneko-skin-menu, .bullet'))return;
        if(!keys.rotation){pointerdown=true;lastmouse=new Vec2(e.clientX,e.clientY);}else{rotating=true;const thismouse=new Vec2(e.clientX,e.clientY);startrotation=rotation+new Vec2(window.innerWidth*.5,window.innerHeight*.5).subtract(thismouse).angle;}
        startmouse=lastmouse.clone();
    };
    const handlePointerUp=()=>{pointerdown=false;rotating=false;};
    const handlePointerMove=(e)=>{
        if(zooming)return;
        if(rotating){const thismouse=new Vec2(e.clientX,e.clientY);rotation=startrotation-new Vec2(window.innerWidth*.5,window.innerHeight*.5).subtract(thismouse).angle;}
        else if(pointerdown){
            const thismouse=new Vec2(e.clientX,e.clientY);let dd=1./Math.min(window.innerWidth,window.innerHeight);dd*=uniforms.u_zoom.value;const diff=lastmouse.subtract(thismouse);const c=Math.cos(uniforms.u_rotation.value);const s=Math.sin(uniforms.u_rotation.value);const mat=new Mat2(c,s,-s,c);velocity=diff.clone();uniforms.u_position.value=new Vec2(...uniforms.u_position.value).add(diff.transformByMat2New(mat).multiply(new Vec2(dd,-dd))).array;lastmouse=thismouse;
        }
    };
    window.addEventListener('keydown',handleKeyDown);window.addEventListener('keyup',handleKeyUp);window.addEventListener('pointerdown',handlePointerDown);window.addEventListener('pointerup',handlePointerUp);window.addEventListener('pointermove',handlePointerMove);
    const runmouse=function(){
        const scalar=pointerdown?.1:.98;
        if(velocity.length>0.01){velocity.scale(scalar);const c=Math.cos(uniforms.u_rotation.value);const s=Math.sin(uniforms.u_rotation.value);const mat=new Mat2(c,s,-s,c);let dd=1./Math.min(window.innerWidth,window.innerHeight);dd*=uniforms.u_zoom.value;uniforms.u_position.value=new Vec2(...uniforms.u_position.value).add(velocity.transformByMat2New(mat).multiplyNew(new Vec2(dd,-dd))).array;}
        zoom+=(tzoom-zoom)*.1;uniforms.u_zoom.value=zoom;uniforms.u_rotation.value=rotation;if(FSWrapper.playing){interactionFrameId=requestAnimationFrame(runmouse);}
    };
    interactionFrameId=requestAnimationFrame(runmouse);
    return()=>{
        cancelAnimationFrame(interactionFrameId);window.removeEventListener('keydown',handleKeyDown);window.removeEventListener('keyup',handleKeyUp);window.removeEventListener('pointerdown',handlePointerDown);window.removeEventListener('pointerup',handlePointerUp);window.removeEventListener('pointermove',handlePointerMove);FSWrapper.destroy();
    };
};

// ==================== 1. 背景常量定义 ====================
const BG_TOP_LEFT='images/A1.webp';
const BG_TOP_RIGHT='#0e0e0e';
const BG_BOTTOM_LEFT='webgl-shader';
const BG_BOTTOM_RIGHT_1='linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.15)), linear-gradient(15.3deg, rgba(111, 71, 133, 1) 5.6%, rgba(232, 129, 166, 1) 19.6%, rgba(237, 237, 183, 1) 42.1%, rgba(244, 166, 215, 1) 63.7%, rgba(154, 219, 232, 1) 78.7%, rgba(238, 226, 159, 1) 96.8%)';
const BG_BOTTOM_RIGHT_2='images/D2.jpg'; // 新增的图片背景

// ==================== 2. 【必须补回的全局变量声明】 ====================
window.isParticlesEnabled=!document.body.classList.contains('light');
window.userToggledParticles=false;
let bgChangeSequence=0;
let currentPage=2;
const glowingCard=document.querySelector('.glowing-card');
const audio=document.getElementById('audioPlayer');
let isPlaying=false;
let pagesContainer;
let bullets;

// ==================== 3. 预设数组配置 ====================
const bgPresets=[
    {name:'top-left',value:BG_TOP_LEFT,isLight:true},
    {name:'top-right',value:BG_TOP_RIGHT,isLight:false},
    {name:'bottom-left',value:BG_BOTTOM_LEFT,isLight:true},
    {name:'bottom-right-1',value:BG_BOTTOM_RIGHT_1,isLight:true}, // 索引为 3
    {name:'bottom-right-2',value:BG_BOTTOM_RIGHT_2,isLight:true}  // 索引为 4
];
let currentBgIndex=0;

document.addEventListener('DOMContentLoaded',()=>{
    pagesContainer=document.querySelector('.pages');bullets=document.querySelectorAll('.bullet');
    document.getElementById('btn-theme-light').addEventListener('click',()=>switchBackground(BG_TOP_LEFT,true));
    document.getElementById('btn-theme-dark').addEventListener('click',()=>switchBackground(BG_TOP_RIGHT,false));
    document.getElementById('btn-bg-1').addEventListener('click',()=>switchBackground(BG_BOTTOM_LEFT,true));
// 修改后：点击时在两个右下角背景之间轮流切换
document.getElementById('btn-bg-2').addEventListener('click', () => {
    if (currentBgIndex === 3) {
        currentBgIndex = 4;
    } else {
        currentBgIndex = 3;
    }
    const preset = bgPresets[currentBgIndex];
    switchBackground(preset.value, preset.isLight);
});
    document.querySelectorAll('.theme-toggle, .day-toggle').forEach(button=>{
        const resetScale=()=>{button.classList.remove('icon-shrink-force','icon-scale-active');};
        button.addEventListener('mouseenter',resetScale);button.addEventListener('mouseleave',resetScale);
        button.addEventListener('click',function(){
            resetScale();this.classList.add('icon-scale-active');
            setTimeout(()=>{this.classList.remove('icon-scale-active');this.classList.add('icon-shrink-force');},350);
        });
    });
    document.getElementById('rewardContainer').addEventListener('click',()=>{document.getElementById('rewardContainer').classList.toggle('show-qr');});
    document.getElementById('reward-wx').addEventListener('click',e=>e.stopPropagation());
    document.getElementById('reward-zfb').addEventListener('click',e=>e.stopPropagation());
    document.getElementById('profile-pic').addEventListener('click',triggerConfetti);
    document.getElementById('spotify-card-wrap').addEventListener('click',()=>{window.open('https://open.spotify.com/track/3UkRfA9F62DYYDzqOskoov','_blank');});
    document.getElementById('btn-spotify-play').addEventListener('click',(e)=>{e.stopPropagation();togglePlay(e.currentTarget);});
    document.getElementById('btn-vcard').addEventListener('click',()=>{if(typeof downloadVCard==='function')downloadVCard();});
    if(bullets){bullets.forEach(b=>{b.addEventListener('click',function(){switchPageTo(parseInt(this.dataset.page));});});}
    if(typeof ClipboardJS!=='undefined'){
        var clipboard=new ClipboardJS('#wechatBtn',{text:()=>"lllIIllIIlIII"});
        clipboard.on('success',()=>{alert('👉微信号复制成功,即将前往微信！');window.location.href='wechat://';});
    }
});

function updateParticlesDisplay(){
    const canvas=document.getElementById('shuicheCanvas');if(!canvas)return;
    if(window.isParticlesEnabled){canvas.style.display='block';if(window.bgEngine&&window.bgEngine.start)window.bgEngine.start();}
    else{canvas.style.display='none';if(window.bgEngine&&window.bgEngine.stop)window.bgEngine.stop();}
}

let bgLayerIndex=0;
function crossfadeBackground(backgroundValue,isLightTheme){
    const currentChangeId=++bgChangeSequence;const container=document.getElementById('bg-container');if(!container)return;
    let cleanUrl=backgroundValue;const urlMatch=backgroundValue.match(/url\(['"]?(.*?)['"]?\)/);if(urlMatch)cleanUrl=urlMatch[1];
    const isVideo=/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(cleanUrl);const isWebGL=backgroundValue==='webgl-shader';
    const startTransition=(contentElement=null)=>{
        if(currentChangeId!==bgChangeSequence)return;bgLayerIndex++;const newLayer=document.createElement('div');
        newLayer.className='bg-layer';newLayer.style.zIndex=bgLayerIndex;
        if(isWebGL){if(typeof window.initWebGLShaderBg==='function'){const cleanupFn=window.initWebGLShaderBg(newLayer);newLayer._cleanup=cleanupFn;}}
        else if(isVideo&&contentElement){contentElement.style.width="100%";contentElement.style.height="100%";contentElement.style.objectFit="cover";newLayer.appendChild(contentElement);}
        else{if(cleanUrl.startsWith('http')||cleanUrl.startsWith('images/')||cleanUrl.startsWith('./')){newLayer.style.background=`url('${cleanUrl}') center/cover no-repeat`;}else{newLayer.style.background=backgroundValue;}}
        container.appendChild(newLayer);document.body.classList.toggle('light',isLightTheme);document.documentElement.style.setProperty('--fg',isLightTheme?'black':'#f0f0f0');
        if(!window.userToggledParticles){window.isParticlesEnabled=!isLightTheme;}
        updateParticlesDisplay();void newLayer.offsetWidth;
        requestAnimationFrame(()=>{requestAnimationFrame(()=>{newLayer.style.opacity='1';});});
        setTimeout(()=>{
            if(currentChangeId!==bgChangeSequence)return;const layers=container.querySelectorAll('.bg-layer');
            layers.forEach(layer=>{if(layer!==newLayer){if(typeof layer._cleanup==='function'){layer._cleanup();}layer.remove();}});
            updateParticlesDisplay();
        },850);
    };
    if(isWebGL){startTransition();}
    else if(isVideo){
        const video=document.createElement('video');video.src=cleanUrl;video.muted=true;video.loop=true;video.playsInline=true;video.autoplay=true;
        video.onloadeddata=()=>startTransition(video);video.onerror=()=>startTransition();
    }else if(cleanUrl.startsWith('http')||cleanUrl.startsWith('images/')){const img=new Image();img.src=cleanUrl;img.onload=()=>startTransition();img.onerror=()=>startTransition();}
    else{startTransition();}
}

function switchBackground(value,isLight=true){
    if(value==='webgl-shader'){crossfadeBackground(value,isLight);}
    else if(value.includes('gradient')||/^(#|rgb|hsl)/.test(value.trim())){crossfadeBackground(value,isLight);}
    else{crossfadeBackground(`url('${value}')`,isLight);}
}

(function initDoubleClickToggle(){
    let lastToggleTime=0;
    function toggleParticles(e){
        let now=new Date().getTime();if(now-lastToggleTime<500)return;lastToggleTime=now;
        if(e.target&&e.target.closest&&e.target.closest('#oneko, #oneko-skin-menu, a, button, svg, img, video, .bullet, .link-card, .spotify-card, .play-btn, .theme-toggle, .day-toggle')){return;}
        window.isParticlesEnabled=!window.isParticlesEnabled;window.userToggledParticles=true;updateParticlesDisplay();
    }
    document.addEventListener('dblclick',toggleParticles);let lastTouchEnd=0;let isMultiTouch=false;
    document.addEventListener('touchstart',function(e){if(e.touches.length>1){isMultiTouch=true;}},{passive:true});
    document.addEventListener('touchend',function(e){
        if(e.touches.length>0)return;if(isMultiTouch){isMultiTouch=false;lastTouchEnd=0;return;}
        let now=new Date().getTime();if(now-lastTouchEnd<=400){toggleParticles(e);lastTouchEnd=0;}else{lastTouchEnd=now;}
    });
})();

(function initBackgroundEngine(){
    const count=1000;let scene,camera,renderer,animationId=null,mouseX=0,mouseY=0;let windowHalfX=window.innerWidth/2,windowHalfY=window.innerHeight/2;let clock,geometry,posAttribute,positionArray,velocityArray;
    function init(){
        if(typeof THREE==='undefined'){setTimeout(init,50);return;}
        clock=new THREE.Clock();geometry=new THREE.BufferGeometry();posAttribute=new THREE.BufferAttribute(new Float32Array(6*count),3);
        posAttribute.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('position',posAttribute);geometry.setAttribute('velocity',new THREE.BufferAttribute(new Float32Array(2*count),1));
        positionArray=posAttribute.array;velocityArray=geometry.getAttribute('velocity').array;scene=new THREE.Scene();
        camera=new THREE.PerspectiveCamera(80,window.innerWidth/window.innerHeight,1,500);camera.position.z=200;
        renderer=new THREE.WebGLRenderer({canvas:document.getElementById('shuicheCanvas'),antialias:true,alpha:true});
        renderer.setSize(window.innerWidth,window.innerHeight,false);renderer.setClearColor(0x000000,0);
        for(let index=0;index<count;index++){
            const x=Math.random()*800-400,y=Math.random()*800-400,z=Math.random()*400-200;
            positionArray[6*index]=x;positionArray[6*index+1]=y;positionArray[6*index+2]=z;positionArray[6*index+3]=x;positionArray[6*index+4]=y;positionArray[6*index+5]=z;
        }
        scene.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0xffffff})));
        window.addEventListener('resize',debounceResize,{passive:true});
        document.body.addEventListener('pointermove',e=>{mouseX=e.clientX-windowHalfX;mouseY=e.clientY-windowHalfY;},{passive:true});
        if(window.isParticlesEnabled){clock.start();anime();}
    }
    let resizeTimeout;
    function debounceResize(){
        clearTimeout(resizeTimeout);
        resizeTimeout=setTimeout(()=>{
            camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);windowHalfX=window.innerWidth/2;windowHalfY=window.innerHeight/2;
        },100);
    }
    function anime(){
        let delta=clock.getDelta();delta=Math.min(delta,0.1);const timeScale=delta/(1/60);
        for(let index=0;index<count;index++){
            velocityArray[2*index]+=0.015*timeScale;velocityArray[2*index+1]+=0.015*timeScale;
            positionArray[6*index+2]+=(velocityArray[2*index]+0.03)*timeScale;positionArray[6*index+5]+=velocityArray[2*index+1]*timeScale;
            if(positionArray[6*index+2]>200){
                let z=Math.random()*200-200;positionArray[6*index+2]=z;positionArray[6*index+5]=z;velocityArray[2*index]=0;velocityArray[2*index+1]=0;
            }
        }
        posAttribute.needsUpdate=true;camera.position.x+=(-mouseX*0.1-camera.position.x)*0.02;camera.position.y+=(-mouseY*0.1-camera.position.y)*0.02;
        camera.lookAt(scene.position);renderer.render(scene,camera);animationId=requestAnimationFrame(anime);
    }
    document.addEventListener("visibilitychange",()=>{
        if(document.hidden&&animationId!==null){cancelAnimationFrame(animationId);animationId=null;}
        else if(!document.hidden&&animationId===null&&window.isParticlesEnabled){clock.start();anime();}
    });
    window.bgEngine={
        start:()=>{if(animationId===null){if(clock)clock.start();anime();}},
        stop:()=>{if(animationId !==null){cancelAnimationFrame(animationId);animationId=null;}}
    };
    window.bgRenderer={setClearColor:(c,a)=>renderer?renderer.setClearColor(c,a):null};window.addEventListener('DOMContentLoaded',init);
})();

function updateGlowingShadow(){glowingCard.style.boxShadow='0px 10px 15px rgba(0, 0, 0, 0), 0 0 56px #fff inset';}
function switchPageTo(page){
    if(page<1||page>3)return;currentPage=page;
    if(pagesContainer)pagesContainer.style.transform=`translateX(-${(page-1)*100}%)`;
    if(bullets)bullets.forEach(b=>b.classList.toggle('active',parseInt(b.dataset.page)===page));
}

function togglePlay(button){
    if(audio.paused){audio.play();button.classList.add('playing');button.querySelector('.btn-text').innerText='Pause';isPlaying=true;}
    else{audio.pause();button.classList.remove('playing');button.querySelector('.btn-text').innerText='Play';isPlaying=false;}
}

audio.addEventListener('ended',()=>{isPlaying=false;const btn=document.querySelector('.play-btn');if(btn){btn.classList.remove('playing');btn.querySelector('.btn-text').innerText='Play';}});
document.addEventListener('play',e=>{
    document.querySelectorAll('audio').forEach(audioEl=>{
        if(audioEl!==e.target&&!audioEl.paused){
            audioEl.pause();
            if(audioEl.id==='audioPlayer'){const btn=document.querySelector('.play-btn');if(btn){btn.classList.remove('playing');btn.querySelector('.btn-text').innerText='Play';}isPlaying=false;}
        }
    });
},true);

function loadMusicPlayer(){
    let indexSong=0,pendingCurrentTime=0,isLocked=false,songsLength=null,selectedSong=null,songIsPlayed=false,progress_elmnt=null,songName_elmnt=null,sliderImgs_elmnt=null,singerName_elmnt=null,musicPlayerInfo_elmnt=null,progressBarIsUpdating=false,broadcastGuarantor_elmnt=null,isSwitchingMusic=false,preloadAbortController=null;
    const root=document.querySelector("#root");const mainAudio=document.getElementById('mainAudio');
    window.musicControls={playPause:handlePlayMusic,next:()=>handleChangeMusic({isPrev:false}),prev:()=>handleChangeMusic({isPrev:true})};
    function savePlaybackState(){if(!selectedSong)return;const playbackState={currentSongIndex:indexSong,isPlaying:!selectedSong.paused,volume:selectedSong.volume,currentTime:pendingCurrentTime>0?pendingCurrentTime:selectedSong.currentTime};localStorage.setItem('musicPlayerState',JSON.stringify(playbackState));}
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')savePlaybackState();});
    window.addEventListener('beforeunload',savePlaybackState);setInterval(savePlaybackState,5000);
    function updateUIForSong(index){
        updateInfo(songName_elmnt,songs[index].songName);updateInfo(singerName_elmnt,songs[index].artist);setProperty(sliderImgs_elmnt,"--index",-index);
        if('mediaSession' in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:songs[index].songName,artist:songs[index].artist,artwork:[{src:songs[index].files.cover,sizes:'512x512',type:'image/jpeg'}]});}
    }
    function restorePlaybackState(){
        try{
            const savedState=localStorage.getItem('musicPlayerState');if(!savedState){updateUIForSong(0);return;}
            const playbackState=JSON.parse(savedState);
            if(playbackState.currentSongIndex!==undefined&&playbackState.currentSongIndex>=0&&playbackState.currentSongIndex<=songsLength){
                indexSong=playbackState.currentSongIndex;if(playbackState.currentTime!==undefined)pendingCurrentTime=playbackState.currentTime;
                if(playbackState.volume!==undefined)mainAudio.volume=playbackState.volume;updateUIForSong(indexSong);
            }else{updateUIForSong(0);}
        }catch(e){updateUIForSong(0);}
    }
    function preloadNextSongHead(nextIndex){
        if(!songs[nextIndex]||!songs[nextIndex].files.song)return;const nextUrl=songs[nextIndex].files.song;
        if(preloadAbortController)preloadAbortController.abort();preloadAbortController=new AbortController();
        fetch(nextUrl,{headers:{'Range':'bytes=0-524288'},signal:preloadAbortController.signal}).catch(err=>{});
    }
    function handleChangeMusic({isPrev=false,playListIndex=null}){
        if(isLocked)return;let newIndex=playListIndex!==null?playListIndex:(isPrev?indexSong-1:indexSong+1);
        if(newIndex<0)newIndex=songsLength;if(newIndex>songsLength)newIndex=0;if(newIndex===indexSong&&playListIndex===null)return;
        let wasPlaying=songIsPlayed;isSwitchingMusic=true;indexSong=newIndex;pendingCurrentTime=0;updateUIForSong(indexSong);mainAudio.src=songs[indexSong].files.song;
        if(wasPlaying){
            let playPromise=mainAudio.play();
            if(playPromise!==undefined){playPromise.then(()=>{isSwitchingMusic=false;}).catch(e=>{isSwitchingMusic=false;songIsPlayed=false;broadcastGuarantor_elmnt.classList.remove("click");});}
            songIsPlayed=true;broadcastGuarantor_elmnt.classList.add("click");preloadNextSongHead((indexSong+1)>songsLength?0:indexSong+1);
        }else{isSwitchingMusic=false;if(preloadAbortController)preloadAbortController.abort();}
        savePlaybackState();
    }
    function handlePlayMusic(){
        if(mainAudio.currentTime===mainAudio.duration&&mainAudio.duration>0){handleChangeMusic({});return;}
        if(!mainAudio.src||mainAudio.src===window.location.href||mainAudio.src===""){
            mainAudio.src=songs[indexSong].files.song;mainAudio.play();songIsPlayed=true;broadcastGuarantor_elmnt.classList.add("click");preloadNextSongHead((indexSong+1)>songsLength?0:indexSong+1);
        }else{if(mainAudio.paused){mainAudio.play();preloadNextSongHead((indexSong+1)>songsLength?0:indexSong+1);}else{mainAudio.pause();}}
    }
    function updateTheProgressBar(){
        const duration=this.duration;const currentTime=this.currentTime;if(isNaN(duration)||duration===0)return;
        const progressRatio=currentTime/duration;setProperty(progress_elmnt,"--scale",progressRatio);setProperty(progress_elmnt,"--width",`${progressRatio*100}%`);
    }
    function syncMediaSessionPosition(){
        if('mediaSession' in navigator&&!isNaN(mainAudio.duration)&&isFinite(mainAudio.duration)&&mainAudio.duration>0){
            try{let position=mainAudio.currentTime||0;position=Math.max(0,Math.min(position,mainAudio.duration));navigator.mediaSession.setPositionState({duration:mainAudio.duration,playbackRate:mainAudio.playbackRate||1,position:position});}catch(err){}
        }
    }
    function handleScrub(e){
        e.preventDefault();let clientX=e.clientX;if(e.touches&&e.touches.length>0)clientX=e.touches[0].clientX;
        const progressOffsetLeft=progress_elmnt.getBoundingClientRect().left;const progressWidth=progress_elmnt.offsetWidth;const duration=selectedSong.duration;
        if(isNaN(duration)||duration===0)return;selectedSong.currentTime=(clientX-progressOffsetLeft)/progressWidth*duration;
    }
    const songs=[
        {"bg":"#c9bea28f","artist":"SCSI-9","songName":"Senorita Tristeza","files":{"song":"music/Senorita Tristeza.mp3","cover":"music/Senorita Tristeza.webp"},"duration":"5:53"},
        {"bg":"#0896eba1","artist":"Paradox Interactive","songName":"Be Happy","files":{"song":"music/Be Happy.mp3","cover":"music/Be Happy.webp"},"duration":"3:22"},
        {"bg":"#ebbe03","artist":"Flower Face","songName":"Jupiter","files":{"song":"music/Jupiter.mp3","cover":"music/Jupiter.webp"},"duration":"4:31"},
        {"bg":"#ffc382","artist":"La Femme","songName":"Le jardin","files":{"song":"music/Le jardin.mp3","cover":"music/Le jardin.webp"},"duration":"4:00"},
        {"bg":"#ffcbdc","artist":"Still Corners","songName":"Crying","files":{"song":"music/Crying.mp3","cover":"music/Crying.webp"},"duration":"3:28"},
        {"bg":"#44c16fb5","artist":"Marvel83'","songName":"Alone With You","files":{"song":"music/Alone With You.mp3","cover":"music/Alone With You.webp"},"duration":"4:53"},
        {"bg":"#ff4545","artist":"Timecop1983","songName":"Nightfall","files":{"song":"music/Nightfall.mp3","cover":"music/Nightfall.webp"},"duration":"4:40"},
        {"bg":"#e5e7e9","artist":"Lazer Boomerang","songName":"R3cover","files":{"song":"music/R3cover.mp3","cover":"music/R3cover.webp"},"duration":"3:34"}
    ];
    const musicPlayer=document.createElement("div");musicPlayer.className="music-player flex-column";
    const slider=document.createElement("div");slider.className="slider center";slider.onclick=handleResizeSlider;
    const sliderContent=document.createElement("div");sliderContent.className="slider__content center";
    const playlistButton=document.createElement("button");playlistButton.className="music-player__playlist-button center button";playlistButton.innerHTML='<i class="icon-playlist"></i>';
    const broadcastGuarantor=document.createElement("button");broadcastGuarantor.className="music-player__broadcast-guarantor center button";broadcastGuarantor.onclick=handlePlayMusic;broadcastGuarantor.innerHTML='<i class="icon-play"></i><i class="icon-pause"></i>';
    const sliderImgs=document.createElement("div");sliderImgs.className="slider__imgs flex-row";
    songs.forEach(({files:{cover},songName})=>{const img=document.createElement("img");img.src=cover;img.loading="lazy";img.className="img";img.alt=songName;sliderImgs.appendChild(img);});
    sliderContent.append(playlistButton,broadcastGuarantor,sliderImgs);const sliderControls=document.createElement("div");sliderControls.className="slider__controls center";
    const prevButton=document.createElement("button");prevButton.className="slider__switch-button flex-row button";prevButton.innerHTML='<i class="icon-back"></i>';prevButton.onclick=()=>handleChangeMusic({isPrev:true});
    const musicInfo=document.createElement("div");musicInfo.className="music-player__info text_trsf-cap";musicInfo.innerHTML=`<div><div class="music-player__singer-name"><div>${songs[0].songName}</div></div></div><div><div class="music-player__subtitle"><div>${songs[0].artist}</div></div></div>`;
    const nextButton=document.createElement("button");nextButton.className="slider__switch-button flex-row button";nextButton.innerHTML='<i class="icon-next"></i>';nextButton.onclick=()=>handleChangeMusic({isPrev:false});
    const progress=document.createElement("div");progress.className="progress center";progress.onpointerdown=(e)=>{e.preventDefault();handleScrub(e);progressBarIsUpdating=true;};
    const progressWrapper=document.createElement("div");progressWrapper.className="progress__wrapper";const progressBar=document.createElement("div");progressBar.className="progress__bar";const progressDot=document.createElement("div");progressDot.className="progress__dot";
    progressWrapper.appendChild(progressBar);progressWrapper.appendChild(progressDot);progress.appendChild(progressWrapper);sliderControls.append(prevButton,musicInfo,nextButton,progress);slider.append(sliderContent,sliderControls);
    const playlist=document.createElement("ul");playlist.className="music-player__playlist list";
    songs.forEach((song,index)=>{
        const listItem=document.createElement("li");listItem.className="music-player__song";listItem.dataset.index=index;
        listItem.innerHTML=`<div class="flex-row _align_center"><img src="${song.files.cover}" loading="lazy" class="img music-player__song-img" alt="${song.songName}"><div class="music-player__playlist-info text_trsf-cap"><b class="text_overflow">${song.songName}</b><div class="flex-row _justify_space-btwn"><span class="music-player__subtitle">${song.artist}</span><span class="music-player__song-duration">${song.duration}</span></div></div></div>`;
        playlist.appendChild(listItem);
    });
    playlist.addEventListener('click',(e)=>{const clickedItem=e.target.closest('.music-player__song');if(clickedItem){const clickIndex=parseInt(clickedItem.dataset.index,10);handleChangeMusic({playListIndex:clickIndex});}});
    musicPlayer.append(slider,playlist);root.innerHTML='';root.appendChild(musicPlayer);
    songsLength=songs.length-1;progress_elmnt=document.querySelector(".progress");sliderImgs_elmnt=document.querySelector(".slider__imgs");songName_elmnt=document.querySelector(".music-player__singer-name");musicPlayerInfo_elmnt=document.querySelector(".music-player__info");singerName_elmnt=document.querySelector(".music-player__subtitle");broadcastGuarantor_elmnt=document.querySelector(".music-player__broadcast-guarantor");selectedSong=mainAudio;
    mainAudio.addEventListener('timeupdate',updateTheProgressBar);mainAudio.addEventListener('ended',()=>{if(songIsPlayed)handleChangeMusic({});});mainAudio.addEventListener('loadedmetadata',()=>{if(pendingCurrentTime>0){mainAudio.currentTime=pendingCurrentTime;pendingCurrentTime=0;}syncMediaSessionPosition();});mainAudio.addEventListener('durationchange',syncMediaSessionPosition);mainAudio.addEventListener('play',()=>{songIsPlayed=true;broadcastGuarantor_elmnt.classList.add("click");if('mediaSession' in navigator)navigator.mediaSession.playbackState='playing';syncMediaSessionPosition();});mainAudio.addEventListener('pause',()=>{setTimeout(()=>{if(mainAudio.paused&&!isSwitchingMusic){songIsPlayed=false;broadcastGuarantor_elmnt.classList.remove("click");if('mediaSession' in navigator)navigator.mediaSession.playbackState='paused';syncMediaSessionPosition();}},100);});mainAudio.addEventListener('seeked',syncMediaSessionPosition);
    controlSubtitleAnimation(musicPlayerInfo_elmnt,songName_elmnt);controlSubtitleAnimation(musicPlayerInfo_elmnt,singerName_elmnt);setTimeout(restorePlaybackState,100);
    if('mediaSession' in navigator){
        navigator.mediaSession.setActionHandler('previoustrack',()=>handleChangeMusic({isPrev:true}));navigator.mediaSession.setActionHandler('nexttrack',()=>handleChangeMusic({isPrev:false}));
        navigator.mediaSession.setActionHandler('play',()=> {mainAudio.play();});navigator.mediaSession.setActionHandler('pause',()=> {mainAudio.pause();});
        navigator.mediaSession.setActionHandler('seekto',(details)=>{if(details.seekTime!=null)mainAudio.currentTime=details.seekTime;});
    }
    function handleResizeSlider({target}){
        if(isLocked)return;if(target.classList.contains("music-player__info")){this.classList.add("resize");setProperty(this,"--controls-animate","down running");}
        else if(target.classList.contains("music-player__playlist-button")){this.classList.remove("resize");setProperty(this,"--controls-animate","up running");}
    }
    function controlSubtitleAnimation(parent,child){
        if(child.classList.contains("animate"))return;const element=child.firstChild;
        if(child.clientWidth>parent.clientWidth){child.appendChild(element.cloneNode(true));child.classList.add("animate");}
        setProperty(child.parentElement,"width",`${element.clientWidth}px`);
    }
    function setProperty(target,prop,value=""){target.style.setProperty(prop,value);}
    function updateInfo(target,value){while(target.firstChild)target.removeChild(target.firstChild);const targetChild=document.createElement("div");targetChild.appendChild(document.createTextNode(value));target.appendChild(targetChild);target.classList.remove("animate");controlSubtitleAnimation(musicPlayerInfo_elmnt,target);}
    function handleResize(){setProperty(document.documentElement,"--vH",`${window.innerHeight*0.01}px`);}
    window.addEventListener("resize",handleResize);window.addEventListener("transitionstart",({target})=>{if(target===sliderImgs_elmnt){isLocked=true;setProperty(sliderImgs_elmnt,"will-change","transform");}});window.addEventListener("transitionend",({target,propertyName})=>{if(target===sliderImgs_elmnt)isLocked=false;if(target.classList.contains("slider")&&propertyName==="height"){controlSubtitleAnimation(musicPlayerInfo_elmnt,songName_elmnt);controlSubtitleAnimation(musicPlayerInfo_elmnt,singerName_elmnt);}});
    const stopScrub=()=>{if(progressBarIsUpdating){selectedSong.muted=false;progressBarIsUpdating=false;}};
    const moveScrub=(e)=>{if(progressBarIsUpdating){e.preventDefault();handleScrub(e);selectedSong.muted=true;}};
    window.addEventListener("pointerup",stopScrub);window.addEventListener("pointermove",moveScrub);window.addEventListener("touchend",stopScrub);window.addEventListener("touchmove",moveScrub);handleResize();
}

function initKeyboardControls(){
    document.addEventListener('keydown',(e)=>{
        const key=e.key.toLowerCase();
        if(key==='z'){if(typeof window.onekoSleep==='function')window.onekoSleep();}
        if(key==='s'){if(typeof window.onekoToggleSkinMenu==='function')window.onekoToggleSkinMenu();}
        if(key==='c'){if(typeof window.onekoCycleSkin==='function')window.onekoCycleSkin();}
        if(key==='n'||key==='m'){triggerConfetti();}
        if(key==='t'){currentBgIndex=(currentBgIndex+1)%bgPresets.length;const preset=bgPresets[currentBgIndex];switchBackground(preset.value,preset.isLight);}
// 修改后：
if(key==='1'){switchBackground(BG_TOP_LEFT,true);currentBgIndex=0;}
if(key==='2'){switchBackground(BG_TOP_RIGHT,false);currentBgIndex=1;}
if(key==='3'){switchBackground(BG_BOTTOM_LEFT,true);currentBgIndex=2;}
if(key==='4'){
    // 如果当前已经是渐变（3），就切到新图片（4）；否则切回渐变（3）
    if (currentBgIndex === 3) {
        currentBgIndex = 4;
    } else {
        currentBgIndex = 3;
    }
    const preset = bgPresets[currentBgIndex];
    switchBackground(preset.value, preset.isLight);
}
        if(key==='p'){window.isParticlesEnabled=!window.isParticlesEnabled;window.userToggledParticles=true;updateParticlesDisplay();}
        if(!e.shiftKey){
            if(e.key==='ArrowRight'){let next=currentPage+1;if(next>3)next=1;switchPageTo(next);}
            if(e.key==='ArrowLeft'){let prev=currentPage-1;if(prev<1)prev=3;switchPageTo(prev);}
            if(e.key==='ArrowUp'||e.key==='ArrowDown'){
                if(currentPage===1){
                    e.preventDefault();const pageVertical=document.querySelector('#page1 .page-vertical');const sign=e.key==='ArrowUp'?-1:1;
                    pageVertical.scrollBy({top:sign*pageVertical.clientHeight,behavior:'smooth'});
                }
            }
        }
        if(window.musicControls){
            if(e.code==='Space'){e.preventDefault();window.musicControls.playPause();}
            if(e.shiftKey){
                if(e.key==='ArrowRight')window.musicControls.next();
                if(e.key==='ArrowLeft')window.musicControls.prev();
            }
        }
    });
}

const scrollContainer=document.querySelector('.link-scroll-container');let scrollTimeout;
if(scrollContainer){
    scrollContainer.addEventListener('scroll',()=>{scrollContainer.classList.add('scrolling');clearTimeout(scrollTimeout);scrollTimeout=setTimeout(()=>scrollContainer.classList.remove('scrolling'),1500);},{passive:true});
}

let avatarSound=null;
async function initAvatarSound(){
    const audioUrl="images/Cat.wav";
    try{const response=await fetch(audioUrl,{cache:'force-cache'});const audioBlob=await response.blob();const blobUrl=URL.createObjectURL(audioBlob);avatarSound=new Audio(blobUrl);avatarSound.volume=0.35;}
    catch(error){avatarSound=new Audio(audioUrl);avatarSound.volume=0.35;}
}
if('requestIdleCallback' in window){requestIdleCallback(()=>initAvatarSound());}else{setTimeout(initAvatarSound,1500);}

function triggerConfetti(){
    if(typeof confetti==='function')confetti({particleCount:150,spread:100});
    if(avatarSound){avatarSound.currentTime=0;avatarSound.play().catch(e=>console.log(e));}
}

const video=document.getElementById('page1Video');let videoLoaded=false;
if('IntersectionObserver' in window&&video){
    const videoObserver=new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{if(entry.isIntersecting){if(!videoLoaded){video.src="music/Movie.MP4";videoLoaded=true;}video.muted=true;video.play().catch(()=>{});}else{video.pause();}});
    },{threshold:0.5});
    videoObserver.observe(document.getElementById('page1-4'));
}
if(video)video.addEventListener('click',()=>video.muted=false);

window.onload=function(){
    loadMusicPlayer();initKeyboardControls();
    if(document.body.classList.contains('light')){window.isParticlesEnabled=false;updateParticlesDisplay();}
    switchPageTo(2);
};

const linkCards=document.querySelectorAll('.link-card');
linkCards.forEach(card=>{
    const titleSpan=card.querySelector('.link-title');
    if(titleSpan&&titleSpan.textContent){const text=titleSpan.textContent.trim();titleSpan.innerHTML=`<span class="glitch-text" data-text="${text}">${text}</span>`;}
    const glitchEl=card.querySelector('.glitch-text');const startGlitch=()=>{if(glitchEl)glitchEl.classList.add('active');};const stopGlitch=()=>{if(glitchEl)glitchEl.classList.remove('active');};
    card.addEventListener('mouseenter',startGlitch);card.addEventListener('mouseleave',stopGlitch);card.addEventListener('touchstart',startGlitch,{passive:true});card.addEventListener('touchend',stopGlitch);card.addEventListener('touchcancel',stopGlitch);
});

(async function oneko(){
    const nekoEl=document.createElement("div");
    const skinList=[
        {name:"classic",url:"images/oneko-classic.gif"},{name:"black2",url:"images/black2.png"},{name:"black",url:"images/black.png"},{name:"calico",url:"images/calico.png"},{name:"blue",url:"images/blue.png"},{name:"holiday",url:"images/holiday.png"},{name:"kina",url:"images/kina.png"},{name:"lucky",url:"images/lucky.png"},{name:"marmalade",url:"images/marmalade.png"},{name:"mermaid",url:"images/mermaid.png"},{name:"usa",url:"images/usa.png"},{name:"neon",url:"images/neon.png"},{name:"pink",url:"images/pink.png"},{name:"socks",url:"images/socks.png"},{name:"dog",url:"images/dog.png"}
    ];
    const skinMenu=document.createElement("div");skinMenu.id="oneko-skin-menu";
    skinMenu.style.cssText=`position:fixed;display:none;grid-template-columns:repeat(5, 32px);grid-template-rows:repeat(3, 32px);gap:8px;background:rgba(255,255,255,0.15);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);border:1px solid rgba(255,255,255,0.4);border-radius:12px;padding:10px;z-index:10000;box-shadow:0 4px 15px rgba(0,0,0,0), 0 0 90px rgba(255,255,255,0.4) inset;`;
    skinList.forEach(skin=>{
        const item=document.createElement("div");
        item.style.cssText=`width:32px;height:32px;background-color:rgba(0,0,0,0);background-image:url('${skin.url}');background-position:-222px -95px;image-rendering:pixelated;cursor:pointer;border-radius:4px;border:2px solid transparent;transition:border 0.2s, transform 0.2s;`;
        item.title=skin.name;item.onmouseenter=()=>{item.style.border="1px solid #c299ff";item.style.transform="scale(1.1)";};item.onmouseleave=()=>{item.style.border="1px solid transparent";item.style.transform="scale(1)";};item.onclick=(e)=>{e.stopPropagation();changeSkin(skin.url);};skinMenu.appendChild(item);
    });
    document.body.appendChild(skinMenu);
    function changeSkin(url){if(!url)return;nekoEl.style.backgroundImage=`url('${url}')`;localStorage.setItem("oneko:skin",url);}
    function showSkinMenu(){
        skinMenu.style.display="grid";const menuWidth=skinMenu.offsetWidth;const menuHeight=skinMenu.offsetHeight;const rect=nekoEl.getBoundingClientRect();
        if(rect.left<window.innerWidth/2){skinMenu.style.left=`${rect.right+10}px`;}else{skinMenu.style.left=`${rect.left-menuWidth-10}px`;}
        let topPos=rect.top+(rect.height/2)-(menuHeight/2);if(topPos+menuHeight>window.innerHeight){topPos=window.innerHeight-menuHeight-10;}
        if(topPos<0)topPos=10;skinMenu.style.top=`${topPos}px`;
    }
    window.onekoToggleSkinMenu=()=>{if(skinMenu.style.display==="grid"){skinMenu.style.display="none";}else{showSkinMenu();}};
    window.onekoCycleSkin=()=>{
        const currentSkin=localStorage.getItem("oneko:skin")||"images/oneko-classic.gif";
        let idx=skinList.findIndex(s=>s.url===currentSkin);idx=(idx+1)%skinList.length;changeSkin(skinList[idx].url);
    };
    document.addEventListener("pointerdown",(e)=>{if(skinMenu.style.display==="grid"&&e.target!==nekoEl&&!skinMenu.contains(e.target)){skinMenu.style.display="none";}});
    let nekoPosX=32,nekoPosY=32,mousePosX=32,mousePosY=32,frameCount=0,idleTime=0,idleAnimation=null,idleAnimationFrame=0,forceSleep=false,grabbing=false,grabStop=true,nudge=false,kuroNeko=false,variant="classic",lastClickTime=0,clickCount=0;
    function parseLocalStorage(key,fallback){try{const value=JSON.parse(localStorage.getItem(`oneko:${key}`));return typeof value===typeof fallback?value:fallback;}catch(e){return fallback;}}
    const nekoSpeed=10,variants=[["classic","Classic"],["dog","Dog"],["tora","Tora"],["maia","Maia"],["vaporwave","Vaporwave"]],
    spriteSets={
        idle:[[-3,-3]],alert:[[-7,-3]],scratchSelf:[[-5,0],[-6,0],[-7,0]],scratchWallN:[[0,0],[0,-1]],scratchWallS:[[-7,-1],[-6,-2]],scratchWallE:[[-2,-2],[-2,-3]],scratchWallW:[[-4,0],[-4,-1]],tired:[[-3,-2]],sleeping:[[-2,0],[-2,-1]],
        N:[[-1,-2],[-1,-3]],NE:[[0,-2],[0,-3]],E:[[-3,0],[-3,-1]],SE:[[-5,-1],[-5,-2]],S:[[-6,-3],[-7,-2]],SW:[[-5,-3],[-6,-1]],W:[[-4,-2],[-4,-3]],NW:[[-1,0],[-1,-1]]
    };
    function sleep(){forceSleep=!forceSleep;nudge=false;localStorage.setItem("oneko:forceSleep",forceSleep);if(!forceSleep){resetIdleAnimation();return;}mousePosX=nekoPosX;mousePosY=nekoPosY;}
    window.onekoSleep=sleep;
    function create(){
        variant=parseLocalStorage("variant","classic");kuroNeko=parseLocalStorage("kuroneko",false);if(!variants.some((v)=>v[0]===variant)){variant="classic";}
        const savedSkin=localStorage.getItem("oneko:skin")||"images/oneko-classic.gif";nekoEl.id="oneko";nekoEl.style.width="32px";nekoEl.style.height="32px";nekoEl.style.position="fixed";nekoEl.style.backgroundImage=`url('${savedSkin}')`;
        nekoEl.style.imageRendering="pixelated";nekoEl.style.left=`${nekoPosX-16}px`;nekoEl.style.top=`${nekoPosY-16}px`;nekoEl.style.filter=kuroNeko?"invert(100%)":"none";nekoEl.style.zIndex="9999";nekoEl.style.touchAction="none";nekoEl.style.userSelect="none";nekoEl.style.webkitUserSelect="none";document.body.appendChild(nekoEl);
        function updateMousePos(e){
            if(skinMenu.style.display==="grid"){const rect=skinMenu.getBoundingClientRect();if(e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom){return;}}
            let offsetLeft=window.visualViewport?window.visualViewport.offsetLeft:0;let offsetTop=window.visualViewport?window.visualViewport.offsetTop:0;mousePosX=e.clientX+offsetLeft;mousePosY=e.clientY+offsetTop;
        }
        window.addEventListener("mousemove",(e)=>{if(forceSleep)return;updateMousePos(e);});window.addEventListener("pointermove",(e)=>{if(forceSleep)return;if(e.pointerType==="touch")updateMousePos(e);});
        function handleResize(){
            if(window.visualViewport){
                let offsetLeft=window.visualViewport.offsetLeft;let offsetTop=window.visualViewport.offsetTop;let vW=window.visualViewport.width;let vH=window.visualViewport.height;
                if(mousePosX<offsetLeft||mousePosX>offsetLeft+vW||mousePosY<offsetTop||mousePosY>offsetTop+vH){mousePosX=offsetLeft+vW/2;mousePosY=offsetTop+vH/2;}
            }
            if(forceSleep){forceSleep=false;sleep();}
        }
        window.addEventListener("resize",handleResize);
        if(window.visualViewport){window.visualViewport.addEventListener("resize",handleResize);window.visualViewport.addEventListener("scroll",handleResize);}
        let clickTimeout=null;
        nekoEl.addEventListener("pointerdown",(e)=>{
            if(e.button!==0&&e.pointerType==="mouse")return;e.preventDefault();grabbing=true;let isDragging=false;if(nekoEl.setPointerCapture){try{nekoEl.setPointerCapture(e.pointerId);}catch(_){}}
            let startX=e.clientX,startY=e.clientY,startNekoX=nekoPosX,startNekoY=nekoPosY,grabInterval;
            const moveHandler=(e)=>{
                e.preventDefault();const deltaX=e.clientX-startX;const deltaY=e.clientY-startY;const absDeltaX=Math.abs(deltaX);const absDeltaY=Math.abs(deltaY);
                if(absDeltaX>5||absDeltaY>5){isDragging=true;}
                if(absDeltaX>absDeltaY&&absDeltaX>10){setSprite(deltaX>0?"scratchWallW":"scratchWallE",frameCount);}
                else if(absDeltaY>absDeltaX&&absDeltaY>10){setSprite(deltaY>0?"scratchWallN":"scratchWallS",frameCount);}
                if(grabStop||absDeltaX>10||absDeltaY>10||Math.sqrt(deltaX**2+deltaY**2)>10){grabStop=false;clearTimeout(grabInterval);grabInterval=setTimeout(()=>{grabStop=true;nudge=false;startX=e.clientX;startY=e.clientY;startNekoX=nekoPosX;startNekoY=nekoPosY;},150);}
                nekoPosX=startNekoX+deltaX;nekoPosY=startNekoY+deltaY;nekoEl.style.left=`${nekoPosX-16}px`;nekoEl.style.top=`${nekoPosY-16}px`;
            };
            const upHandler=(e)=>{
                grabbing=false;nudge=true;resetIdleAnimation();window.removeEventListener("pointermove",moveHandler);window.removeEventListener("pointerup",upHandler);window.removeEventListener("pointercancel",upHandler);
                if(nekoEl.releasePointerCapture){try{nekoEl.releasePointerCapture(e.pointerId);}catch(_){}}
                if(!isDragging){
                    const currentTime=Date.now();
                    if(currentTime-lastClickTime<300){clearTimeout(clickTimeout);sleep();lastClickTime=0;}
                    else{lastClickTime=currentTime;clickTimeout=setTimeout(()=>{if(forceSleep)sleep();showSkinMenu();},300);}
                }
            };
            window.addEventListener("pointermove",moveHandler,{passive:false});window.addEventListener("pointerup",upHandler);window.addEventListener("pointercancel",upHandler);
        });
        nekoEl.addEventListener("contextmenu",(e)=>{e.preventDefault();kuroNeko=!kuroNeko;localStorage.setItem("oneko:kuroneko",kuroNeko);nekoEl.style.filter=kuroNeko?"invert(100%)":"none";});
        window.onekoInterval=setInterval(frame,100);
    }
    function getSprite(name,frame){return spriteSets[name][frame%spriteSets[name].length];}
    function setSprite(name,frame){const sprite=getSprite(name,frame);nekoEl.style.backgroundPosition=`${sprite[0]*32}px ${sprite[1]*32}px`;}
    function resetIdleAnimation(){idleAnimation=null;idleAnimationFrame=0;}
    function idle(){
        idleTime+=1;let avalibleIdleAnimations=[];
        if(idleTime>10&&Math.floor(Math.random()*25)==0&&idleAnimation==null){
            avalibleIdleAnimations=["scratchSelf","sleeping","scratchSelf","sleeping","scratchSelf"];let scratchW=false,scratchN=false,scratchE=false,scratchS=false;
            let offsetLeft=window.visualViewport?window.visualViewport.offsetLeft:0;let offsetTop=window.visualViewport?window.visualViewport.offsetTop:0;
            let vWidth=window.visualViewport?window.visualViewport.width:window.innerWidth;let vHeight=window.visualViewport?window.visualViewport.height:window.innerHeight;
            if(nekoPosX<offsetLeft+32)scratchW=true;if(nekoPosY<offsetTop+32)scratchN=true;if(nekoPosX>offsetLeft+vWidth-32)scratchE=true;if(nekoPosY>offsetTop+vHeight-32)scratchS=true;
            const cards=document.querySelectorAll('.glowing-card, .spotify-card, .link-card');
            cards.forEach(card=>{
                const rect=card.getBoundingClientRect();if(rect.width===0||rect.height===0)return;
                const rLeft=rect.left+offsetLeft;const rRight=rect.right+offsetLeft;const rTop=rect.top+offsetTop;const rBottom=rect.bottom+offsetTop;const threshold=32;
                if(nekoPosY>=rTop-threshold&&nekoPosY<=rBottom+threshold){
                    if(Math.abs(nekoPosX-rLeft)<=threshold){if(nekoPosX<=rLeft)scratchE=true;else scratchW=true;}
                    if(Math.abs(nekoPosX-rRight)<=threshold){if(nekoPosX>=rRight)scratchW=true;else scratchE=true;}
                }
                if(nekoPosX>=rLeft-threshold&&nekoPosX<=rRight+threshold){
                    if(Math.abs(nekoPosY-rTop)<=threshold){if(nekoPosY<=rTop)scratchS=true;else scratchN=true;}
                    if(Math.abs(nekoPosY-rBottom)<=threshold){if(nekoPosY>=rBottom)scratchN=true;else scratchS=true;}
                }
            });
            let wallAnimations=[];if(scratchW)wallAnimations.push("scratchWallW");if(scratchN)wallAnimations.push("scratchWallN");if(scratchE)wallAnimations.push("scratchWallE");if(scratchS)wallAnimations.push("scratchWallS");
            if(wallAnimations.length>0){if(Math.random()<0.4){idleAnimation=wallAnimations[Math.floor(Math.random()*wallAnimations.length)];}else{idleAnimation=avalibleIdleAnimations[Math.floor(Math.random()*avalibleIdleAnimations.length)];}}
            else{idleAnimation=avalibleIdleAnimations[Math.floor(Math.random()*avalibleIdleAnimations.length)];}
        }
        if(forceSleep)idleAnimation="sleeping";
        switch(idleAnimation){
            case "sleeping":if(idleAnimationFrame<8&&nudge&&forceSleep){setSprite("idle",0);break;}else if(nudge){nudge=false;resetIdleAnimation();}if(idleAnimationFrame<8){setSprite("tired",0);break;}setSprite("sleeping",Math.floor(idleAnimationFrame/4));if(idleAnimationFrame>192&&!forceSleep)resetIdleAnimation();break;
            case "scratchWallN":case "scratchWallS":case "scratchWallE":case "scratchWallW":case "scratchSelf":setSprite(idleAnimation,idleAnimationFrame);if(idleAnimationFrame>9)resetIdleAnimation();break;
            default:setSprite("idle",0);return;
        }
        idleAnimationFrame+=1;
    }
    function frame(){
        frameCount+=1;if(grabbing){grabStop&&setSprite("alert",0);return;}
        const diffX=nekoPosX-mousePosX;const diffY=nekoPosY-mousePosY;const distance=Math.sqrt(diffX**2+diffY**2);
        if(forceSleep&&Math.abs(diffY)<nekoSpeed&&Math.abs(diffX)<nekoSpeed){nekoPosX=mousePosX;nekoPosY=mousePosY;nekoEl.style.left=`${nekoPosX-16}px`;nekoEl.style.top=`${nekoPosY-16}px`;idle();return;}
        if((distance<nekoSpeed||distance<48)&&!forceSleep){idle();return;}
        idleAnimation=null;idleAnimationFrame=0;if(idleTime>1){setSprite("alert",0);idleTime=Math.min(idleTime,7);idleTime-=1;return;}
        let direction=diffY/distance>0.5?"N":"";direction+=diffY/distance<-0.5?"S":"";direction+=diffX/distance>0.5?"W":"";direction+=diffX/distance<-0.5?"E":"";if(!direction)direction="idle";setSprite(direction,frameCount);
        nekoPosX-=(diffX/distance)*nekoSpeed;nekoPosY-=(diffY/distance)*nekoSpeed;
        let offsetLeft=window.visualViewport?window.visualViewport.offsetLeft:0;let offsetTop=window.visualViewport?window.visualViewport.offsetTop:0;
        let vWidth=window.visualViewport?window.visualViewport.width:window.innerWidth;let vHeight=window.visualViewport?window.visualViewport.height:window.innerHeight;
        let minX=offsetLeft+16;let maxX=offsetLeft+vWidth-16;let minY=offsetTop+16;let maxY=offsetTop+vHeight-16;
        nekoPosX=Math.min(Math.max(minX,nekoPosX),maxX);nekoPosY=Math.min(Math.max(minY,nekoPosY),maxY);nekoEl.style.left=`${nekoPosX-16}px`;nekoEl.style.top=`${nekoPosY-16}px`;
    }
    create();
})();
