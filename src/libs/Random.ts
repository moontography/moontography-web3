export default {
  chars:
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01234567890`~!@#$%^&*()_+-=\'";:,./<>?[]{}|',

  string(length: number = Math.floor(Math.random() * 1e4) + 1) {
    return new Array(length)
      .fill(0)
      .map((_, i) => this.chars[Math.floor(Math.random() * this.chars.length)])
      .join('')
  },
}
