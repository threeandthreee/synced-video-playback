// get youtube api
let youtubeReady = false
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
function onYouTubeIframeAPIReady() {
  youtubeReady = true
}
const App = {
  template: '#app-template',
  data: () => ({
    first: {
      service: undefined,
      id: undefined,
      time: 0,
      twitch: null,
      youtube: null
    },
    second: {
      service: undefined,
      id: undefined,
      time: 0,
      twitch: null,
      youtube: null
    },
    breadcrumbs: [
      {
        text: '3and3.dev',
        disabled: false,
        href: "https://3and3.dev"
      },
      {
        text: 'vod sync',
        disabled: true,
        href: "https://vod-sync.3and3.dev"
      }
    ]
  }),
  computed: {
    isPlaying () {
      let firstPlaying = false
      let secondPlaying = false
      try{
        if(this.first.service == 'twitch')
          firstPlaying = !this.first.twitch.isPaused()
        if(this.first.service == 'youtube')
          firstPlaying = this.first.youtube.getPlayerState() == 1
        if(this.second.service == 'twitch')
          secondPlaying = !this.second.twitch.isPaused()
        if(this.second.service == 'youtube')
          secondPlaying = this.second.youtube.getPlayerState() == 1
      } catch(err) {
      }
      return firstPlaying || secondPlaying
    },
    both() {
      return [this.first, this.second]
    },
    isMobile() {
      return this.$vuetify.breakpoint.smAndDown
    },
    vidWidth() {
      if(this.isMobile) {
        const PADDING = (8+1) * 4 + 12 * 2
        return this.$vuetify.breakpoint.width - PADDING
      } else {
        const PADDING = (8+1) * 4 + 12 * 2
        const MAX_WIDTH = 480 * 2 + PADDING
        let width = (this.$vuetify.breakpoint.width - PADDING) / 2
        return width > MAX_WIDTH ? MAX_WIDTH : width
      }
    },
    vidHeight() {
      const RATIO = 9 / 16
      return this.vidWidth * RATIO
    },
    shareUrl() {
      let first = `service1=${this.first.service}&id1=${this.first.id}&time1=${this.first.time}`
      let second = `service2=${this.second.service}&id2=${this.second.id}&time2=${this.second.time}`
      return `https://vod-sync.3and3.dev${this.$route.path}?${first}&${second}`
    }
  },
  watch: {
    vidWidth() {
      this.both.forEach(it => {
        it.youtube.setSize(this.vidWidth, this.vidHeight)
      })
    },
    $route() {
      this.readQuery()
      this.updateService('first')
      this.updateService('second')
    }
  },
  methods: {
    play() {
      this.both.forEach(it => {
        if(it.service == 'twitch')
          it.twitch.play()
        if(it.service == 'youtube')
          it.youtube.playVideo()
      })
    },
    pause() {
      this.both.forEach(it => {
        it.twitch.pause()
        it.youtube.pauseVideo()
      })
    },
    playPause () {
      if(this.isPlaying)
        this.pause()
      else
        this.play()
    },
    reset(n) {
      // todo reset for just n
      this.both.forEach(it => {
        if(it.service == 'twitch')
          it.twitch.seek(parseFloat(it.time))
        if(it.service == 'youtube')
          it.youtube.seekTo(parseFloat(it.time, true))
      })
    },
    step(seconds) {
      this.both.forEach(it => {
        if(it.service == 'twitch')
          it.twitch.seek(parseFloat(it.twitch.getCurrentTime()) + seconds)
        if(it.service == 'youtube')
          it.youtube.seekTo(parseFloat(it.youtube.getCurrentTime()) + seconds, true)
      })
    },
    setDelay(n){
      if(this[n].service == 'twitch')
        this[n].time = this[n].twitch.getCurrentTime()
      if(this[n].service == 'youtube')
        this[n].time = this[n].youtube.getCurrentTime()
    },
    updateId(n){
      if(this[n].service == 'twitch')
        this[n].twitch.setVideo(this[n].id, parseFloat(this[n].time))
      if(this[n].service == 'youtube'){
        this[n].youtube.loadVideoById(this[n].id, parseFloat(this[n].time))
        this[n].youtube.pauseVideo()
      }
    },
    updateService(n){
      this.pause()
      this.updateId(n)
      this.reset(n)
    },
    copyShareUrl(){
      this.$refs.share.focus()
      document.execCommand('copy')
    },
    readQuery(){
      console.log('readquery', this.$route.query, this.second)
      let query = this.$route.query
      if('service1' in query)
        this.first.service = query.service1
      if('service2' in query)
        this.second.service = query.service2
      if('id1' in query)
        this.first.id = query.id1
      if('id2' in query)
        this.second.id = query.id2
      if('time1' in query)
        this.first.time = parseFloat(query.time1)
      if('time2' in query)
        this.second.time = parseFloat(query.time2)
      console.log(this.second)
    },
    init(){
      this.readQuery()
      if(this.first.id == undefined){
        this.first.service = 'twitch',
        this.first.id = '1461721066',
        this.first.time = .715
      }
      if(this.second.id == undefined){
        this.second.service = 'youtube',
        this.second.id = 'nMZfKXk8geo',
        this.second.time = 25.75
      }
      let firstTwitch = new Twitch.Player("first-twitch", {
        video: this.first.id,
        time: this.first.time,
        parent: ['vod-sync.3and3.dev', 'vod-sync.onrender.com'],
        width: '100%',
        height: '100%',
        autoplay: false,
      })
      this.first.twitch = firstTwitch.getPlayer()
      let secondTwitch = new Twitch.Player("second-twitch", {
        video: this.second.id,
        time: this.second.time,
        parent: ['vod-sync.3and3.dev', 'vod-sync.onrender.com'],
        width: '100%',
        height: '100%',
        autoplay: false,
      })
      this.second.twitch = secondTwitch.getPlayer()
      this.first.youtube = new YT.Player('first-youtube', {
        videoId: this.first.id,
        playerVars: {
          playsinline: 1,
          start: this.first.time
        },
        width: this.vidWidth,
        height: this.vidHeight
      })
      this.second.youtube = new YT.Player('second-youtube', {
        videoId: this.second.id,
        playerVars: {
          playsinline: 1,
          start: this.second.time
        },
        width: this.vidWidth,
        height: this.vidHeight
      })
    },
    initIfReady() {
      if(youtubeReady == false)
        setTimeout(this.initIfReady, 1000)
      else
        this.init()
    }
  },
  mounted () {
    this.initIfReady()
  }
}

const router = new VueRouter({
  mode: 'history'
})

new Vue({
  render: h => h(App),
  vuetify: new Vuetify(),
  router
}).$mount('#app')
