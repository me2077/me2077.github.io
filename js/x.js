
       <!-- 全局变量与发光卡片阴影控制 功能：跟踪当前页面、动态调整卡片阴影（音乐页特殊处理💜 -->
        let currentPage = 2;
        let musicPlayerLoaded = false;
        const glowingCard = document.querySelector('.glowing-card');
        const originalBoxShadow = '0px 10px 15px rgba(0, 0, 0, 0), 0 0 56px #fff inset';
        function updateGlowingShadow() {
            if (currentPage !== 3) {
                glowingCard.style.boxShadow = originalBoxShadow;
                return;
            }
            const isLight = document.body.classList.contains('light');
            const reducedBoxShadow = isLight ? '0px 10px 15px rgba(0, 0, 0, 0), 0 0 56px #fff inset' : '0px 10px 15px rgba(0, 0, 0, 0), 0 0 56px #fff inset';
            glowingCard.style.boxShadow = reducedBoxShadow;
        }
      
        <!-- 功能：页面加载初始化 启动粒子特效、预加载图片、加载音乐播放器、默认显示第2页💜 -->
        window.onload = function() {
            init();
            preloadImages([
                '/images/AAA.png',
                '/images/CCC.JPG',
                '/images/DDD.JPG'
            ]);
            loadMusicPlayer();
            switchPageTo(2);
        };
      
      <!-- 提前加载背景图，防止切换时闪烁💜 -->
        function preloadImages(urls) {
            urls.forEach(url => {
                const img = new Image();
                img.src = url;
            });
        }
      
      <!-- 翻页动画 + 分页点高亮 + 阴影更新💜 -->
        function switchPageTo(page) {
            if (page < 1 || page > 3) return;
            currentPage = page;
            const pages = document.querySelector('.pages');
            pages.style.transform = `translateX(-${(page - 1) * 100}%)`;
            document.querySelectorAll('.bullet').forEach(b => b.classList.toggle('active', parseInt(b.dataset.page) === page));
            updateGlowingShadow();
            setTimeout(checkVideoVisibility, 300);
        }
      
      <!-- Spotify小卡片播放控制💜 -->
        let isPlaying = false;
        const audio = document.getElementById('audioPlayer');
        function togglePlay(button) {
            if (isPlaying) {
                audio.pause();
                button.classList.remove('playing');
                button.innerHTML = `<svg viewBox="0 0 16 16" fill="white"><path d="M3 13.1231V2.87688C3 1.42024 4.55203 0.520516 5.77196 1.26995L14.1114 6.39307C15.2962 7.12093 15.2962 8.87907 14.1114 9.60693L5.77196 14.73C4.55203 15.4795 3 14.5798 3 13.1231Z"/></svg> Play`;
            } else {
                audio.play();
                button.classList.add('playing');
                button.innerHTML = `<svg viewBox="0 0 16 16" fill="white"><path d="M4 2H6V14H4V2ZM10 2H12V14H10V2Z"/></svg> Pause`;
            }
            isPlaying = !isPlaying;
        }
        audio.addEventListener('ended', () => {
            isPlaying = false;
            const btn = document.querySelector('.play-btn');
            if (btn) {
                btn.classList.remove('playing');
                btn.innerHTML = `<svg viewBox="0 0 16 16" fill="white"><path d="M3 13.1231V2.87688C3 1.42024 4.55203 0.520516 5.77196 1.26995L14.1114 6.39307C15.2962 7.12093 15.2962 8.87907 14.1114 9.60693L5.77196 14.73C4.55203 15.4795 3 14.5798 3 13.1231Z"/></svg> Play`;
            }
        });
      
      <!-- 切换明暗模式 + 粒子画布调整💜 -->
        function toggleTheme(theme) {
            const canvas = document.getElementById('shuicheCanvas');
            if (theme === 'light') {
                document.body.classList.add('light');
                renderer.setClearColor(0x000000, 0);
                document.body.style.background = '';
                document.documentElement.style.setProperty('--fg', 'black');
                canvas.style.display = 'block';
            } else {
                document.body.classList.remove('light');
                renderer.setClearColor(0x000000, 0);
                document.body.style.background = 'black';
                document.documentElement.style.setProperty('--fg', '#f0f0f0');
                canvas.style.display = 'block';
            }
            if (currentPage === 3) {
                updateGlowingShadow();
            }
        }
      
        <!-- 切换两张自定义背景图并强制亮模式💜 -->
        function switchBackground(url) {
            document.body.style.background = `url('${url}') center/cover fixed`;
            document.body.classList.add('light');
            renderer.setClearColor(0x000000, 0);
            document.documentElement.style.setProperty('--fg', 'black');
            document.getElementById('shuicheCanvas').style.display = 'block';
            if (currentPage === 3) {
                updateGlowingShadow();
            }
        }
      
        <!-- 整个音乐播放器核心（歌单、进度条、媒体会话、保存播放状态等）💜 -->
function loadMusicPlayer() {
    let indexSong = 0;
    let isLocked = false;
    let songsLength = null;
    let selectedSong = null;
    let songIsPlayed = false;
    let progress_elmnt = null;
    let songName_elmnt = null;
    let sliderImgs_elmnt = null;
    let singerName_elmnt = null;
    let progressBar_elmnt = null;
    let musicPlayerInfo_elmnt = null;
    let progressBarIsUpdating = false;
    let broadcastGuarantor_elmnt = null;

    const root = document.querySelector("#root");
    const mainAudio = document.getElementById('mainAudio');

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            savePlaybackState();
        }
    });

    function savePlaybackState() {
        if (!selectedSong) return;
        const playbackState = {
            currentSongIndex: indexSong,
            isPlaying: !selectedSong.paused,
            volume: selectedSong.volume,
            currentTime: selectedSong.currentTime
        };
        localStorage.setItem('musicPlayerState', JSON.stringify(playbackState));
    }

    function restorePlaybackState() {
        try {
            const savedState = localStorage.getItem('musicPlayerState');
            if (!savedState) return;
            const playbackState = JSON.parse(savedState);
            if (playbackState.currentSongIndex !== undefined &&
                playbackState.currentSongIndex >= 0 &&
                playbackState.currentSongIndex <= songsLength) {
                indexSong = playbackState.currentSongIndex;
                mainAudio.src = songs[indexSong].files.song;
                mainAudio.load();
                mainAudio.addEventListener('loadedmetadata', () => {
                    if (playbackState.currentTime !== undefined) {
                        mainAudio.currentTime = playbackState.currentTime;
                    }
                    if (playbackState.volume !== undefined) {
                        mainAudio.volume = playbackState.volume;
                    }
                    mainAudio.pause();
                    broadcastGuarantor_elmnt.classList.remove("click");
                    songIsPlayed = false;
                    updateInfo(songName_elmnt, songs[indexSong].songName);
                    updateInfo(singerName_elmnt, songs[indexSong].artist);
                    setProperty(sliderImgs_elmnt, "--index", -indexSong);
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.metadata = new MediaMetadata({
                            title: songs[indexSong].songName,
                            artist: songs[indexSong].artist,
                            artwork: [{ src: songs[indexSong].files.cover, sizes: '512x512', type: 'image/jpeg' }]
                        });
                        navigator.mediaSession.setPositionState({
                            duration: mainAudio.duration,
                            playbackRate: mainAudio.playbackRate,
                            position: mainAudio.currentTime
                        });
                    }
                }, { once: true });
            }
        } catch (e) {
            console.error("Error restoring playback state:", e);
        }
    }

    window.addEventListener('beforeunload', savePlaybackState);
    setInterval(savePlaybackState, 5000);

    function handleChangeMusic({ isPrev = false, playListIndex = null }) {
        if (isLocked) return;
        let newIndex;
        if (playListIndex || playListIndex === 0) {
            newIndex = playListIndex;
        } else {
            newIndex = isPrev ? (indexSong - 1) : (indexSong + 1);
        }
        if (newIndex < 0) { newIndex = songsLength; }
        else if (newIndex > songsLength) { newIndex = 0; }
        if (newIndex === indexSong) return;

        mainAudio.pause();
        indexSong = newIndex;
        mainAudio.src = songs[indexSong].files.song;
        mainAudio.load();
        mainAudio.addEventListener('loadedmetadata', () => {
            if (songIsPlayed) {
                mainAudio.play().catch(e => console.log("Play failed:", e));
            }
            savePlaybackState();
        }, { once: true });

        setProperty(sliderImgs_elmnt, "--index", -indexSong);
        updateInfo(songName_elmnt, songs[indexSong].songName);
        updateInfo(singerName_elmnt, songs[indexSong].artist);
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: songs[indexSong].songName,
                artist: songs[indexSong].artist,
                artwork: [{ src: songs[indexSong].files.cover, sizes: '512x512', type: 'image/jpeg' }]
            });
        }
    }

    function handleResizeSlider({ target }) {
        if (isLocked) return;
        else if (target.classList.contains("music-player__info")) {
            this.classList.add("resize");
            setProperty(this, "--controls-animate", "down running");
            return;
        } else if (target.classList.contains("music-player__playlist-button")) {
            this.classList.remove("resize");
            setProperty(this, "--controls-animate", "up running");
            return;
        }
    }

    function handlePlayMusic() {
        if (mainAudio.currentTime === mainAudio.duration) {
            handleChangeMusic({});
        }
        this.classList.toggle("click");
        songIsPlayed = !songIsPlayed;
        mainAudio.paused ? mainAudio.play() : mainAudio.pause();
        savePlaybackState();
    }

    function updateTheProgressBar() {
        const duration = this.duration;
        const currentTime = this.currentTime;
        const progressBarWidth = (currentTime / duration) * 100;
        setProperty(progressBar_elmnt, "--width", `${progressBarWidth}%`);
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setPositionState({
                duration: this.duration,
                playbackRate: this.playbackRate,
                position: this.currentTime
            });
        }
    }

    function handleSongEnded() {
        if (songIsPlayed) {
            handleChangeMusic({});
        }
    }

    function handleScrub(e) {
        e.preventDefault();
        let clientX = e.clientX;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
        }
        const progressOffsetLeft = progress_elmnt.getBoundingClientRect().left;
        const progressWidth = progress_elmnt.offsetWidth;
        const duration = selectedSong.duration;
        const currentTime = (clientX - progressOffsetLeft) / progressWidth;
        selectedSong.currentTime = currentTime * duration;
    }

    const songs = [
        {
            "bg": "#c9bea28f",
            "artist": "sickick",
            "songName": "talking to the moon (bruno mars remix)",
            "files": {
                        "song": "music/Signals.mp3",
                        "cover": "images/Signals.jpg"
            },
            "duration": "33:45"
        },
        {
            "bg": "#0896eba1",
            "artist": "bless you",
            "songName": "driving",
            "files": {
                        "song": "music/Signals.mp3",
                        "cover": "images/Signals.jpg"
            },
            "duration": "3:28"
        },
        {
            "bg": "#ebbe03",
            "artist": "lil uzi vert",
            "songName": "demon high",
            "files": {
                        "song": "music/Signals.mp3",
                        "cover": "images/Signals.jpg"
            },
            "duration": "2:58"
        },
        {
            "bg": "#ffc382",
            "artist": "travis scott",
            "songName": "a man",
            "files": {
                        "song": "music/Signals.mp3",
                        "cover": "images/Signals.jpg"
            },
            "duration": "3:45"
        },
        {
            "bg": "#ffcbdc",
            "songName": "Memory Reboot",
            "artist": "VØJ/Narvent",
            "files": {
                        "song": "music/Signals.mp3",
                        "cover": "images/Signals.jpg"
            },
            "duration": "3:12"
        },
        {
            "bg": "#44c16fb5",
            "artist": "tritonal",
            "songName": "diamonds (feat. rose darling)",
            "files": {
                        "song": "music/Signals.mp3",
                        "cover": "images/Signals.jpg"
            },
            "duration": "4:05"
        },
        {
            "bg": "#ff4545",
            "artist": "the weeknd",
            "songName": "blinding lights",
            "files": {
                        "song": "music/Signals.mp3",
                        "cover": "images/Signals.jpg"
            },
            "duration": "3:20"
        },
        {
            "bg": "#e5e7e9",
            "artist": "arizona zervas",
            "songName": "no i in team",
            "files": {
                        "song": "music/Signals.mp3",
                        "cover": "images/Signals.jpg"
            },
            "duration": "2:48"
        }
    ];

    const musicPlayer = document.createElement("div");
    musicPlayer.className = "music-player flex-column";

    const slider = document.createElement("div");
    slider.className = "slider center";
    slider.onclick = handleResizeSlider;

    const sliderContent = document.createElement("div");
    sliderContent.className = "slider__content center";

    const playlistButton = document.createElement("button");
    playlistButton.className = "music-player__playlist-button center button";
    const playlistIcon = document.createElement("i");
    playlistIcon.className = "icon-playlist";
    playlistButton.appendChild(playlistIcon);

    const broadcastGuarantor = document.createElement("button");
    broadcastGuarantor.className = "music-player__broadcast-guarantor center button";
    broadcastGuarantor.onclick = handlePlayMusic;
    const playIcon = document.createElement("i");
    playIcon.className = "icon-play";
    const pauseIcon = document.createElement("i");
    pauseIcon.className = "icon-pause";
    broadcastGuarantor.appendChild(playIcon);
    broadcastGuarantor.appendChild(pauseIcon);

    const sliderImgs = document.createElement("div");
    sliderImgs.className = "slider__imgs flex-row";
    songs.forEach(({ files: { cover }, songName }) => {
        const img = document.createElement("img");
        img.src = cover;
        img.className = "img";
        img.alt = songName;
        sliderImgs.appendChild(img);
    });

    sliderContent.appendChild(playlistButton);
    sliderContent.appendChild(broadcastGuarantor);
    sliderContent.appendChild(sliderImgs);

    const sliderControls = document.createElement("div");
    sliderControls.className = "slider__controls center";

    const prevButton = document.createElement("button");
    prevButton.className = "slider__switch-button flex-row button";
    prevButton.onclick = () => handleChangeMusic({ isPrev: true });
    const prevIcon = document.createElement("i");
    prevIcon.className = "icon-back";
    prevButton.appendChild(prevIcon);

    const musicInfo = document.createElement("div");
    musicInfo.className = "music-player__info text_trsf-cap";
    const songNameDiv = document.createElement("div");
    const singerNameDiv = document.createElement("div");
    singerNameDiv.className = "music-player__singer-name";
    singerNameDiv.innerHTML = `<div>${songs[0].songName}</div>`;
    const subtitleDiv = document.createElement("div");
    const subtitle = document.createElement("div");
    subtitle.className = "music-player__subtitle";
    subtitle.innerHTML = `<div>${songs[0].artist}</div>`;
    subtitleDiv.appendChild(subtitle);
    songNameDiv.appendChild(singerNameDiv);
    musicInfo.appendChild(songNameDiv);
    musicInfo.appendChild(subtitleDiv);

    const nextButton = document.createElement("button");
    nextButton.className = "slider__switch-button flex-row button";
    nextButton.onclick = () => handleChangeMusic({ isPrev: false });
    const nextIcon = document.createElement("i");
    nextIcon.className = "icon-next";
    nextButton.appendChild(nextIcon);

    const progress = document.createElement("div");
    progress.className = "progress center";
    progress.onpointerdown = (e) => {
        e.preventDefault();
        handleScrub(e);
        progressBarIsUpdating = true;
    };
    const progressWrapper = document.createElement("div");
    progressWrapper.className = "progress__wrapper";
    const progressBar = document.createElement("div");
    progressBar.className = "progress__bar center";
    progressWrapper.appendChild(progressBar);
    progress.appendChild(progressWrapper);

    sliderControls.appendChild(prevButton);
    sliderControls.appendChild(musicInfo);
    sliderControls.appendChild(nextButton);
    sliderControls.appendChild(progress);

    slider.appendChild(sliderContent);
    slider.appendChild(sliderControls);

    const playlist = document.createElement("ul");
    playlist.className = "music-player__playlist list";

    // 使用自定义时长（不再预加载）
    songs.forEach((song, index) => {
        const { songName, artist, files: { cover }, duration = "0:00" } = song;

        const listItem = document.createElement("li");
        listItem.className = "music-player__song";
        listItem.onclick = () => handleChangeMusic({ playListIndex: index });

        const flexRow = document.createElement("div");
        flexRow.className = "flex-row _align_center";

        const songImg = document.createElement("img");
        songImg.src = cover;
        songImg.className = "img music-player__song-img";

        const playlistInfo = document.createElement("div");
        playlistInfo.className = "music-player__playlist-info text_trsf-cap";

        const songTitle = document.createElement("b");
        songTitle.className = "text_overflow";
        songTitle.textContent = songName;

        const flexRowInfo = document.createElement("div");
        flexRowInfo.className = "flex-row _justify_space-btwn";

        const artistName = document.createElement("span");
        artistName.className = "music-player__subtitle";
        artistName.textContent = artist;

        const songDuration = document.createElement("span");
        songDuration.className = "music-player__song-duration";
        songDuration.textContent = duration;   // ← 自定义时长

        flexRowInfo.appendChild(artistName);
        flexRowInfo.appendChild(songDuration);

        playlistInfo.appendChild(songTitle);
        playlistInfo.appendChild(flexRowInfo);

        flexRow.appendChild(songImg);
        flexRow.appendChild(playlistInfo);
        listItem.appendChild(flexRow);
        playlist.appendChild(listItem);
    });

    musicPlayer.appendChild(slider);
    musicPlayer.appendChild(playlist);

    root.innerHTML = '';
    root.appendChild(musicPlayer);

    songsLength = songs.length - 1;

    progress_elmnt = document.querySelector(".progress");
    sliderImgs_elmnt = document.querySelector(".slider__imgs");
    songName_elmnt = document.querySelector(".music-player__singer-name");
    musicPlayerInfo_elmnt = document.querySelector(".music-player__info");
    singerName_elmnt = document.querySelector(".music-player__subtitle");
    progressBar_elmnt = document.querySelector(".progress__bar");
    broadcastGuarantor_elmnt = document.querySelector(".music-player__broadcast-guarantor");
    selectedSong = mainAudio;

    // 已删除所有预加载时长的 tempAudio 代码

    mainAudio.addEventListener('timeupdate', updateTheProgressBar);
    mainAudio.addEventListener('ended', handleSongEnded);

    controlSubtitleAnimation(musicPlayerInfo_elmnt, songName_elmnt);
    controlSubtitleAnimation(musicPlayerInfo_elmnt, singerName_elmnt);

    mainAudio.src = songs[0].files.song;
    mainAudio.load();

    setTimeout(restorePlaybackState, 100);

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: songs[0].songName,
            artist: songs[0].artist,
            artwork: [{ src: songs[0].files.cover, sizes: '512x512', type: 'image/jpeg' }]
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => handleChangeMusic({ isPrev: true }));
        navigator.mediaSession.setActionHandler('nexttrack', () => handleChangeMusic({ isPrev: false }));
        navigator.mediaSession.setActionHandler('play', () => {
            if (mainAudio.paused) {
                mainAudio.play();
                broadcastGuarantor_elmnt.classList.add("click");
                songIsPlayed = true;
            }
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            if (!mainAudio.paused) {
                mainAudio.pause();
                broadcastGuarantor_elmnt.classList.remove("click");
                songIsPlayed = false;
            }
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime != null) {
                if (details.fastSeek && 'fastSeek' in mainAudio) {
                    mainAudio.fastSeek(details.seekTime);
                } else {
                    mainAudio.currentTime = details.seekTime;
                }
            }
        });
    }

    function controlSubtitleAnimation(parent, child) {
        if (child.classList.contains("animate")) return;
        const element = child.firstChild;
        if (child.clientWidth > parent.clientWidth) {
            child.appendChild(element.cloneNode(true));
            child.classList.add("animate");
        }
        setProperty(child.parentElement, "width", `${element.clientWidth}px`);
    }

    function setProperty(target, prop, value = "") {
        target.style.setProperty(prop, value);
    }

    function updateInfo(target, value) {
        while (target.firstChild) { target.removeChild(target.firstChild); }
        const targetChild_elmnt = document.createElement("div");
        targetChild_elmnt.appendChild(document.createTextNode(value));
        target.appendChild(targetChild_elmnt);
        target.classList.remove("animate");
        controlSubtitleAnimation(musicPlayerInfo_elmnt, target);
    }

    function handleResize() {
        const vH = window.innerHeight * 0.01;
        setProperty(document.documentElement, "--vH", `${vH}px`);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    window.addEventListener("transitionstart", ({ target }) => {
        if (target === sliderImgs_elmnt) {
            isLocked = true;
            setProperty(sliderImgs_elmnt, "will-change", "transform");
        }
    });
    window.addEventListener("transitionend", ({ target, propertyName }) => {
        if (target === sliderImgs_elmnt) {
            isLocked = false;
            setProperty(sliderImgs_elmnt, "will-change", "auto");
        }
        if (target.classList.contains("slider") && propertyName === "height") {
            controlSubtitleAnimation(musicPlayerInfo_elmnt, songName_elmnt);
            controlSubtitleAnimation(musicPlayerInfo_elmnt, singerName_elmnt);
        }
    });
    window.addEventListener("pointerup", (e) => {
        e.preventDefault();
        if (progressBarIsUpdating) {
            selectedSong.muted = false;
            progressBarIsUpdating = false;
        }
    });
    window.addEventListener("pointermove", (e) => {
        if (progressBarIsUpdating) {
            e.preventDefault();
            handleScrub(e);
            selectedSong.muted = true;
        }
    });
    window.addEventListener("touchend", (e) => {
        if (progressBarIsUpdating) {
            selectedSong.muted = false;
            progressBarIsUpdating = false;
        }
    });
    window.addEventListener("touchmove", (e) => {
        if (progressBarIsUpdating) {
            e.preventDefault();
            handleScrub(e);
            selectedSong.muted = true;
        }
    });
}
      
        <!-- 链接滚动条样式控制💜  -->
        const scrollContainer = document.querySelector('.link-scroll-container');
        let scrollTimeout;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', () => {
                scrollContainer.classList.add('scrolling');
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    scrollContainer.classList.remove('scrolling');
                }, 1500);
            });
        }
       const verticalScroll = document.querySelector('#page1 .page-vertical');

if (verticalScroll) {
    verticalScroll.addEventListener('scroll', () => {
        checkVideoVisibility();
    });
}
         <!-- 日间切换按钮悬停效果💜  -->
        document.querySelectorAll('.theme-toggle').forEach(button => {
            button.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.2)';
            });
            button.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
            button.addEventListener('click', function() {
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 350);
            });
        });
      
        document.querySelectorAll('.day-toggle').forEach(button => {
            button.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.2)';
            });
            button.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
            button.addEventListener('click', function() {
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 350);
            });
        });
      
        <!-- 鼠标的猫咪oneko💜  -->



!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.ClipboardJS=e():t.ClipboardJS=e()}(this,function(){return n={686:function(t,e,n){"use strict";n.d(e,{default:function(){return b}});var e=n(279),i=n.n(e),e=n(370),u=n.n(e),e=n(817),r=n.n(e);function c(t){try{return document.execCommand(t)}catch(t){return}}var a=function(t){t=r()(t);return c("cut"),t};function o(t,e){var n,o,t=(n=t,o="rtl"===document.documentElement.getAttribute("dir"),(t=document.createElement("textarea")).style.fontSize="12pt",t.style.border="0",t.style.padding="0",t.style.margin="0",t.style.position="absolute",t.style[o?"right":"left"]="-9999px",o=window.pageYOffset||document.documentElement.scrollTop,t.style.top="".concat(o,"px"),t.setAttribute("readonly",""),t.value=n,t);return e.container.appendChild(t),e=r()(t),c("copy"),t.remove(),e}var f=function(t){var e=1<arguments.length&&void 0!==arguments[1]?arguments[1]:{container:document.body},n="";return"string"==typeof t?n=o(t,e):t instanceof HTMLInputElement&&!["text","search","url","tel","password"].includes(null==t?void 0:t.type)?n=o(t.value,e):(n=r()(t),c("copy")),n};function l(t){return(l="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}var s=function(){var t=0<arguments.length&&void 0!==arguments[0]?arguments[0]:{},e=t.action,n=void 0===e?"copy":e,o=t.container,e=t.target,t=t.text;if("copy"!==n&&"cut"!==n)throw new Error('Invalid "action" value, use either "copy" or "cut"');if(void 0!==e){if(!e||"object"!==l(e)||1!==e.nodeType)throw new Error('Invalid "target" value, use a valid Element');if("copy"===n&&e.hasAttribute("disabled"))throw new Error('Invalid "target" attribute. Please use "readonly" instead of "disabled" attribute');if("cut"===n&&(e.hasAttribute("readonly")||e.hasAttribute("disabled")))throw new Error('Invalid "target" attribute. You can\'t cut text from elements with "readonly" or "disabled" attributes')}return t?f(t,{container:o}):e?"cut"===n?a(e):f(e,{container:o}):void 0};function p(t){return(p="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function d(t,e){for(var n=0;n<e.length;n++){var o=e[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(t,o.key,o)}}function y(t,e){return(y=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t})(t,e)}function h(n){var o=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(t){return!1}}();return function(){var t,e=v(n);return t=o?(t=v(this).constructor,Reflect.construct(e,arguments,t)):e.apply(this,arguments),e=this,!(t=t)||"object"!==p(t)&&"function"!=typeof t?function(t){if(void 0!==t)return t;throw new ReferenceError("this hasn't been initialised - super() hasn't been called")}(e):t}}function v(t){return(v=Object.setPrototypeOf?Object.getPrototypeOf:function(t){return t.__proto__||Object.getPrototypeOf(t)})(t)}function m(t,e){t="data-clipboard-".concat(t);if(e.hasAttribute(t))return e.getAttribute(t)}var b=function(){!function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),e&&y(t,e)}(r,i());var t,e,n,o=h(r);function r(t,e){var n;return function(t){if(!(t instanceof r))throw new TypeError("Cannot call a class as a function")}(this),(n=o.call(this)).resolveOptions(e),n.listenClick(t),n}return t=r,n=[{key:"copy",value:function(t){var e=1<arguments.length&&void 0!==arguments[1]?arguments[1]:{container:document.body};return f(t,e)}},{key:"cut",value:function(t){return a(t)}},{key:"isSupported",value:function(){var t=0<arguments.length&&void 0!==arguments[0]?arguments[0]:["copy","cut"],t="string"==typeof t?[t]:t,e=!!document.queryCommandSupported;return t.forEach(function(t){e=e&&!!document.queryCommandSupported(t)}),e}}],(e=[{key:"resolveOptions",value:function(){var t=0<arguments.length&&void 0!==arguments[0]?arguments[0]:{};this.action="function"==typeof t.action?t.action:this.defaultAction,this.target="function"==typeof t.target?t.target:this.defaultTarget,this.text="function"==typeof t.text?t.text:this.defaultText,this.container="object"===p(t.container)?t.container:document.body}},{key:"listenClick",value:function(t){var e=this;this.listener=u()(t,"click",function(t){return e.onClick(t)})}},{key:"onClick",value:function(t){var e=t.delegateTarget||t.currentTarget,n=this.action(e)||"copy",t=s({action:n,container:this.container,target:this.target(e),text:this.text(e)});this.emit(t?"success":"error",{action:n,text:t,trigger:e,clearSelection:function(){e&&e.focus(),window.getSelection().removeAllRanges()}})}},{key:"defaultAction",value:function(t){return m("action",t)}},{key:"defaultTarget",value:function(t){t=m("target",t);if(t)return document.querySelector(t)}},{key:"defaultText",value:function(t){return m("text",t)}},{key:"destroy",value:function(){this.listener.destroy()}}])&&d(t.prototype,e),n&&d(t,n),r}()},828:function(t){var e;"undefined"==typeof Element||Element.prototype.matches||((e=Element.prototype).matches=e.matchesSelector||e.mozMatchesSelector||e.msMatchesSelector||e.oMatchesSelector||e.webkitMatchesSelector),t.exports=function(t,e){for(;t&&9!==t.nodeType;){if("function"==typeof t.matches&&t.matches(e))return t;t=t.parentNode}}},438:function(t,e,n){var u=n(828);function i(t,e,n,o,r){var i=function(e,n,t,o){return function(t){t.delegateTarget=u(t.target,n),t.delegateTarget&&o.call(e,t)}}.apply(this,arguments);return t.addEventListener(n,i,r),{destroy:function(){t.removeEventListener(n,i,r)}}}t.exports=function(t,e,n,o,r){return"function"==typeof t.addEventListener?i.apply(null,arguments):"function"==typeof n?i.bind(null,document).apply(null,arguments):("string"==typeof t&&(t=document.querySelectorAll(t)),Array.prototype.map.call(t,function(t){return i(t,e,n,o,r)}))}},879:function(t,n){n.node=function(t){return void 0!==t&&t instanceof HTMLElement&&1===t.nodeType},n.nodeList=function(t){var e=Object.prototype.toString.call(t);return void 0!==t&&("[object NodeList]"===e||"[object HTMLCollection]"===e)&&"length"in t&&(0===t.length||n.node(t[0]))},n.string=function(t){return"string"==typeof t||t instanceof String},n.fn=function(t){return"[object Function]"===Object.prototype.toString.call(t)}},370:function(t,e,n){var f=n(879),l=n(438);t.exports=function(t,e,n){if(!t&&!e&&!n)throw new Error("Missing required arguments");if(!f.string(e))throw new TypeError("Second argument must be a String");if(!f.fn(n))throw new TypeError("Third argument must be a Function");if(f.node(t))return c=e,a=n,(u=t).addEventListener(c,a),{destroy:function(){u.removeEventListener(c,a)}};if(f.nodeList(t))return o=t,r=e,i=n,Array.prototype.forEach.call(o,function(t){t.addEventListener(r,i)}),{destroy:function(){Array.prototype.forEach.call(o,function(t){t.removeEventListener(r,i)})}};if(f.string(t))return t=t,e=e,n=n,l(document.body,t,e,n);throw new TypeError("First argument must be a String, HTMLElement, HTMLCollection, or NodeList");var o,r,i,u,c,a}},817:function(t){t.exports=function(t){var e,n="SELECT"===t.nodeName?(t.focus(),t.value):"INPUT"===t.nodeName||"TEXTAREA"===t.nodeName?((e=t.hasAttribute("readonly"))||t.setAttribute("readonly",""),t.select(),t.setSelectionRange(0,t.value.length),e||t.removeAttribute("readonly"),t.value):(t.hasAttribute("contenteditable")&&t.focus(),n=window.getSelection(),(e=document.createRange()).selectNodeContents(t),n.removeAllRanges(),n.addRange(e),n.toString());return n}},279:function(t){function e(){}e.prototype={on:function(t,e,n){var o=this.e||(this.e={});return(o[t]||(o[t]=[])).push({fn:e,ctx:n}),this},once:function(t,e,n){var o=this;function r(){o.off(t,r),e.apply(n,arguments)}return r._=e,this.on(t,r,n)},emit:function(t){for(var e=[].slice.call(arguments,1),n=((this.e||(this.e={}))[t]||[]).slice(),o=0,r=n.length;o<r;o++)n[o].fn.apply(n[o].ctx,e);return this},off:function(t,e){var n=this.e||(this.e={}),o=n[t],r=[];if(o&&e)for(var i=0,u=o.length;i<u;i++)o[i].fn!==e&&o[i].fn._!==e&&r.push(o[i]);return r.length?n[t]=r:delete n[t],this}},t.exports=e,t.exports.TinyEmitter=e}},r={},o.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return o.d(e,{a:e}),e},o.d=function(t,e){for(var n in e)o.o(e,n)&&!o.o(t,n)&&Object.defineProperty(t,n,{enumerable:!0,get:e[n]})},o.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},o(686).default;function o(t){if(r[t])return r[t].exports;var e=r[t]={exports:{}};return n[t](e,e.exports,o),e.exports}var n,r});
        <!-- 头像点击音效💜 -->
        const avatarSound = new Audio("music/Cat.wav");
        avatarSound.volume = 0.35;
      
      
        <!-- 二维码打赏💜 -->
    function toggleReward() {
        const gif     = document.getElementById('neko-gif');
        const qr      = document.getElementById('reward-qr');
        const textOld = document.getElementById('text-original');
        const textNew = document.getElementById('text-new');

        if (gif.style.opacity !== '0') {
            gif.style.opacity = '0';
            textOld.style.opacity = '0';

            qr.style.opacity = '1';
            qr.style.pointerEvents = 'auto';

            textNew.style.opacity = '1';
            textNew.style.pointerEvents = 'auto';
        } else {
            qr.style.opacity = '0';
            qr.style.pointerEvents = 'none';

            textNew.style.opacity = '0';
            textNew.style.pointerEvents = 'none';

            gif.style.opacity = '1';
            textOld.style.opacity = '1';
        }
    }

  <!-- 拷贝微信号跳转 -->
!function(t,e){!function t(e,a,n,r){var o=!!(e.Worker&&e.Blob&&e.Promise&&e.OffscreenCanvas&&e.OffscreenCanvasRenderingContext2D&&e.HTMLCanvasElement&&e.HTMLCanvasElement.prototype.transferControlToOffscreen&&e.URL&&e.URL.createObjectURL),i="function"==typeof Path2D&&"function"==typeof DOMMatrix,l=function(){if(!e.OffscreenCanvas)return!1;var t=new OffscreenCanvas(1,1),a=t.getContext("2d");a.fillRect(0,0,1,1);var n=t.transferToImageBitmap();try{a.createPattern(n,"no-repeat")}catch(t){return!1}return!0}();function s(){}function c(t){var n=a.exports.Promise,r=void 0!==n?n:e.Promise;return"function"==typeof r?new r(t):(t(s,s),null)}var h,f,u,d,m,g,p,b,M,v,y,w=(h=l,f=new Map,{transform:function(t){if(h)return t;if(f.has(t))return f.get(t);var e=new OffscreenCanvas(t.width,t.height);return e.getContext("2d").drawImage(t,0,0),f.set(t,e),e},clear:function(){f.clear()}}),x=(m=Math.floor(1e3/60),g={},p=0,"function"==typeof requestAnimationFrame&&"function"==typeof cancelAnimationFrame?(u=function(t){var e=Math.random();return g[e]=requestAnimationFrame((function a(n){p===n||p+m-1<n?(p=n,delete g[e],t()):g[e]=requestAnimationFrame(a)})),e},d=function(t){g[t]&&cancelAnimationFrame(g[t])}):(u=function(t){return setTimeout(t,m)},d=function(t){return clearTimeout(t)}),{frame:u,cancel:d}),C=(v={},function(){if(b)return b;if(!n&&o){var e=["var CONFETTI, SIZE = {}, module = {};","("+t.toString()+")(this, module, true, SIZE);","onmessage = function(msg) {","  if (msg.data.options) {","    CONFETTI(msg.data.options).then(function () {","      if (msg.data.callback) {","        postMessage({ callback: msg.data.callback });","      }","    });","  } else if (msg.data.reset) {","    CONFETTI && CONFETTI.reset();","  } else if (msg.data.resize) {","    SIZE.width = msg.data.resize.width;","    SIZE.height = msg.data.resize.height;","  } else if (msg.data.canvas) {","    SIZE.width = msg.data.canvas.width;","    SIZE.height = msg.data.canvas.height;","    CONFETTI = module.exports.create(msg.data.canvas);","  }","}"].join("\n");try{b=new Worker(URL.createObjectURL(new Blob([e])))}catch(t){return void 0!==typeof console&&"function"==typeof console.warn&&console.warn("🎊 Could not load worker",t),null}!function(t){function e(e,a){t.postMessage({options:e||{},callback:a})}t.init=function(e){var a=e.transferControlToOffscreen();t.postMessage({canvas:a},[a])},t.fire=function(a,n,r){if(M)return e(a,null),M;var o=Math.random().toString(36).slice(2);return M=c((function(n){function i(e){e.data.callback===o&&(delete v[o],t.removeEventListener("message",i),M=null,w.clear(),r(),n())}t.addEventListener("message",i),e(a,o),v[o]=i.bind(null,{data:{callback:o}})}))},t.reset=function(){for(var e in t.postMessage({reset:!0}),v)v[e](),delete v[e]}}(b)}return b}),I={particleCount:50,angle:90,spread:45,startVelocity:45,decay:.9,gravity:1,drift:0,ticks:200,x:.5,y:.5,shapes:["square","circle"],zIndex:100,colors:["#26ccff","#a25afd","#ff5e7e","#88ff5a","#fcff42","#ffa62d","#ff36ff"],disableForReducedMotion:!1,scalar:1};function T(t,e,a){return function(t,e){return e?e(t):t}(t&&null!=t[e]?t[e]:I[e],a)}function E(t){return t<0?0:Math.floor(t)}function P(t){return parseInt(t,16)}function S(t){return t.map(O)}function O(t){var e=String(t).replace(/[^0-9a-f]/gi,"");return e.length<6&&(e=e[0]+e[0]+e[1]+e[1]+e[2]+e[2]),{r:P(e.substring(0,2)),g:P(e.substring(2,4)),b:P(e.substring(4,6))}}function k(t){t.width=document.documentElement.clientWidth,t.height=document.documentElement.clientHeight}function B(t){var e=t.getBoundingClientRect();t.width=e.width,t.height=e.height}function F(t,e){e.x+=Math.cos(e.angle2D)*e.velocity+e.drift,e.y+=Math.sin(e.angle2D)*e.velocity+e.gravity,e.velocity*=e.decay,e.flat?(e.wobble=0,e.wobbleX=e.x+10*e.scalar,e.wobbleY=e.y+10*e.scalar,e.tiltSin=0,e.tiltCos=0,e.random=1):(e.wobble+=e.wobbleSpeed,e.wobbleX=e.x+10*e.scalar*Math.cos(e.wobble),e.wobbleY=e.y+10*e.scalar*Math.sin(e.wobble),e.tiltAngle+=.1,e.tiltSin=Math.sin(e.tiltAngle),e.tiltCos=Math.cos(e.tiltAngle),e.random=Math.random()+2);var a=e.tick++/e.totalTicks,n=e.x+e.random*e.tiltCos,r=e.y+e.random*e.tiltSin,o=e.wobbleX+e.random*e.tiltCos,l=e.wobbleY+e.random*e.tiltSin;if(t.fillStyle="rgba("+e.color.r+", "+e.color.g+", "+e.color.b+", "+(1-a)+")",t.beginPath(),i&&"path"===e.shape.type&&"string"==typeof e.shape.path&&Array.isArray(e.shape.matrix))t.fill(function(t,e,a,n,r,o,i){var l=new Path2D(t),s=new Path2D;s.addPath(l,new DOMMatrix(e));var c=new Path2D;return c.addPath(s,new DOMMatrix([Math.cos(i)*r,Math.sin(i)*r,-Math.sin(i)*o,Math.cos(i)*o,a,n])),c}(e.shape.path,e.shape.matrix,e.x,e.y,.1*Math.abs(o-n),.1*Math.abs(l-r),Math.PI/10*e.wobble));else if("bitmap"===e.shape.type){var s=Math.PI/10*e.wobble,c=.1*Math.abs(o-n),h=.1*Math.abs(l-r),f=e.shape.bitmap.width*e.scalar,u=e.shape.bitmap.height*e.scalar,d=new DOMMatrix([Math.cos(s)*c,Math.sin(s)*c,-Math.sin(s)*h,Math.cos(s)*h,e.x,e.y]);d.multiplySelf(new DOMMatrix(e.shape.matrix));var m=t.createPattern(w.transform(e.shape.bitmap),"no-repeat");m.setTransform(d),t.globalAlpha=1-a,t.fillStyle=m,t.fillRect(e.x-f/2,e.y-u/2,f,u),t.globalAlpha=1}else if("circle"===e.shape)t.ellipse?t.ellipse(e.x,e.y,Math.abs(o-n)*e.ovalScalar,Math.abs(l-r)*e.ovalScalar,Math.PI/10*e.wobble,0,2*Math.PI):function(t,e,a,n,r,o,i,l,s){t.save(),t.translate(e,a),t.rotate(o),t.scale(n,r),t.arc(0,0,1,i,l,s),t.restore()}(t,e.x,e.y,Math.abs(o-n)*e.ovalScalar,Math.abs(l-r)*e.ovalScalar,Math.PI/10*e.wobble,0,2*Math.PI);else if("star"===e.shape)for(var g=Math.PI/2*3,p=4*e.scalar,b=8*e.scalar,M=e.x,v=e.y,y=5,x=Math.PI/y;y--;)M=e.x+Math.cos(g)*b,v=e.y+Math.sin(g)*b,t.lineTo(M,v),g+=x,M=e.x+Math.cos(g)*p,v=e.y+Math.sin(g)*p,t.lineTo(M,v),g+=x;else t.moveTo(Math.floor(e.x),Math.floor(e.y)),t.lineTo(Math.floor(e.wobbleX),Math.floor(r)),t.lineTo(Math.floor(o),Math.floor(l)),t.lineTo(Math.floor(n),Math.floor(e.wobbleY));return t.closePath(),t.fill(),e.tick<e.totalTicks}function A(t,a){var i,l=!t,s=!!T(a||{},"resize"),h=!1,f=T(a,"disableForReducedMotion",Boolean),u=o&&!!T(a||{},"useWorker")?C():null,d=l?k:B,m=!(!t||!u)&&!!t.__confetti_initialized,g="function"==typeof matchMedia&&matchMedia("(prefers-reduced-motion)").matches;function p(e,a,o){for(var l,s,h,f,u,m=T(e,"particleCount",E),g=T(e,"angle",Number),p=T(e,"spread",Number),b=T(e,"startVelocity",Number),M=T(e,"decay",Number),v=T(e,"gravity",Number),y=T(e,"drift",Number),C=T(e,"colors",S),I=T(e,"ticks",Number),P=T(e,"shapes"),O=T(e,"scalar"),k=!!T(e,"flat"),B=function(t){var e=T(t,"origin",Object);return e.x=T(e,"x",Number),e.y=T(e,"y",Number),e}(e),A=m,R=[],N=t.width*B.x,z=t.height*B.y;A--;)R.push((l={x:N,y:z,angle:g,spread:p,startVelocity:b,color:C[A%C.length],shape:P[(f=0,u=P.length,Math.floor(Math.random()*(u-f))+f)],ticks:I,decay:M,gravity:v,drift:y,scalar:O,flat:k},s=void 0,h=void 0,s=l.angle*(Math.PI/180),h=l.spread*(Math.PI/180),{x:l.x,y:l.y,wobble:10*Math.random(),wobbleSpeed:Math.min(.11,.1*Math.random()+.05),velocity:.5*l.startVelocity+Math.random()*l.startVelocity,angle2D:-s+(.5*h-Math.random()*h),tiltAngle:(.5*Math.random()+.25)*Math.PI,color:l.color,shape:l.shape,tick:0,totalTicks:l.ticks,decay:l.decay,drift:l.drift,random:Math.random()+2,tiltSin:0,tiltCos:0,wobbleX:0,wobbleY:0,gravity:3*l.gravity,ovalScalar:.6,scalar:l.scalar,flat:l.flat}));return i?i.addFettis(R):(i=function(t,e,a,o,i){var l,s,h=e.slice(),f=t.getContext("2d"),u=c((function(e){function c(){l=s=null,f.clearRect(0,0,o.width,o.height),w.clear(),i(),e()}l=x.frame((function e(){!n||o.width===r.width&&o.height===r.height||(o.width=t.width=r.width,o.height=t.height=r.height),o.width||o.height||(a(t),o.width=t.width,o.height=t.height),f.clearRect(0,0,o.width,o.height),(h=h.filter((function(t){return F(f,t)}))).length?l=x.frame(e):c()})),s=c}));return{addFettis:function(t){return h=h.concat(t),u},canvas:t,promise:u,reset:function(){l&&x.cancel(l),s&&s()}}}(t,R,d,a,o),i.promise)}function b(a){var n=f||T(a,"disableForReducedMotion",Boolean),r=T(a,"zIndex",Number);if(n&&g)return c((function(t){t()}));l&&i?t=i.canvas:l&&!t&&(t=function(t){var e=document.createElement("canvas");return e.style.position="fixed",e.style.top="0px",e.style.left="0px",e.style.pointerEvents="none",e.style.zIndex=t,e}(r),document.body.appendChild(t)),s&&!m&&d(t);var o={width:t.width,height:t.height};function b(){if(u){var e={getBoundingClientRect:function(){if(!l)return t.getBoundingClientRect()}};return d(e),void u.postMessage({resize:{width:e.width,height:e.height}})}o.width=o.height=null}function M(){i=null,s&&(h=!1,e.removeEventListener("resize",b)),l&&t&&(document.body.contains(t)&&document.body.removeChild(t),t=null,m=!1)}return u&&!m&&u.init(t),m=!0,u&&(t.__confetti_initialized=!0),s&&!h&&(h=!0,e.addEventListener("resize",b,!1)),u?u.fire(a,o,M):p(a,o,M)}return b.reset=function(){u&&u.reset(),i&&i.reset()},b}function R(){return y||(y=A(null,{useWorker:!0,resize:!0})),y}a.exports=function(){return R().apply(this,arguments)},a.exports.reset=function(){R().reset()},a.exports.create=A,a.exports.shapeFromPath=function(t){if(!i)throw new Error("path confetti are not supported in this browser");var e,a;"string"==typeof t?e=t:(e=t.path,a=t.matrix);var n=new Path2D(e),r=document.createElement("canvas").getContext("2d");if(!a){for(var o,l,s=1e3,c=s,h=s,f=0,u=0,d=0;d<s;d+=2)for(var m=0;m<s;m+=2)r.isPointInPath(n,d,m,"nonzero")&&(c=Math.min(c,d),h=Math.min(h,m),f=Math.max(f,d),u=Math.max(u,m));o=f-c,l=u-h;var g=Math.min(10/o,10/l);a=[g,0,0,g,-Math.round(o/2+c)*g,-Math.round(l/2+h)*g]}return{type:"path",path:e,matrix:a}},a.exports.shapeFromText=function(t){var e,a=1,n="#000000",r='"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", "Twemoji Mozilla", "system emoji", sans-serif';"string"==typeof t?e=t:(e=t.text,a="scalar"in t?t.scalar:a,r="fontFamily"in t?t.fontFamily:r,n="color"in t?t.color:n);var o=10*a,i=o+"px "+r,l=new OffscreenCanvas(o,o),s=l.getContext("2d");s.font=i;var c=s.measureText(e),h=Math.ceil(c.actualBoundingBoxRight+c.actualBoundingBoxLeft),f=Math.ceil(c.actualBoundingBoxAscent+c.actualBoundingBoxDescent),u=c.actualBoundingBoxLeft+2,d=c.actualBoundingBoxAscent+2;h+=4,f+=4,(s=(l=new OffscreenCanvas(h,f)).getContext("2d")).font=i,s.fillStyle=n,s.fillText(e,u,d);var m=1/a;return{type:"bitmap",bitmap:l.transferToImageBitmap(),matrix:[m,0,0,m,-h*m/2,-f*m/2]}}}(function(){return void 0!==t?t:"undefined"!=typeof self?self:this||{}}(),e,!1),t.confetti=e.exports}(window,{});

        const wechatID = "lllIIllIIlIII";
        var clipboard = new ClipboardJS('#wechatBtn', {
            text: function() {
                return wechatID;
            }
        });
        clipboard.on('success', function(e) {
            alert('👉微信号复制成功,即将前往微信！');
            window.location.href = 'wechat://';
        });
        clipboard.on('error', function(e) {
            alert('复制失败,请手动输入 ' + wechatID);
            window.location.href = 'wechat://dl/scan';
        });
  <!--page1-5视频 -->
const video = document.getElementById('page1Video');
let videoLoaded = false;

function checkVideoVisibility() {
    const page = document.getElementById('page1-5');
    const rect = page.getBoundingClientRect();

    // 判断是否在可视区域（中间位置）
    const inView = rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.4;

    if (inView) {
        // 👉 第一次进入才加载
        if (!videoLoaded) {
            video.src = "https://dogpan.com/f/2kq5C8/xxx.mp4";
            videoLoaded = true;
        }

        // 👉 自动播放（iOS 需要静音）
        video.muted = true;
        video.play().catch(() => {});
    } else {
        // 👉 离开暂停
        video.pause();
    }
}
video.addEventListener('click', () => {
    video.muted = false;
});


(async function oneko() {
  const nekoEl = document.createElement("div");
  let nekoPosX = 32,
    nekoPosY = 32,
    mousePosX = 0,
    mousePosY = 0,
    frameCount = 0,
    idleTime = 0,
    idleAnimation = null,
    idleAnimationFrame = 0,
    forceSleep = false,
    grabbing = false,
    grabStop = true,
    nudge = false,
    kuroNeko = false,
    variant = "classic",
    lastClickTime = 0; // ⭐ 新增：记录上一次点击的时间戳

  function parseLocalStorage(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(`oneko:${key}`));
      return typeof value === typeof fallback ? value : fallback;
    } catch (e) {
      console.error(e);
      return fallback;
    }
  }

  const nekoSpeed = 10,
    variants = [
      ["classic", "Classic"],
      ["dog", "Dog"],
      ["tora", "Tora"],
      ["maia", "Maia"],
      ["vaporwave", "Vaporwave"],
    ],
    spriteSets = {
      idle: [[-3, -3]],
      alert: [[-7, -3]],
      scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
      scratchWallN: [[0, 0], [0, -1]],
      scratchWallS: [[-7, -1], [-6, -2]],
      scratchWallE: [[-2, -2], [-2, -3]],
      scratchWallW: [[-4, 0], [-4, -1]],
      tired: [[-3, -2]],
      sleeping: [[-2, 0], [-2, -1]],
      N: [[-1, -2], [-1, -3]],
      NE: [[0, -2], [0, -3]],
      E: [[-3, 0], [-3, -1]],
      SE: [[-5, -1], [-5, -2]],
      S: [[-6, -3], [-7, -2]],
      SW: [[-5, -3], [-6, -1]],
      W: [[-4, -2], [-4, -3]],
      NW: [[-1, 0], [-1, -1]],
    };

  function sleep() {
    forceSleep = !forceSleep;
    nudge = false;
    localStorage.setItem("oneko:forceSleep", forceSleep);
    if (!forceSleep) {
      resetIdleAnimation();
      return;
    }
    mousePosX = nekoPosX;
    mousePosY = nekoPosY;
  }

  function create() {
    variant = parseLocalStorage("variant", "classic");
    kuroNeko = parseLocalStorage("kuroneko", false);

    if (!variants.some((v) => v[0] === variant)) {
      variant = "classic";
    }

    nekoEl.id = "oneko";
    nekoEl.style.width = "32px";
    nekoEl.style.height = "32px";
    nekoEl.style.position = "fixed";
    nekoEl.style.backgroundImage = `url('images/oneko-${variant}.gif')`;
    nekoEl.style.imageRendering = "pixelated";
    nekoEl.style.left = `${nekoPosX - 16}px`;
    nekoEl.style.top = `${nekoPosY - 16}px`;
    nekoEl.style.filter = kuroNeko ? "invert(100%)" : "none";
    nekoEl.style.zIndex = "9999";

    // 移动端支持拖动
    nekoEl.style.touchAction = "none";
    nekoEl.style.userSelect = "none";
    nekoEl.style.webkitUserSelect = "none";

    document.body.appendChild(nekoEl);

    // 鼠标跟随（桌面）
    window.addEventListener("mousemove", (e) => {
      if (forceSleep) return;
      mousePosX = e.clientX;
      mousePosY = e.clientY;
    });

    // 移动端触摸跟随
    window.addEventListener("pointermove", (e) => {
      if (forceSleep) return;
      if (e.pointerType === "touch") {
        mousePosX = e.clientX;
        mousePosY = e.clientY;
      }
    });

    window.addEventListener("resize", () => {
      if (forceSleep) {
        forceSleep = false;
        sleep();
      }
    });

    // 核心：统一拖动（鼠标 + 手机）
    nekoEl.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;

      // ⭐⭐⭐ 新增：自定义双击/双触控检测逻辑
      const currentTime = Date.now();
      if (currentTime - lastClickTime < 300) { // 两次点击间隔小于 300 毫秒视为双击
        sleep();           // 触发睡觉/唤醒
        lastClickTime = 0; // 重置时间
        return;            // 触发双击后直接退出，不再执行下方的拖动逻辑
      }
      lastClickTime = currentTime;
      // ⭐⭐⭐ 结束新增部分

      e.preventDefault();
      grabbing = true;

      if (nekoEl.setPointerCapture) {
        try {
          nekoEl.setPointerCapture(e.pointerId);
        } catch (_) {}
      }

      let startX = e.clientX;
      let startY = e.clientY;
      let startNekoX = nekoPosX;
      let startNekoY = nekoPosY;
      let grabInterval;

      const moveHandler = (e) => {
        e.preventDefault();

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        if (absDeltaX > absDeltaY && absDeltaX > 10) {
          setSprite(deltaX > 0 ? "scratchWallW" : "scratchWallE", frameCount);
        } else if (absDeltaY > absDeltaX && absDeltaY > 10) {
          setSprite(deltaY > 0 ? "scratchWallN" : "scratchWallS", frameCount);
        }

        if (grabStop || absDeltaX > 10 || absDeltaY > 10 || Math.sqrt(deltaX ** 2 + deltaY ** 2) > 10) {
          grabStop = false;
          clearTimeout(grabInterval);
          grabInterval = setTimeout(() => {
            grabStop = true;
            nudge = false;
            startX = e.clientX;
            startY = e.clientY;
            startNekoX = nekoPosX;
            startNekoY = nekoPosY;
          }, 150);
        }

        nekoPosX = startNekoX + e.clientX - startX;
        nekoPosY = startNekoY + e.clientY - startY;
        nekoEl.style.left = `${nekoPosX - 16}px`;
        nekoEl.style.top = `${nekoPosY - 16}px`;
      };

      const upHandler = (e) => {
        grabbing = false;
        nudge = true;
        resetIdleAnimation();

        window.removeEventListener("pointermove", moveHandler);
        window.removeEventListener("pointerup", upHandler);
        window.removeEventListener("pointercancel", upHandler);

        if (nekoEl.releasePointerCapture) {
          try {
            nekoEl.releasePointerCapture(e.pointerId);
          } catch (_) {}
        }
      };

      window.addEventListener("pointermove", moveHandler, { passive: false });
      window.addEventListener("pointerup", upHandler);
      window.addEventListener("pointercancel", upHandler);
    });

    nekoEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      kuroNeko = !kuroNeko;
      localStorage.setItem("oneko:kuroneko", kuroNeko);
      nekoEl.style.filter = kuroNeko ? "invert(100%)" : "none";
    });

    // ⭐ 删除了原来的 dblclick 事件监听
    // nekoEl.addEventListener("dblclick", sleep);

    window.onekoInterval = setInterval(frame, 100);
  }

  function getSprite(name, frame) {
    return spriteSets[name][frame % spriteSets[name].length];
  }

  function setSprite(name, frame) {
    const sprite = getSprite(name, frame);
    nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
  }

  function resetIdleAnimation() {
    idleAnimation = null;
    idleAnimationFrame = 0;
  }

  function idle() {
    idleTime += 1;
    let avalibleIdleAnimations = [];

    if (idleTime > 10 && Math.floor(Math.random() * 200) == 0 && idleAnimation == null) {
      avalibleIdleAnimations = ["sleeping", "scratchSelf"];
      if (nekoPosX < 32) avalibleIdleAnimations.push("scratchWallW");
      if (nekoPosY < 32) avalibleIdleAnimations.push("scratchWallN");
      if (nekoPosX > window.innerWidth - 32) avalibleIdleAnimations.push("scratchWallE");
      if (nekoPosY > window.innerHeight - 32) avalibleIdleAnimations.push("scratchWallS");
      idleAnimation = avalibleIdleAnimations[Math.floor(Math.random() * avalibleIdleAnimations.length)];
    }

    if (forceSleep) idleAnimation = "sleeping";

    switch (idleAnimation) {
      case "sleeping":
        if (idleAnimationFrame < 8 && nudge && forceSleep) {
          setSprite("idle", 0);
          break;
        } else if (nudge) {
          nudge = false;
          resetIdleAnimation();
        }
        if (idleAnimationFrame < 8) {
          setSprite("tired", 0);
          break;
        }
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

    if (grabbing) {
      grabStop && setSprite("alert", 0);
      return;
    }

    const diffX = nekoPosX - mousePosX;
    const diffY = nekoPosY - mousePosY;
    const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

    if (forceSleep && Math.abs(diffY) < nekoSpeed && Math.abs(diffX) < nekoSpeed) {
      nekoPosX = mousePosX;
      nekoPosY = mousePosY;
      nekoEl.style.left = `${nekoPosX - 16}px`;
      nekoEl.style.top = `${nekoPosY - 16}px`;
      idle();
      return;
    }

    if ((distance < nekoSpeed || distance < 48) && !forceSleep) {
      idle();
      return;
    }

    idleAnimation = null;
    idleAnimationFrame = 0;

    if (idleTime > 1) {
      setSprite("alert", 0);
      idleTime = Math.min(idleTime, 7);
      idleTime -= 1;
      return;
    }

    let direction = diffY / distance > 0.5 ? "N" : "";
    direction += diffY / distance < -0.5 ? "S" : "";
    direction += diffX / distance > 0.5 ? "W" : "";
    direction += diffX / distance < -0.5 ? "E" : "";
    if (!direction) direction = "idle";

    setSprite(direction, frameCount);

    nekoPosX -= (diffX / distance) * nekoSpeed;
    nekoPosY -= (diffY / distance) * nekoSpeed;

    nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
    nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);

    nekoEl.style.left = `${nekoPosX - 16}px`;
    nekoEl.style.top = `${nekoPosY - 16}px`;
  }

  create();
})();