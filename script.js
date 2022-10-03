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
    domain: 'vod-sync.3and3.dev',
    state: 'loading', // loading | config | player
    first: {
      el: 'first-player',
      placeholder: "https://www.twitch.tv/videos/1461721066?t=0h0m1s",
      url: undefined,
      service: undefined,
      id: undefined,
      time: 0,
      error: false,
      misc: undefined,
      player: undefined,
      play: () => {},
      pause: () => {},
      getCurrentTime: () => 0,
      seek: () => {},
      setDelay: () => {},
      currentTimeEst: 0
    },
    second: {
      el: 'second-player',
      placeholder: "https://youtube.com/watch?v=nMZfKXk8geo&t=27",
      url: undefined,
      service: undefined,
      id: undefined,
      time: 0,
      error: false,
      misc: undefined,
      player: undefined,
      play: () => {},
      pause: () => {},
      getCurrentTime: () => 0,
      seek: () => {},
      setDelay: () => {},
      currentTimeEst: 0
    },
  }),
  computed: {
    baseUrl () {
      return `https://${this.domain}`
    },
    breadcrumbs () {
      if(this.state == 'player')
        return [
          { text: '3and3.dev', href: "https://3and3.dev" },
          { text: 'vod sync',  href: "https://vod-sync.3and3.dev" },
          { text: 'player',    disabled: true }
        ]
      else
        return [
          { text: '3and3.dev', href: "https://3and3.dev" },
          { text: 'vod sync',  disabled: true, }
        ]
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
    both() {
      return [this.first, this.second]
    },
    valid() {
      return this.first.service &&
        this.first.id &&
        this.second.service &&
        this.second.id
    },
    url() {
      if(this.valid)
        return this.baseUrl + '?' + [
          [this.first.service && this.first.service.charAt(0), 's1'],
          [this.first.id, 'i1'],
          [this.first.time, 't1'],
          [this.second.service && this.second.service.charAt(0), 's2'],
          [this.second.id, 'i2'],
          [this.second.time, 't2']
        ].filter(([val, key]) => val)
          .map(([val, key]) => `${key}=${val}`)
          .join('&')
      else
        return this.baseUrl
    },
    elapsedDiff() {
      return Math.abs(this.first.currentTimeEst - this.second.currentTimeEst)
    }
  },
  methods: {
    parseFloat(float) {
      return Math.round(parseFloat(float) * 100) / 100
    },
    processUrl(it) {
      it.error = false
      it.service = undefined
      it.id = undefined
      it.time = 0
      if(!it.url)
        it.url = it.placeholder
      let twitchMatch = it.url.match(/twitch\.tv.*?(\d+)/)
      let youtubeMatch = it.url.match(/youtu.*?be.*?(\w{11})/)
      if(twitchMatch) {
        it.service = 'twitch'
        it.id = twitchMatch[1]
        let tMatch = it.url.match(/\?t=(\d+)h(\d+)m(\d+)s/)
        if(tMatch)
          it.time = parseInt(tMatch[1]) * 3600 + parseInt(tMatch[2]) * 60 + parseInt(tMatch[3])
      } else if(youtubeMatch) {
        it.service = 'youtube'
        it.id = youtubeMatch[1]
        let tMatch = it.url.match(/t=(\d+)/)
        if(tMatch)
          it.time = parseInt(tMatch[1])
      } else {
        console.log('error')
        it.error = true
      }
    },
    waitLoop(delay, condition, callback) {
      if(condition())
        callback()
      else
        setTimeout(() => {this.waitLoop(delay, condition, callback)}, delay)
    },
    play() {
      this.both.forEach(it => it.play())
    },
    pause() {
      this.both.forEach(it => it.pause())
    },
    reset() {
      this.both.forEach(it => it.seek(it.time))
    },
    resync() {
      let firstDiff = this.first.currentTimeEst - this.first.time
      let secondDiff = this.second.currentTimeEst - this.second.time
      if(firstDiff < secondDiff)
        this.second.seek(this.second.time + firstDiff)
      else
        this.first.seek(this.first.time + secondDiff)
    },
    step(seconds) {
      console.log('stepping', seconds)
      this.both.forEach(it => {it.seek(it.getCurrentTime() + seconds)})
    },
    copyShareUrl(){
      this.$refs.share.focus()
      document.execCommand('copy')
    }
  },
  mounted () {
    let q = this.$route.query
    let valid = ['s1', 's1', 'i1', 'i2'].every(it => it in q)

    if(valid) {
      let services = { t: 'twitch', y: 'youtube' }
      this.both.forEach((it, index) => {
        it.service = services[q[`s${index+1}`]]
        it.id = q[`i${index+1}`]
        it.time = q[`t${index+1}`] || 0
      })
      this.state = 'player'
      this.$nextTick(() => {
        this.both.forEach(it => {
          if(it.service == 'twitch') {
            it.misc = new Twitch.Player(it.el, {
              video: it.id,
              time: it.time,
              parent: [this.domain, 'localhost'],
              width: '100%',
              height: '100%',
              autoplay: false
            })
            it.misc.addEventListener(Twitch.Embed.VIDEO_READY, () => {
              it.player = it.misc.getPlayer()
              it.play = () => {it.player.play()}
              it.pause = () => {it.player.pause()}
              it.getCurrentTime = () => it.player.getCurrentTime()
              it.seek = (time) => {it.player.seek(this.parseFloat(time))}
              it.setDelay = () => {it.time = this.parseFloat(it.getCurrentTime())}
              setInterval(() => {it.currentTimeEst = it.getCurrentTime()}, 100)
            })
          } else if(it.service == 'youtube') {
            this.waitLoop(1000, () => youtubeReady, () => {
              it.player = new YT.Player(it.el, {
                videoId: it.id,
                playerVars: {
                  playsinline: 1,
                  start: it.time
                },
                width: this.vidWidth,
                height: this.vidHeight
              })
              it.play = () => {it.player.playVideo()}
              it.pause = () => {it.player.pauseVideo()}
              it.getCurrentTime = () => it.player.getCurrentTime()
              it.seek = (time) => {it.player.seekTo(this.parseFloat(time), true)}
              it.setDelay = () => {it.time = this.parseFloat(it.getCurrentTime())}
              setInterval(() => {
                try {
                  it.currentTimeEst = it.getCurrentTime()
                } catch (err) {
                  //nothing
                }
              }, 100)
            })
          }
        })
      })
    } else {
      this.state = 'config'
    }
  },
  watch: {
    vidWidth() {
      this.both
        .filter(it => it.service == 'youtube')
        .forEach(it => {
          //it.player.setSize(this.vidWidth, this.vidHeight)
          let el = document.getElementById(it.el)
          el.style.width = `${this.vidWidth}px`
          el.style.height = `${this.vidHeight}px`
        })
    },
    $route() {
      let q = this.$route.query
      if('t1' in q)
        this.first.time = q.t1
      if('t2' in q)
        this.second.time = q.t2
    }
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