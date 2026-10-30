const { createApp, ref, computed, watch, onMounted, onUnmounted } = Vue;

createApp({
  setup() {
    const tracks = ref([
      { id: 1, title: 'Fin de journée', artist: 'Sonora Studio', genre: 'Électro douce', durationLabel: '3:57', seconds: 237, audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', art: 'art-sunset', glyph: '☼', coverLabel: 'GOLDEN HOUR', liked: true },
      { id: 2, title: 'Nuages lents', artist: 'Aube', genre: 'Indie', durationLabel: '4:12', seconds: 252, audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', art: 'art-lilac', glyph: '◒', coverLabel: 'SOFT FOCUS', liked: false },
      { id: 3, title: 'Minuit bleu', artist: 'Ligne Claire', genre: 'Chill', durationLabel: '3:38', seconds: 218, audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', art: 'art-ocean', glyph: '〰', coverLabel: 'BLUE HOUR', liked: true },
      { id: 4, title: 'Après la pluie', artist: 'Sonora Sessions', genre: 'Dream pop', durationLabel: '3:46', seconds: 226, audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', art: 'art-rose', glyph: '✳', coverLabel: 'AFTER HOURS', liked: false },
      { id: 5, title: 'Bloom', artist: 'Les Ateliers', genre: 'Acoustique', durationLabel: '3:31', seconds: 211, audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', art: 'art-green', glyph: '❋', coverLabel: 'IN BLOOM', liked: false },
      { id: 6, title: 'Lueur', artist: 'Studio du Soleil', genre: 'Soul', durationLabel: '4:05', seconds: 245, audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', art: 'art-gold', glyph: '◉', coverLabel: 'SUN ROOM', liked: false },
      { id: 7, title: 'Dernier métro', artist: 'Nuit Blanche', genre: 'Synthwave', durationLabel: '4:28', seconds: 268, audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', art: 'art-night', glyph: '✧', coverLabel: 'NIGHT DRIVE', liked: true },
      { id: 8, title: 'Première lumière', artist: 'Les Heures', genre: 'Piano', durationLabel: '3:52', seconds: 232, audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', art: 'art-sky', glyph: '⌁', coverLabel: 'FIRST LIGHT', liked: false },
    ]);

    const view = ref('home');
    const query = ref('');
    const mood = ref('calme');
    const isPlaying = ref(false);
    const shuffle = ref(false);
    const repeat = ref(false);
    const currentTrack = ref(tracks.value[0]);
    const currentTime = ref(0);
    const duration = ref(0);
    const progress = ref(0);
    const volume = ref(70);
    const audioEl = ref(null);
    const toast = ref('');
    const playlists = ref([
      { name: 'Matins tranquilles', color: 'plum' },
      { name: 'Sur la route', color: 'blue' },
      { name: 'Focus doux', color: 'mint' },
    ]);
    let toastTimer;

    const featuredTrack = tracks.value[0];
    const currentDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toLocaleUpperCase('fr-FR');
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
    const quickPicks = computed(() => tracks.value.slice(0, 4));
    const visibleTracks = computed(() => {
      let list = tracks.value;
      if (view.value === 'favorites') list = list.filter((track) => track.liked);
      if (view.value === 'library') list = list.filter((track) => track.liked || track.id < 5);
      if (view.value === 'playlist') list = list.filter((track) => track.id < 5);
      if (query.value.trim()) {
        const term = query.value.trim().toLocaleLowerCase('fr');
        list = list.filter((track) => `${track.title} ${track.artist} ${track.genre}`.toLocaleLowerCase('fr').includes(term));
      }
      if (mood.value === 'énergie' && view.value === 'home' && !query.value) return [...list].reverse();
      return list;
    });
    const sectionTitle = computed(() => {
      if (query.value) return `Résultats pour « ${query.value} »`;
      if (view.value === 'favorites') return 'Vos titres favoris';
      if (view.value === 'library') return 'Votre collection';
      if (view.value === 'playlist') return selectedPlaylist.value;
      if (view.value === 'explore') return 'Tout le catalogue';
      return 'À écouter pour vous';
    });
    const sectionEyebrow = computed(() => query.value ? 'RECHERCHE' : view.value === 'favorites' ? 'VOTRE SÉLECTION' : view.value === 'explore' ? 'DÉCOUVERTES' : view.value === 'library' ? 'VOTRE MUSIQUE' : 'REPRENDRE L’ÉCOUTE');
    const selectedPlaylist = ref('Matins tranquilles');

    function selectView(nextView) {
      view.value = nextView;
      query.value = '';
    }
    function selectPlaylist(name) {
      selectedPlaylist.value = name;
      view.value = 'playlist';
      query.value = '';
    }
    function playTrack(track) {
      if (!track) return;
      const sameTrack = currentTrack.value.id === track.id;
      currentTrack.value = track;
      if (sameTrack && audioEl.value) {
        togglePlay();
      } else {
        currentTime.value = 0;
        progress.value = 0;
        isPlaying.value = true;
      }
    }
    function togglePlay() {
      if (!audioEl.value) return;
      if (audioEl.value.paused) audioEl.value.play().catch(() => { isPlaying.value = false; showToast('La piste de démonstration ne peut pas être chargée.'); });
      else audioEl.value.pause();
    }
    function nextTrack() {
      const index = tracks.value.findIndex((track) => track.id === currentTrack.value.id);
      const nextIndex = shuffle.value ? Math.floor(Math.random() * tracks.value.length) : (index + 1) % tracks.value.length;
      playTrack(tracks.value[nextIndex]);
    }
    function previousTrack() {
      if (audioEl.value && audioEl.value.currentTime > 3) { audioEl.value.currentTime = 0; return; }
      const index = tracks.value.findIndex((track) => track.id === currentTrack.value.id);
      playTrack(tracks.value[(index - 1 + tracks.value.length) % tracks.value.length]);
    }
    function toggleLike(track) {
      const item = tracks.value.find((candidate) => candidate.id === track.id);
      if (item) item.liked = !item.liked;
      if (item && currentTrack.value.id === item.id) currentTrack.value = item;
      showToast(item?.liked ? 'Ajouté à vos favoris' : 'Retiré de vos favoris');
    }
    function createPlaylist() {
      const name = `Ma playlist ${playlists.value.length + 1}`;
      playlists.value.push({ name, color: ['plum', 'blue', 'mint'][playlists.value.length % 3] });
      selectPlaylist(name);
      showToast('Playlist créée');
    }
    function syncTime() {
      if (!audioEl.value) return;
      currentTime.value = audioEl.value.currentTime || 0;
      duration.value = audioEl.value.duration || 0;
      progress.value = duration.value ? (currentTime.value / duration.value) * 100 : 0;
    }
    function syncDuration() {
      duration.value = audioEl.value?.duration || 0;
    }
    function seek() {
      if (audioEl.value && duration.value) audioEl.value.currentTime = (progress.value / 100) * duration.value;
    }
    function changeVolume() {
      if (audioEl.value) audioEl.value.volume = volume.value / 100;
    }
    function handleEnded() {
      if (repeat.value && audioEl.value) { audioEl.value.currentTime = 0; audioEl.value.play(); }
      else nextTrack();
    }
    function formatTime(seconds) {
      if (!Number.isFinite(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
      return `${mins}:${secs}`;
    }
    function showToast(message) {
      toast.value = message;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.value = ''; }, 2200);
    }
    function onKeydown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.querySelector('.search-box input')?.focus();
      } else if (event.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        togglePlay();
      }
    }

    watch(currentTrack, async () => {
      currentTime.value = 0;
      progress.value = 0;
      await Vue.nextTick();
      if (audioEl.value) {
        audioEl.value.volume = volume.value / 100;
        if (isPlaying.value) audioEl.value.play().catch(() => { isPlaying.value = false; showToast('La piste de démonstration ne peut pas être chargée.'); });
      }
    });
    watch(query, (value) => { if (value) view.value = 'explore'; });
    onMounted(() => { window.addEventListener('keydown', onKeydown); if (audioEl.value) audioEl.value.volume = volume.value / 100; });
    onUnmounted(() => { window.removeEventListener('keydown', onKeydown); clearTimeout(toastTimer); });

    return { tracks, view, query, mood, isPlaying, shuffle, repeat, currentTrack, currentTime, duration, progress, volume, audioEl, toast, playlists, featuredTrack, currentDate, greeting, quickPicks, visibleTracks, sectionTitle, sectionEyebrow, selectView, selectPlaylist, playTrack, togglePlay, nextTrack, previousTrack, toggleLike, createPlaylist, syncTime, syncDuration, seek, changeVolume, handleEnded, formatTime, showToast };
  },
}).mount('#app');
