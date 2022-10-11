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
    urls: [
      { text: '' },
      { text: '' }
    ],
    players: []
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
    colSize() {
      if(this.isMobile || this.players.length == 1)
        return 12
      else if(this.players.length <= 4)
        return 6
      else
        return 4
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
    url() {
      let params = []
      if(this.players.length) {
        this.players.forEach((it, i) => {
          params.push(`s${i+1}=${it.service}`)
          params.push(`i${i+1}=${it.id}`)
          if(it.time)
            params.push(`t${i+1}=${it.time}`)
        })
      } else {
        this.urls.map(it => it.text).filter(it => it).forEach((it, i) => {
          let twitch = it.match(/twitch.*?\/(\d{10})/i)
          let youtube = it.match(/youtu.*?[\/=]([\w-]{11})/i)
          if(twitch) {
            params.push(`s${i+1}=t`)
            params.push(`i${i+1}=${twitch[1]}`)
          } else if(youtube) {
            params.push(`s${i+1}=y`)
            params.push(`i${i+1}=${youtube[1]}`)
          }
        })
      }
      return this.baseUrl + '?' + params.join('&')
    },
    elapsedDiff() {
      let ests = this.players.map(it => it.currentTimeEst)
      ests.sort()
      return Math.abs(ests[0] - ests[ests.length-1])
    }
  },
  methods: {
    parseFloat(float) {
      return Math.round(parseFloat(float) * 100) / 100
    },
    urlsChangeHandler() {
      if(this.urls.every(it => it.text) && this.urls.length < 9)
        this.urls.push({text:''})
    },
    urlsClearHandler() {
      if(this.urls.length > 2) {
        let blanks = this.urls.filter(it => !it.text).length
        for(let i=0; i<blanks; i++) {
          let index = this.urls.findIndex(it => !it.text)
          this.urls.splice(index, 1)
        }
      }
    },
    waitLoop(delay, condition, callback) {
      if(condition())
        callback()
      else
        setTimeout(() => {this.waitLoop(delay, condition, callback)}, delay)
    },
    play() {
      this.players.forEach(it => it.play())
    },
    pause() {
      this.players.forEach(it => it.pause())
    },
    reset() {
      this.players.forEach(it => it.seek(it.time))
    },
    resync() {
      /*
      let firstDiff = this.first.currentTimeEst - this.first.time
      let secondDiff = this.second.currentTimeEst - this.second.time
      if(firstDiff < secondDiff)
        this.second.seek(this.second.time + firstDiff)
      else
        this.first.seek(this.first.time + secondDiff)
      */
    },
    step(seconds) {
      this.players.forEach(it => {it.seek(it.getCurrentTime() + seconds)})
    },
    copyShareUrl(){
      this.$refs.share.focus()
      document.execCommand('copy')
    }
  },
  async mounted () {
    let q = await this.$route.query
    console.log('q', q)
    let players = []
    ;[1,2,3,4,5,6,7,8,9].forEach(n => {
      if((`s${n}` in q) && (`i${n}` in q)) {
        players.push({
          service: q[`s${n}`],
          id: q[`i${n}`],
          time: `t${n}` in q ? this.parseFloat(q[`t${n}`]) : 0,
          play: () => {},
          pause: () => {},
          getCurrentTime: () => 0,
          seek: () => {},
          setDelay: () => {},
          currentTimeEst: 0
        })
      }
    })

    this.players = players

    if(players.length) {
      this.state = 'player'
      this.$nextTick(() => {
        players.forEach((it, i) => {
          let elId = `player${i+1}`
          console.log('setting up player', it, it.service, it.id, elId)
          if(it.service == 't') {
            let twitch = new Twitch.Player(elId, {
              video: it.id,
              time: it.time,
              parent: [this.domain, 'localhost'],
              width: '100%',
              height: '100%',
              autoplay: false
            })
            twitch.addEventListener(Twitch.Embed.VIDEO_READY, () => {
              let player = twitch.getPlayer()
              it.play = () => {player.play()}
              it.pause = () => {player.pause()}
              it.getCurrentTime = () => player.getCurrentTime()
              it.seek = (time) => {player.seek(this.parseFloat(time))}
              it.setDelay = () => {it.time = this.parseFloat(it.getCurrentTime())}
            })
          } else if(it.service == 'y') {
            this.waitLoop(1000, () => youtubeReady, () => {
              let player = new YT.Player(elId, {
                videoId: it.id,
                playerVars: {
                  playsinline: 1,
                  start: it.time
                },
                width: this.vidWidth,
                height: this.vidHeight
              })
              it.play = () => {player.playVideo()}
              it.pause = () => {player.pauseVideo()}
              it.getCurrentTime = () => player.getCurrentTime()
              it.seek = (time) => {player.seekTo(this.parseFloat(time), true)}
              it.setDelay = () => {it.time = this.parseFloat(it.getCurrentTime())}
            })
          }
          setInterval(() => {
            try {
              this.players.forEach(it => {
                it.currentTimeEst = it.getCurrentTime()
              })
            } catch (err) {}
          }, 1000)
        })
      })
    } else {
      this.state = 'config'
    }
  },
  watch: {
    vidWidth() {
      this.players
        .filter(it => it.service == 'youtube')
        .forEach(it => {
          //it.player.setSize(this.vidWidth, this.vidHeight)
          let el = document.getElementById(it.el)
          el.style.width = `${this.vidWidth}px`
          el.style.height = `${this.vidHeight}px`
        })
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