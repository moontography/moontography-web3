export default {
  chars: 'abcdefghijklmnopqrstuvwxyz01234567890',

  random(num: number = Math.floor(Math.random() * 100 + 1)) {
    return new Array(num)
      .fill(0)
      .map((_, i) => this.chars[Math.floor(Math.random() * this.chars.length)])
      .join('')
  },
}
