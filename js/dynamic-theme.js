/*
  Dynamic Theme Accent & Gradient
  - Computes a time-based HSL palette and updates CSS variables
  - Plays nicely with Butterfly (pjax + darkmode)
*/
(() => {
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max)

  const hslToHex = (h, s, l) => {
    // h [0,360), s/l [0,100]
    h = ((h % 360) + 360) % 360
    s = clamp(s, 0, 100) / 100
    l = clamp(l, 0, 100) / 100

    const a = s * Math.min(l, 1 - l)
    const f = n => {
      const k = (n + h / 30) % 12
      const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * c)
    }
    return `#${[f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, '0')).join('')}`
  }

  // Time-of-day anchor palettes (minutes since 00:00)
  // Smoothly interpolate between anchors to create natural day-night shifts
  const ANCHORS = [
    { t: 0,   start: [260, 70, 24], end: [285, 70, 26] },  // deep night indigo -> violet
    { t: 300, start: [340, 78, 56], end: [25, 88, 56] },   // dawn pink -> orange
    { t: 420, start: [205, 88, 56], end: [165, 82, 56] },  // morning sky -> mint
    { t: 720, start: [195, 92, 54], end: [215, 92, 54] },  // noon cyan -> blue
    { t: 1020,start: [28, 88, 56],  end: [320, 72, 54] },  // sunset orange -> magenta
    { t: 1140,start: [265, 72, 25], end: [285, 70, 26] },  // night
    { t: 1440,start: [260, 70, 24], end: [285, 70, 26] }   // loop back
  ]

  const lerp = (a, b, t) => a + (b - a) * t
  const lerpHSL = (hslA, hslB, t) => {
    // Hue shortest-path interpolation
    let [h1, s1, l1] = hslA
    let [h2, s2, l2] = hslB
    let dh = ((h2 - h1 + 540) % 360) - 180
    const h = (h1 + dh * t + 360) % 360
    const s = lerp(s1, s2, t)
    const l = lerp(l1, l2, t)
    return [h, s, l]
  }

  const findSegment = minutes => {
    for (let i = 0; i < ANCHORS.length - 1; i++) {
      const a = ANCHORS[i], b = ANCHORS[i + 1]
      if (minutes >= a.t && minutes <= b.t) return [a, b]
    }
    return [ANCHORS[0], ANCHORS[1]]
  }

  const adjustLightness = (hsl, deltaL) => [hsl[0], hsl[1], clamp(hsl[2] + deltaL, 0, 100)]
  const adjustHue = (hsl, deltaH) => [hsl[0] + deltaH, hsl[1], hsl[2]]

  /*
    Dynamic site background driven by real-world time
    - Attempts to fetch time from worldtimeapi.org (by IP). If that fails, falls back to local Date().
    - Chooses a pleasing gradient per time-of-day (dawn, morning, day, afternoon, dusk, night).
    - Writes `--global-bg` (used by theme) to a CSS gradient string so the body background follows it.
    - Re-applies after PJAX navigations and when data-theme toggles.
  */
  (function () {
    // Prefer Beijing time (UTC+8 / Asia/Shanghai)
    // Use timeapi.io as primary (more reliable recently), then fall back to worldtimeapi, then local UTC+8.
    const TIME_ENDPOINTS = [
      { url: 'https://timeapi.io/api/Time/current/zone?timeZone=Asia/Shanghai', parse: j => j && j.dateTime },
      { url: 'https://timeapi.io/api/Time/current/ip', parse: j => j && j.dateTime },
      { url: 'https://worldtimeapi.org/api/timezone/Asia/Shanghai', parse: j => j && j.datetime },
      { url: 'https://worldtimeapi.org/api/ip', parse: j => j && j.datetime }
    ]
    const FETCH_TIMEOUT = 3000

    const timeoutFetch = (url, opts = {}, ms = FETCH_TIMEOUT) => {
      return Promise.race([
        fetch(url, opts),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
      ])
    }

    async function getRemoteDate() {
      for (const ep of TIME_ENDPOINTS) {
        try {
          const res = await timeoutFetch(ep.url)
          if (!res.ok) continue
          const json = await res.json()
          const iso = ep.parse(json)
          if (iso) {
            const d = new Date(iso)
            if (!isNaN(d.getTime())) return d
          }
        } catch (e) {
          // try next endpoint
        }
      }
      return null
    }

    function getBeijingDateFromLocal() {
      // Convert local time to UTC, then add 8 hours
      const now = new Date()
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
      return new Date(utcMs + 8 * 3600000)
    }

    function chooseGradientByHour(h) {
      // h is 0..23 (local hour)
      // Return CSS gradient string
      const g = (...colors) => `linear-gradient(180deg, ${colors.join(', ')})`

      if (h >= 4 && h < 6) {
        // 04-06 黎明：柔和桃粉
        return g('#FFF1E6 0%', '#FFD6BA 55%', '#FFB4A2 100%')
      }
      if (h >= 6 && h < 8) {
        // 06-08 日出：金粉暖调
        return g('#FFE29F 0%', '#FFA99F 50%', '#FF719A 100%')
      }
      if (h >= 8 && h < 10) {
        // 08-10 清晨：薄荷天光（明亮）
        return g('#D4FC79 0%', '#96E6A1 60%', '#C2FFD8 100%')
      }
      if (h >= 10 && h < 12) {
        // 10-12 蔚蓝天空（明亮）
        return g('#A1C4FD 0%', '#C2E9FB 100%')
      }
      if (h >= 12 && h < 14) {
        // 12-14 仲午：清爽青绿
        return g('#84FAB0 0%', '#8FD3F4 100%')
      }
      if (h >= 14 && h < 16) {
        // 14-16 海岛青蓝（鲜明）
        return g('#43E97B 0%', '#38F9D7 100%')
      }
      if (h >= 16 && h < 18) {
        // 16-18 午后：琥珀暖金
        return g('#FCE38A 0%', '#F38181 100%')
      }
      if (h >= 18 && h < 19) {
        // 18-19 黄金时刻：金→珊瑚
        return g('#FBD786 0%', '#F7797D 100%')
      }
      if (h >= 19 && h < 20) {
        // 19-20 黄昏：橙粉→绯紫（明亮）
        return g('#FF9A9E 0%', '#8E54E9 100%')
      }
      if (h >= 20 && h < 22) {
        // 20-22 晚霞：霓虹粉紫（仍然明亮）
        return g('#FBD3E9 0%', '#BB377D 100%')
      }
      if (h >= 22 || h < 2) {
        // 22-02 深夜前：蓝紫夜（偏亮）
        return g('#5B86E5 0%', '#36D1DC 100%')
      }
      // 02-04 凌晨：冷紫夜（稍暗但不沉）
      return g('#2b5876 0%', '#4e4376 100%')
    }

    async function resolveDate() {
      const remote = await getRemoteDate().catch(() => null)
      if (remote) return remote
      return getBeijingDateFromLocal()
    }

    async function updateBackground() {
      const dt = await resolveDate()
      const hour = dt.getHours()
      const root = document.documentElement

      // Respect dark mode: if data-theme === 'dark', choose a darker night gradient
      const isDark = root.getAttribute('data-theme') === 'dark'
      const grad = isDark
        ? 'linear-gradient(180deg, #071226 0%, #061324 60%, #031018 100%)'
        : chooseGradientByHour(hour)

      root.style.setProperty('--global-bg', grad)

      // update immediately meta theme-color if present (use a solid computed color)
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) {
        // pick a representative solid color per period
        let solid
        if (isDark) solid = '#071226'
        else if (hour >= 4 && hour < 6) solid = '#FFD6BA'
        else if (hour >= 6 && hour < 8) solid = '#FFE29F'
        else if (hour >= 8 && hour < 10) solid = '#96E6A1'
        else if (hour >= 10 && hour < 12) solid = '#A1C4FD'
        else if (hour >= 12 && hour < 14) solid = '#84FAB0'
        else if (hour >= 14 && hour < 16) solid = '#43E97B'
        else if (hour >= 16 && hour < 18) solid = '#FCE38A'
        else if (hour >= 18 && hour < 19) solid = '#FBD786'
        else if (hour >= 19 && hour < 20) solid = '#FF9A9E'
        else if (hour >= 20 && hour < 22) solid = '#FBD3E9'
        else if (hour >= 22 || hour < 2) solid = '#5B86E5'
        else solid = '#2b5876'
        meta.setAttribute('content', solid)
      }
    }

    function scheduleTick() {
      // refresh at minute boundaries and every 5 minutes afterwards
      updateBackground()
      setTimeout(() => {
        updateBackground()
        setInterval(updateBackground, 5 * 60 * 1000)
      }, (60 - new Date().getSeconds()) * 1000)
    }

    // initial apply on DOM ready
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleTick)
    else scheduleTick()

    // pjax/darkmode hooks
    window.addEventListener('pjax:complete', updateBackground)
    const mo = new MutationObserver(updateBackground)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    // when tab becomes visible again, refresh
    document.addEventListener('visibilitychange', () => { if (!document.hidden) updateBackground() })

  })()
})()
