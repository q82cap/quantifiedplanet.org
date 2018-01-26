const html = require('choo/html')
const nanoraf = require('nanoraf')
const Component = require('nanocomponent')
const { modulate, vh } = require('../base')

module.exports = class Goals extends Component {
  constructor (emitter) {
    super('system')
    emitter.on('inview', inview => {
      if (inview) window.addEventListener('scroll', this)
      else window.removeEventListener('scroll', this)
    })
  }

  handleEvent (event) {
    if (this['on' + event.type]) this['on' + event.type](event)
  }

  onscroll (event) {
    console.log('scroll')
    const scroll = window.scrollY
    const top = this.element.offsetTop
    const translate = modulate(scroll, [top, top + this.vh], [-20, -30], false)
    this.goal11.style.transform = `translateY(${translate.toFixed(2)}%)`
    this.goal15.style.transform = `translateY(${translate.toFixed(2)}%)`
  }

  load () {
    this.onscroll = nanoraf(this.onscroll.bind(this))
    this.goal11 = this.element.querySelector('.js-goal11')
    this.goal13 = this.element.querySelector('.js-goal13')
    this.goal15 = this.element.querySelector('.js-goal15')
    this.vh = vh()
  }

  update () {
    return false
  }

  createElement () {
    return html`
      <div class="Goals">
        <div class="Goals-item Goals-item--11 js-goal11">
          <img class="Goals-icon" src="/goal-11.svg" width="188" height="188" alt="The Goal 11 icon" />
          <h2 class="u-hiddenVisually"></h2>
          <p class="Goal-desc">Make cities and human settlements inclusive, safe, resilient and sustainable.</p>
        </div>
        <div class="Goals-item Goals-item--13 js-goal13">
          <img class="Goals-icon" src="/goal-13.svg" width="188" height="188" alt="The Goal 13 icon" />
          <h2 class="u-hiddenVisually"></h2>
          <p class="Goal-desc">Take urgent action to combat climate change and its impacts.</p>
        </div>
        <div class="Goals-item Goals-item--15 js-goal15">
          <img class="Goals-icon" src="/goal-15.svg" width="188" height="188" alt="The Goal 15 icon" />
          <h2 class="u-hiddenVisually"></h2>
          <p class="Goal-desc">Protect, restore and promote sustainable use of terrestrial ecosystems, sustainably manage forests, combat desertification, and halt and reverse land degradation and halt biodiversity loss.</p>
        </div>
      </div>
    `
  }
}