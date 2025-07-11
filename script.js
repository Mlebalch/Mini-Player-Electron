
// Attendre que le DOM soit chargé et que l'API Electron soit disponible
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier que l'API Electron est disponible
    if (!window.electronAPI) {
        console.error('Electron API not available');
        return;
    }

    // Récupération des éléments du DOM
        const minimizeBtn = document.getElementById('minimizeBtn');
        const closeBtn = document.getElementById('closeBtn');
        const addBtn = document.getElementById('addBtn');
        const shuffleBtn = document.getElementById('shuffleBtn');
        const repeatBtn = document.getElementById('repeatBtn');
        const playBtn = document.getElementById('playBtn');
        const playIcon = document.getElementById('playIcon');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const playlistBtn = document.getElementById('playlistBtn');
        const closePlaylist = document.getElementById('closePlaylist');
        const playlistSection = document.getElementById('playlistSection');
        const progressBar = document.getElementById('progressBar');
        const progress = document.getElementById('progress');
        const currentTimeEl = document.getElementById('currentTime');
        const durationEl = document.getElementById('duration');
        const trackTitle = document.getElementById('trackTitle');
        const trackArtist = document.getElementById('trackArtist');
        const albumArt = document.getElementById('albumArt');
        const albumCover = document.getElementById('albumCover');
        const playlist = document.getElementById('playlist');
        const emptyPlaylist = document.getElementById('emptyPlaylist');
        const dragOverlay = document.getElementById('dragOverlay');
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        const volumeControl = document.getElementById('volumeControl');

        // Variables d'état
        let audio = new Audio();
        let isPlaying = false;
        let currentTrackIndex = -1;
        let playlistData = [];
        let isShuffle = false;
        let isRepeat = false;
        let isPlaylistOpen = false;
        let originalPlaylistOrder = [];

        // Charger la playlist au démarrage
        window.electronAPI.loadPlaylist().then(result => {
            if (result.success) {
                playlistData = result.data.playlist || [];
                originalPlaylistOrder = [...playlistData];
                updatePlaylistDisplay();
                if (playlistData.length > 0) {
                    loadTrack(0);
                }
            }
        });

        // Contrôles de fenêtre
        minimizeBtn.addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });

        closeBtn.addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });

        // Ouvrir le dialogue d'ajout de fichiers
        addBtn.addEventListener('click', async () => {
            const result = await window.electronAPI.openFileDialog();
            if (!result.canceled) {
                await addFilesToPlaylist(result.filePaths);
            }
        });

        // Bouton de lecture aléatoire
        shuffleBtn.addEventListener('click', () => {
            isShuffle = !isShuffle;
            shuffleBtn.classList.toggle('active', isShuffle);
            if (isShuffle) {
                shufflePlaylist();
            } else {
                playlistData = [...originalPlaylistOrder];
                updatePlaylistDisplay();
            }
        });

        // Bouton de répétition
        repeatBtn.addEventListener('click', () => {
            isRepeat = !isRepeat;
            repeatBtn.classList.toggle('active', isRepeat);
        });

        // Bouton de lecture
        playBtn.addEventListener('click', () => {
            if (playlistData.length === 0) return;
            if (isPlaying) {
                pauseTrack();
            } else {
                playTrack();
            }
        });

        // Bouton précédent
        prevBtn.addEventListener('click', () => {
            if (playlistData.length === 0) return;
            prevTrack();
        });

        // Bouton suivant
        nextBtn.addEventListener('click', () => {
            if (playlistData.length === 0) return;
            nextTrack();
        });

        // Bouton playlist
        playlistBtn.addEventListener('click', () => {
            isPlaylistOpen = !isPlaylistOpen;
            playlistSection.classList.toggle('open', isPlaylistOpen);
        });

        // Fermer la playlist
        closePlaylist.addEventListener('click', () => {
            isPlaylistOpen = false;
            playlistSection.classList.remove('open');
        });

        // Barre de progression
        progressBar.addEventListener('click', (e) => {
            if (playlistData.length === 0) return;
            const percent = e.offsetX / progressBar.offsetWidth;
            audio.currentTime = percent * audio.duration;
            progress.style.width = `${percent * 100}%`;
        });

        // Gestion du volume
        volumeControl.addEventListener('click', () => {
            if (audio.volume > 0) {
                audio.volume = 0;
                volumeControl.innerHTML = '<i class="fas fa-volume-mute"></i>';
            } else {
                audio.volume = 1;
                volumeControl.innerHTML = '<i class="fas fa-volume-up"></i>';
            }
        });

        // Événements audio
        audio.addEventListener('timeupdate', () => {
            if (!audio.duration) return;
            const currentTime = audio.currentTime;
            const duration = audio.duration;
            const percent = (currentTime / duration) * 100;
            progress.style.width = `${percent}%`;
            
            currentTimeEl.textContent = formatTime(currentTime);
        });

        audio.addEventListener('loadedmetadata', () => {
            durationEl.textContent = formatTime(audio.duration);
        });

        audio.addEventListener('ended', () => {
            if (isRepeat) {
                audio.currentTime = 0;
                playTrack();
            } else {
                nextTrack();
            }
        });

        audio.addEventListener('error', (e) => {
            console.error('Erreur audio:', e);
            showNotification('Erreur de lecture', 'error');
        });

        // Fonctions
        async function addFilesToPlaylist(filePaths) {
            let addedCount = 0;
            let errorCount = 0;
            
            albumArt.classList.add('loading');
            
            for (const filePath of filePaths) {
                try {
                    const result = await window.electronAPI.readAudioMetadata(filePath);
                    if (result.success) {
                        playlistData.push(result.metadata);
                        addedCount++;
                    } else {
                        console.error(`Erreur pour ${filePath}: ${result.error}`);
                        errorCount++;
                    }
                } catch (error) {
                    console.error(`Erreur pour ${filePath}:`, error);
                    errorCount++;
                }
            }
            
            originalPlaylistOrder = [...playlistData];
            updatePlaylistDisplay();
            window.electronAPI.savePlaylist(playlistData);
            
            if (playlistData.length === addedCount && addedCount > 0 && currentTrackIndex === -1) {
                loadTrack(0);
            }
            
            if (addedCount > 0) {
                showNotification(`${addedCount} musique(s) ajoutée(s)`, 'success');
            }
            if (errorCount > 0) {
                showNotification(`${errorCount} fichier(s) n'a(ont) pas pu être ajouté(s)`, 'error');
            }
            
            albumArt.classList.remove('loading');
        }

        function updatePlaylistDisplay() {
            playlist.innerHTML = '';
            
            if (playlistData.length === 0) {
                emptyPlaylist.style.display = 'block';
                playlist.appendChild(emptyPlaylist);
                return;
            }
            
            emptyPlaylist.style.display = 'none';
            
            playlistData.forEach((track, index) => {
                const trackElement = document.createElement('div');
                trackElement.className = 'track';
                if (index === currentTrackIndex) {
                    trackElement.classList.add('active');
                }
                trackElement.innerHTML = `
                    <div class="album-art-small">
                        <i class="fas fa-music"></i>
                    </div>
                    <div class="track-details">
                        <h4>${track.title}</h4>
                        <p>${track.artist}</p>
                    </div>
                    <div class="track-duration">${formatTime(track.duration || 0)}</div>
                    <div class="track-actions">
                        <div class="track-action-btn remove-btn" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </div>
                    </div>
                `;
                trackElement.addEventListener('click', () => {
                    loadTrack(index);
                    playTrack();
                });
                
                const removeBtn = trackElement.querySelector('.remove-btn');
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeTrack(index);
                });
                
                playlist.appendChild(trackElement);
            });
        }

        function removeTrack(index) {
            if (index === currentTrackIndex) {
                pauseTrack();
                resetPlayer();
                currentTrackIndex = -1;
            } else if (index < currentTrackIndex) {
                currentTrackIndex--;
            }
            
            playlistData.splice(index, 1);
            originalPlaylistOrder.splice(index, 1);
            updatePlaylistDisplay();
            window.electronAPI.savePlaylist(playlistData);
            showNotification('Piste supprimée', 'success');
        }

        function shufflePlaylist() {
            const shuffled = [...playlistData];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            playlistData = shuffled;
            updatePlaylistDisplay();
        }

        function loadTrack(index) {
            if (index < 0 || index >= playlistData.length) return;
            
            const track = playlistData[index];
            currentTrackIndex = index;
            
            trackTitle.textContent = track.title;
            trackArtist.textContent = track.artist;
            albumCover.style.display = 'none';
            albumArt.querySelector('.default-icon').style.display = 'flex';
            
            audio.src = track.path;
            audio.load();
            updatePlaylistDisplay();
        }

        function playTrack() {
            if (currentTrackIndex === -1 && playlistData.length > 0) {
                loadTrack(0);
            }
            
            audio.play()
                .then(() => {
                    isPlaying = true;
                    playIcon.className = 'fas fa-pause';
                    document.getElementById('miniPlayer').classList.add('playing');
                })
                .catch(error => {
                    console.error('Erreur de lecture:', error);
                    showNotification('Erreur de lecture', 'error');
                });
        }

        function pauseTrack() {
            audio.pause();
            isPlaying = false;
            playIcon.className = 'fas fa-play';
            document.getElementById('miniPlayer').classList.remove('playing');
        }

        function nextTrack() {
            if (playlistData.length === 0) return;
            
            let nextIndex = currentTrackIndex + 1;
            if (nextIndex >= playlistData.length) {
                nextIndex = 0;
            }
            loadTrack(nextIndex);
            playTrack();
        }

        function prevTrack() {
            if (playlistData.length === 0) return;
            
            let prevIndex = currentTrackIndex - 1;
            if (prevIndex < 0) {
                prevIndex = playlistData.length - 1;
            }
            loadTrack(prevIndex);
            playTrack();
        }

        function resetPlayer() {
            audio.src = '';
            trackTitle.textContent = 'Aucune musique';
            trackArtist.textContent = 'Sélectionnez une musique';
            currentTimeEl.textContent = '00:00';
            durationEl.textContent = '00:00';
            progress.style.width = '0%';
        }

        function formatTime(seconds) {
            const min = Math.floor(seconds / 60);
            const sec = Math.floor(seconds % 60);
            return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        }

        function showNotification(message, type = '') {
            notificationText.textContent = message;
            notification.className = 'notification';
            
            if (type) {
                notification.classList.add(type);
            }
            
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.className = 'notification';
                }, 300);
            }, 3000);
        }

        // Gestion du drag and drop
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            dragOverlay.classList.add('active');
        });

        document.addEventListener('dragleave', (e) => {
            if (e.relatedTarget === null) {
                dragOverlay.classList.remove('active');
            }
        });

        document.addEventListener('drop', async (e) => {
            e.preventDefault();
            dragOverlay.classList.remove('active');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const filePaths = Array.from(files).map(file => file.path);
                await addFilesToPlaylist(filePaths);
            }
        });

        // Initialisation
        volumeControl.innerHTML = '<i class="fas fa-volume-up"></i>';
    
}); // Fin du DOMContentLoaded
