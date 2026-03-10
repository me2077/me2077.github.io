        const count = 5000;
        let scene, camera, renderer;
        let mouseX = 0, mouseY = 0;
        let windowHalfX = window.innerWidth / 2;
        let windowHalfY = window.innerHeight / 2;
        let geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6 * count), 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(new Float32Array(2 * count), 1));
        let position = geometry.getAttribute('position');
        let positionArray = position.array;
        let velocity = geometry.getAttribute('velocity');
        let velocityArray = velocity.array;
        function init() {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 1, 500);
            camera.position.z = 200;
            const canvas = document.getElementById('shuicheCanvas');
            renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight, false);
            renderer.setClearColor(0x000000, 0);
            for (let index = 0, len = count; index < len; index++) {
                const x = Math.random() * 800 - 400;
                const y = Math.random() * 800 - 400;
                const z = Math.random() * 400 - 200;
                const x2 = x;
                const y2 = y;
                const z2 = z;
                positionArray[6 * index] = x;
                positionArray[6 * index + 1] = y;
                positionArray[6 * index + 2] = z;
                positionArray[6 * index + 3] = x2;
                positionArray[6 * index + 4] = y2;
                positionArray[6 * index + 5] = z2;
                velocityArray[2 * index] = 0;
                velocityArray[2 * index + 1] = 0;
            }
            let material = new THREE.LineBasicMaterial({ color: 0xffffff });
            let lines = new THREE.LineSegments(geometry, material);
            scene.add(lines);
            window.addEventListener('resize', resize, false);
            document.body.addEventListener('pointermove', onPointerMove);
            anime();
        }
        function resize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            windowHalfX = window.innerWidth / 2;
            windowHalfY = window.innerHeight / 2;
        }
        function anime() {
            for (let index = 0, len = count; index < len; index++) {
                velocityArray[2 * index] += 0.015;
                velocityArray[2 * index + 1] += 0.015;
                positionArray[6 * index + 2] += velocityArray[2 * index] + 0.03;
                positionArray[6 * index + 5] += velocityArray[2 * index + 1];
                if(positionArray[6 * index + 2] > 200) {
                    let z = Math.random() * 200 - 200;
                    positionArray[6 * index + 2] = z;
                    positionArray[6 * index + 5] = z;
                    velocityArray[2 * index] = 0;
                    velocityArray[2 * index + 1] = 0;
                }
            }
            position.needsUpdate = true;
            renderer.render(scene, camera);
            requestAnimationFrame(anime);
            render();
        }
        function onPointerMove(event) {
            mouseX = event.clientX - windowHalfX;
            mouseY = event.clientY - windowHalfY;
        }
        function render() {
            camera.position.x += (-mouseX * 0.1 - camera.position.x) * 0.02;
            camera.position.y += (-mouseY * 0.1 - camera.position.y) * 0.02;
            camera.lookAt(scene.position);
            renderer.render(scene, camera);
        }

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
                    if (playbackState.currentSongIndex !== undefined && playbackState.currentSongIndex >= 0 && playbackState.currentSongIndex <= songsLength) {
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
                                    artwork: getArtwork(songs[indexSong].files.cover)
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
            function getArtwork(coverUrl) {
                return [
                    { src: coverUrl, sizes: '96x96', type: 'image/jpeg' },
                    { src: coverUrl, sizes: '128x128', type: 'image/jpeg' },
                    { src: coverUrl, sizes: '192x192', type: 'image/jpeg' },
                    { src: coverUrl, sizes: '256x256', type: 'image/jpeg' },
                    { src: coverUrl, sizes: '384x384', type: 'image/jpeg' },
                    { src: coverUrl, sizes: '512x512', type: 'image/jpeg' }
                ];
            }
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
                        artwork: getArtwork(songs[indexSong].files.cover)
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
                    }
                },
                {
                    "bg": "#0896eba1",
                    "artist": "bless you",
                    "songName": "driving",
                    "files": {
                        "song": "music/Signals.mp3",
                        "cover": "images/Signals.jpg"
                    }
                },
                {
                    "bg": "#ebbe03",
                    "artist": "lil uzi vert",
                    "songName": "demon high",
                    "files": {
                        "song": "music/Signals.mp3",
                        "cover": "images/Signals.jpg"
                    }
                },
                {
                    "bg": "#ffc382",
                    "artist": "travis scott",
                    "songName": "a man",
                    "files": {
                        "song": "music/Signals.mp3",
                        "cover": "himages/Signals.jpg"
                    }
                },
                {
                    "bg": "#ffcbdc",
                    "songName": "Memory Reboot",
                    "artist": "VØJ/Narvent",
                    "files": {
                        "song": "music/Signals.mp3",
                        "cover": "images/Signals.jpg"
                    }
                },
                {
                    "bg": "#44c16fb5",
                    "artist": "tritonal",
                    "songName": "diamonds (feat. rose darling)",
                    "files": {
                        "song": "music/Signals.mp3",
                        "cover": "images/Signals.jpg"
                    }
                },
                {
                    "bg": "#ff4545",
                    "artist": "the weeknd",
                    "songName": "blinding lights",
                    "files": {
                        "song": "music/Signals.mp3",
                        "cover": "images/Signals.jpg"
                    }
                },
                {
                    "bg": "#e5e7e9",
                    "artist": "arizona zervas",
                    "songName": "no i in team",
                    "files": {
                        "song": "music/Signals.mp3",
                        "cover": "images/Signals.jpg"
                    }
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
            songs.forEach(({ songName, artist, files: { cover } }, index) => {
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
            const durationElements = document.querySelectorAll(".music-player__song-duration");
            songs.forEach((song, i) => {
                const tempAudio = new Audio(song.files.song);
                tempAudio.addEventListener('loadedmetadata', () => {
                    const duration = tempAudio.duration;
                    let min = parseInt(duration / 60); if (min < 10) min = "0" + min;
                    let sec = parseInt(duration % 60); if (sec < 10) sec = "0" + sec;
                    durationElements[i].textContent = `${min}:${sec}`;
                });
                tempAudio.load();
            });
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
                    artwork: getArtwork(songs[0].files.cover)
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
            const playlistScrollContainer = document.querySelector('.music-player__playlist');
            let scrollTimeout2;
            if (playlistScrollContainer) {
                playlistScrollContainer.addEventListener('scroll', () => {
                    playlistScrollContainer.classList.add('scrolling');
                    clearTimeout(scrollTimeout2);
                    scrollTimeout2 = setTimeout(() => {
                        playlistScrollContainer.classList.remove('scrolling');
                    }, 1500);
                }, { passive: true });
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
        (async function oneko() {
            const nekoEl = document.createElement("div");
            let nekoPosX = 32, nekoPosY = 32, mousePosX = 0, mousePosY = 0, frameCount = 0, idleTime = 0, idleAnimation = null, idleAnimationFrame = 0, forceSleep = false, grabbing = false, grabStop = true, nudge = false, kuroNeko = false, variant = "classic";
            function parseLocalStorage(key, fallback) {
                try {
                    const value = JSON.parse(localStorage.getItem(`oneko:${key}`));
                    return typeof value === typeof fallback ? value : fallback;
                } catch (e) {
                    console.error(e);
                    return fallback;
                }
            }
            const nekoSpeed = 10, variants = [["classic", "Classic"],["dog", "Dog"],["tora", "Tora"],["maia", "Maia (maia.crimew.gay)"],["vaporwave", "Vaporwave (nya.rest)"]], spriteSets = { idle: [[-3, -3]], alert: [[-7, -3]], scratchSelf: [[-5, 0],[-6, 0],[-7, 0]], scratchWallN: [[0, 0],[0, -1]], scratchWallS: [[-7, -1],[-6, -2]], scratchWallE: [[-2, -2],[-2, -3]], scratchWallW: [[-4, 0],[-4, -1]], tired: [[-3, -2]], sleeping: [[-2, 0],[-2, -1]], N: [[-1, -2],[-1, -3]], NE: [[0, -2],[0, -3]], E: [[-3, 0],[-3, -1]], SE: [[-5, -1],[-5, -2]], S: [[-6, -3],[-7, -2]], SW: [[-5, -3],[-6, -1]], W: [[-4, -2],[-4, -3]], NW: [[-1, 0],[-1, -1]] }, keys = Object.keys(spriteSets).filter((key) => spriteSets[key].length > 1), usedKeys = new Set();
            function sleep() {
                forceSleep = !forceSleep;
                nudge = false;
                localStorage.setItem("oneko:forceSleep", forceSleep);
                if (!forceSleep) {
                    resetIdleAnimation();
                    return;
                }
                const fullAppDisplay = document.getElementById("fad-progress");
                if (fullAppDisplay) {
                    mousePosX = fullAppDisplay.getBoundingClientRect().right - 16;
                    mousePosY = fullAppDisplay.getBoundingClientRect().top - 12;
                    return;
                }
                const progressBar = document.querySelector(".main-nowPlayingBar-center .playback-progressbar");
                const progressBarRight = progressBar.getBoundingClientRect().right;
                const progressBarTop = progressBar.getBoundingClientRect().top;
                const progressBarBottom = progressBar.getBoundingClientRect().bottom;
                mousePosX = progressBarRight - 16;
                mousePosY = progressBarTop - 8;
                const remainingTime = document.querySelector(".main-playbackBarRemainingTime-container");
                const remainingTimeLeft = remainingTime.getBoundingClientRect().left;
                const remainingTimeBottom = remainingTime.getBoundingClientRect().bottom;
                const remainingTimeTop = remainingTime.getBoundingClientRect().top;
                const elapsedTime = document.querySelector(".playback-bar__progress-time-elapsed");
                const elapsedTimeRight = elapsedTime.getBoundingClientRect().right;
                const elapsedTimeLeft = elapsedTime.getBoundingClientRect().left;
                if (remainingTimeLeft < progressBarRight && remainingTimeTop < progressBarBottom && progressBarTop - remainingTimeBottom < 32) {
                    mousePosX = remainingTimeLeft - 16;
                    if (Spicetify.Config.current_theme === "Comfy") {
                        mousePosY = progressBarTop - 14;
                    }
                    if (remainingTimeLeft - elapsedTimeRight < 32) {
                        mousePosX = elapsedTimeLeft - 16;
                    }
                }
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
                nekoEl.style.backgroundImage = `url('https://raw.githubusercontent.com/kyrie25/spicetify-oneko/main/assets/oneko/oneko-${variant}.gif')`;
                nekoEl.style.imageRendering = "pixelated";
                nekoEl.style.left = `${nekoPosX - 16}px`;
                nekoEl.style.top = `${nekoPosY - 16}px`;
                nekoEl.style.filter = kuroNeko ? "invert(100%)" : "none";
                nekoEl.style.zIndex = "99";
                document.body.appendChild(nekoEl);
                window.addEventListener("mousemove", (e) => {
                    if (forceSleep) return;
                    mousePosX = e.clientX;
                    mousePosY = e.clientY;
                });
                window.addEventListener("resize", () => {
                    if (forceSleep) {
                        forceSleep = false;
                        sleep();
                    }
                });
                nekoEl.addEventListener("mousedown", (e) => {
                    if (e.button !== 0) return;
                    grabbing = true;
                    let startX = e.clientX;
                    let startY = e.clientY;
                    let startNekoX = nekoPosX;
                    let startNekoY = nekoPosY;
                    let grabInterval;
                    const mousemove = (e) => {
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
                    const mouseup = () => {
                        grabbing = false;
                        nudge = true;
                        resetIdleAnimation();
                        window.removeEventListener("mousemove", mousemove);
                        window.removeEventListener("mouseup", mouseup);
                    };
                    window.addEventListener("mousemove", mousemove);
                    window.addEventListener("mouseup", mouseup);
                });
                nekoEl.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                    kuroNeko = !kuroNeko;
                    localStorage.setItem("oneko:kuroneko", kuroNeko);
                    nekoEl.style.filter = kuroNeko ? "invert(100%)" : "none";
                });
                nekoEl.addEventListener("dblclick", sleep);
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
                if (idleTime > 10 && Math.floor(Math.random() * 200) == 0 && idleAnimation == null) {
                    let avalibleIdleAnimations = ["sleeping", "scratchSelf"];
                    if (nekoPosX < 32) {
                        avalibleIdleAnimations.push("scratchWallW");
                    }
                    if (nekoPosY < 32) {
                        avalibleIdleAnimations.push("scratchWallN");
                    }
                    if (nekoPosX > window.innerWidth - 32) {
                        avalibleIdleAnimations.push("scratchWallE");
                    }
                    if (nekoPosY > window.innerHeight - 32) {
                        avalibleIdleAnimations.push("scratchWallS");
                    }
                    idleAnimation = avalibleIdleAnimations[Math.floor(Math.random() * avalibleIdleAnimations.length)];
                }
                if (forceSleep) {
                    avalibleIdleAnimations = ["sleeping"];
                    idleAnimation = "sleeping";
                }
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
                        if (idleAnimationFrame > 192 && !forceSleep) {
                            resetIdleAnimation();
                        }
                        break;
                    case "scratchWallN":
                    case "scratchWallS":
                    case "scratchWallE":
                    case "scratchWallW":
                    case "scratchSelf":
                        setSprite(idleAnimation, idleAnimationFrame);
                        if (idleAnimationFrame > 9) {
                            resetIdleAnimation();
                        }
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
                direction = diffY / distance > 0.5 ? "N" : "";
                direction += diffY / distance < -0.5 ? "S" : "";
                direction += diffX / distance > 0.5 ? "W" : "";
                direction += diffX / distance < -0.5 ? "E" : "";
                setSprite(direction, frameCount);
                nekoPosX -= (diffX / distance) * nekoSpeed;
                nekoPosY -= (diffY / distance) * nekoSpeed;
                nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
                nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);
                nekoEl.style.left = `${nekoPosX - 16}px`;
                nekoEl.style.top = `${nekoPosY - 16}px`;
            }
            create();
            function getRandomSprite() {
                let unusedKeys = keys.filter((key) => !usedKeys.has(key));
                if (unusedKeys.length === 0) {
                    usedKeys.clear();
                    unusedKeys = keys;
                }
                const index = Math.floor(Math.random() * unusedKeys.length);
                const key = unusedKeys[index];
                usedKeys.add(key);
                return [getSprite(key, 0), getSprite(key, 1)];
            }
            function setVariant(arr) {
                variant = arr[0];
                localStorage.setItem("oneko:variant", `"${variant}"`);
                nekoEl.style.backgroundImage = `url('images/maia_oneko.gif')`;
            }
            function pickerModal() {
                const container = document.createElement("div");
                container.className = "oneko-variant-container";
                const style = document.createElement("style");
                style.innerHTML = `
                    .oneko-variant-container {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: center;
                        align-items: center;
                    }
                    .oneko-variant-button {
                        width: 64px;
                        height: 64px;
                        margin: 8px;
                        cursor: pointer;
                        background-size: 800%;
                        border-radius: 25%;
                        transition: background-color 0.2s ease-in-out;
                        background-position: var(--idle-x) var(--idle-y);
                        image-rendering: pixelated;
                    }
                    .oneko-variant-button:hover, .oneko-variant-button-selected {
                        background-color: var(--spice-main-elevated);
                    }
                    .oneko-variant-button:hover {
                        background-position: var(--active-x) var(--active-y);
                    }
                `;
                container.appendChild(style);
                const [idle, active] = getRandomSprite();
                function variantButton(variantEnum) {
                    const div = document.createElement("div");
                    div.className = "oneko-variant-button";
                    div.id = variantEnum[0];
                    div.style.backgroundImage = `url('https://raw.githubusercontent.com/kyrie25/spicetify-oneko/main/assets/oneko/oneko-${variantEnum[0]}.gif')`;
                    div.style.setProperty("--idle-x", `${idle[0] * 64}px`);
                    div.style.setProperty("--idle-y", `${idle[1] * 64}px`);
                    div.style.setProperty("--active-x", `${active[0] * 64}px`);
                    div.style.setProperty("--active-y", `${active[1] * 64}px`);
                    div.onclick = () => {
                        setVariant(variantEnum);
                        document.querySelector(".oneko-variant-button-selected")?.classList.remove("oneko-variant-button-selected");
                        div.classList.add("oneko-variant-button-selected");
                    };
                    if (variantEnum[0] === variant) {
                        div.classList.add("oneko-variant-button-selected");
                    }
                    return div;
                }
                for (const variant of variants) {
                    container.appendChild(variantButton(variant));
                }
                return container;
            }
            (async () => {
                while (!Spicetify.Mousetrap) {
                    await new Promise((r) => setTimeout(r, 100));
                }
                Spicetify.Mousetrap.bind("o n e k o", () => {
                    Spicetify.PopupModal.display({
                        title: "Choose your neko",
                        content: pickerModal(),
                    });
                });
            })();
            if (parseLocalStorage("forceSleep", false)) {
                while (!document.querySelector(".main-nowPlayingBar-center .playback-progressbar")) {
                    await new Promise((r) => setTimeout(r, 100));
                }
                sleep();
            }
        })();
      
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

        <!-- vCard名片💜 -->
        function downloadVCard() {
            const base64Photo = '';
            const vcard = `
BEGIN:VCARD
VERSION:3.0
N:Elisa;;;
FN:@Elisa
ORG:@Elisa
TITLE:
TEL;TYPE=cell:+15513223223
EMAIL;TYPE=INTERNET:vwwwww@yahoo.com
URL;TYPE=个人主页:https://mnnnnn.com
URL;TYPE=Instagram:https://www.instagram.com/ol234566
URL;TYPE=点击跳转至支付宝给我的猫买一杯咖啡☕️:https://qr.alipay.com/fkx17581wtzihcanvisaz0e
X-SOCIALPROFILE;TYPE=Telegram:https://t.me/OOl23456
X-SOCIALPROFILE;Click to redirect to Alipay to buy a cup of coffee for my cat:https://qr.alipay.com
PHOTO;ENCODING=b;TYPE=JPEG:${base64Photo}
END:VCARD
`;
            const blob = new Blob([vcard], { type: 'text/vcard' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'qxx.vcf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
  
  <!-- 拷贝微信号跳转 -->

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
