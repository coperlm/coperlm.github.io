/**
 * 实时时钟模块
 * 显示在页面右下角的实时时间
 */
(function() {
  'use strict';

  // 配置API列表（按优先级顺序）
  const TIME_APIS = [
    {
      name: 'suning',
      url: 'https://f.m.suning.com/api/ct.do',
      parseTime: (data) => data.currentTime
    },
    {
      name: 'jd',
      url: 'https://a.jd.com/ajax/queryServerData.html',
      parseTime: (data) => data.serverTime
    },
    {
      name: 'taobao',
      url: 'https://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp',
      parseTime: (data) => parseInt(data.data.t)
    }
  ];

  // 时间偏移量（用于同步本地时间和服务器时间）
  let timeOffset = 0;

  /**
   * 从API获取服务器时间
   */
  async function fetchServerTime() {
    for (const api of TIME_APIS) {
      try {
        const response = await fetch(api.url, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache'
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        const serverTime = api.parseTime(data);
        
        if (serverTime && !isNaN(serverTime)) {
          const localTime = Date.now();
          timeOffset = serverTime - localTime;
          console.log(`[实时时钟] 成功从 ${api.name} 同步时间，偏移量: ${timeOffset}ms`);
          return true;
        }
      } catch (error) {
        console.warn(`[实时时钟] ${api.name} API调用失败:`, error);
        continue;
      }
    }
    
    console.warn('[实时时钟] 所有API均失败，使用本地时间');
    return false;
  }

  /**
   * 获取当前时间（服务器时间或本地时间）
   */
  function getCurrentTime() {
    return new Date(Date.now() + timeOffset);
  }

  /**
   * 格式化时间显示
   */
  function formatTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return {
      date: `${year}-${month}-${day}`,
      weekday: weekday,
      time: `${hours}:${minutes}:${seconds}`
    };
  }

  /**
   * 根据小时选择背景渐变色
   */
  function chooseGradientByHour(h) {
    // h is 0..23 (local hour)
    // Return CSS gradient string
    const g = (...colors) => `linear-gradient(180deg, ${colors.join(', ')})`;

    if (h >= 4 && h < 6) {
      // 04-06 黎明：柔和桃粉
      return g('#FFF1E6 0%', '#FFD6BA 55%', '#FFB4A2 100%');
    }
    if (h >= 6 && h < 8) {
      // 06-08 日出：金粉暖调
      return g('#FFE29F 0%', '#FFA99F 50%', '#FF719A 100%');
    }
    if (h >= 8 && h < 10) {
      // 08-10 清晨：薄荷天光（明亮）
      return g('#D4FC79 0%', '#96E6A1 60%', '#C2FFD8 100%');
    }
    if (h >= 10 && h < 12) {
      // 10-12 蔚蓝天空（明亮）
      return g('#A1C4FD 0%', '#C2E9FB 100%');
    }
    if (h >= 12 && h < 14) {
      // 12-14 仲午：清爽青绿
      return g('#84FAB0 0%', '#8FD3F4 100%');
    }
    if (h >= 14 && h < 16) {
      // 14-16 海岛青蓝（鲜明）
      return g('#43E97B 0%', '#38F9D7 100%');
    }
    if (h >= 16 && h < 18) {
      // 16-18 午后：琥珀暖金
      return g('#FCE38A 0%', '#F38181 100%');
    }
    if (h >= 18 && h < 19) {
      // 18-19 黄金时刻：金→珊瑚
      return g('#FBD786 0%', '#F7797D 100%');
    }
    if (h >= 19 && h < 20) {
      // 19-20 黄昏：橙粉→绯紫（明亮）
      return g('#FF9A9E 0%', '#8E54E9 100%');
    }
    if (h >= 20 && h < 22) {
      // 20-22 晚霞：霓虹粉紫（仍然明亮）
      return g('#FBD3E9 0%', '#BB377D 100%');
    }
    if (h >= 22 || h < 2) {
      // 22-02 深夜前：蓝紫夜（偏亮）
      return g('#5B86E5 0%', '#36D1DC 100%');
    }
    // 02-04 凌晨：冷紫夜（稍暗但不沉）
    return g('#2b5876 0%', '#4e4376 100%');
  }

  /**
   * 更新页面背景
   */
  function updateBackground() {
    const now = getCurrentTime();
    const hour = now.getHours();
    const gradient = chooseGradientByHour(hour);
    
    // 更新body背景
    document.body.style.background = gradient;
    document.body.style.backgroundAttachment = 'fixed';
    
    // 保存当前小时，避免重复更新
    updateBackground.lastHour = hour;
    
    console.log(`[实时时钟] 更新背景为 ${hour}:00 时段`);
  }
  updateBackground.lastHour = -1;

  /**
   * 更新时钟显示
   */
  function updateClock() {
    const clockElement = document.getElementById('realtime-clock');
    if (!clockElement) return;

    const now = getCurrentTime();
    const { date, weekday, time } = formatTime(now);

    clockElement.querySelector('.clock-date').textContent = date;
    clockElement.querySelector('.clock-weekday').textContent = weekday;
    clockElement.querySelector('.clock-time').textContent = time;

    // 检查是否需要更新背景（每小时更新一次）
    const currentHour = now.getHours();
    if (currentHour !== updateBackground.lastHour) {
      updateBackground();
    }
  }

  /**
   * 创建时钟元素
   */
  function createClockElement() {
    const clockHTML = `
      <div id="realtime-clock" class="realtime-clock">
        <div class="clock-icon">
          <i class="fas fa-clock"></i>
        </div>
        <div class="clock-content">
          <div class="clock-date">----------</div>
          <div class="clock-weekday">---</div>
          <div class="clock-time">--:--:--</div>
        </div>
      </div>
    `;

    // 在rightside之前插入
    const rightside = document.getElementById('rightside');
    if (rightside) {
      rightside.insertAdjacentHTML('beforebegin', clockHTML);
    } else {
      // 如果rightside不存在，插入到body末尾
      document.body.insertAdjacentHTML('beforeend', clockHTML);
    }
  }

  /**
   * 初始化时钟
   */
  async function initClock() {
    // 创建时钟元素
    createClockElement();

    // 首次显示本地时间
    updateClock();

    // 获取服务器时间并同步
    await fetchServerTime();

    // 立即更新一次（包括背景）
    updateClock();
    updateBackground();

    // 每秒更新
    setInterval(updateClock, 1000);

    // 每30分钟重新同步一次服务器时间
    setInterval(fetchServerTime, 30 * 60 * 1000);
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClock);
  } else {
    initClock();
  }

  // 支持PJAX
  if (typeof window.pjax !== 'undefined') {
    document.addEventListener('pjax:complete', function() {
      // PJAX加载后，如果时钟元素被移除，重新创建
      if (!document.getElementById('realtime-clock')) {
        createClockElement();
        updateClock();
      }
    });
  }
})();
