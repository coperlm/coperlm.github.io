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
      // 22-02 深夜：蓝紫星空（偏亮）
      return g('#667eea 0%', '#764ba2 100%');
    }
    // 02-04 凌晨：深紫夜空（稍暗但不沉）
    return g('#4e54c8 0%', '#8f94fb 100%');
  }

  /**
   * 根据时段选择rightside按钮颜色
   * 返回 { background, color, hover } 对象
   */
  function chooseButtonColorByHour(h) {
    if (h >= 4 && h < 6) {
      // 黎明：深橙红配桃粉背景
      return { background: '#8B4513', color: '#FFF', hover: '#A0522D' };
    }
    if (h >= 6 && h < 8) {
      // 日出：深红配金粉背景
      return { background: '#C72C41', color: '#FFF', hover: '#D63447' };
    }
    if (h >= 8 && h < 10) {
      // 清晨：深绿配薄荷背景
      return { background: '#2D5016', color: '#FFF', hover: '#3D6B1F' };
    }
    if (h >= 10 && h < 12) {
      // 蔚蓝天空：深蓝配浅蓝背景
      return { background: '#1E3A8A', color: '#FFF', hover: '#2563EB' };
    }
    if (h >= 12 && h < 14) {
      // 仲午：深青配青绿背景
      return { background: '#065F46', color: '#FFF', hover: '#047857' };
    }
    if (h >= 14 && h < 16) {
      // 海岛青蓝：深蓝绿配青蓝背景
      return { background: '#0E7490', color: '#FFF', hover: '#0891B2' };
    }
    if (h >= 16 && h < 18) {
      // 午后：深红配暖金背景
      return { background: '#B91C1C', color: '#FFF', hover: '#DC2626' };
    }
    if (h >= 18 && h < 19) {
      // 黄金时刻：深橙配金色背景
      return { background: '#C2410C', color: '#FFF', hover: '#EA580C' };
    }
    if (h >= 19 && h < 20) {
      // 黄昏：深紫配橙粉背景
      return { background: '#5B21B6', color: '#FFF', hover: '#6D28D9' };
    }
    if (h >= 20 && h < 22) {
      // 晚霞：深粉紫配霓虹粉背景
      return { background: '#831843', color: '#FFF', hover: '#9F1239' };
    }
    if (h >= 22 || h < 2) {
      // 深夜：深紫蓝配蓝紫背景
      return { background: '#1E3A8A', color: '#FFF', hover: '#1E40AF' };
    }
    // 凌晨：更深的紫蓝
    return { background: '#1E293B', color: '#FFF', hover: '#334155' };
  }

  /**
   * 更新rightside按钮颜色
   */
  function updateRightsideButtonColors() {
    const now = getCurrentTime();
    const hour = now.getHours();
    const colors = chooseButtonColorByHour(hour);
    
    const rightside = document.getElementById('rightside');
    if (!rightside) return;
    
    // 为所有rightside按钮应用颜色
    const buttons = rightside.querySelectorAll('button, a');
    buttons.forEach(btn => {
      btn.style.backgroundColor = colors.background;
      btn.style.color = colors.color;
      btn.style.transition = 'all 0.3s ease';
      
      // 添加hover效果
      btn.addEventListener('mouseenter', function() {
        this.style.backgroundColor = colors.hover;
      });
      
      btn.addEventListener('mouseleave', function() {
        this.style.backgroundColor = colors.background;
      });
    });
    
    console.log(`[实时时钟] 更新按钮颜色为 ${hour}:00 时段`);
  }

  /**
   * 更新footer文字颜色
   */
  function updateFooterTextColor() {
    const now = getCurrentTime();
    const hour = now.getHours();
    const colors = chooseButtonColorByHour(hour);
    
    const footer = document.getElementById('footer');
    if (!footer) return;
    
    // 更新footer所有文字和链接的颜色
    const footerWrap = footer.querySelector('#footer-wrap');
    if (footerWrap) {
      // 设置统一的文字颜色（与按钮背景色相同，确保对比度）
      footerWrap.style.color = colors.background;
      
      // 更新所有链接颜色
      const links = footerWrap.querySelectorAll('a');
      links.forEach(link => {
        link.style.color = colors.background;
        link.style.transition = 'all 0.3s ease';
        
        // 添加hover效果
        link.addEventListener('mouseenter', function() {
          this.style.color = colors.hover;
        });
        
        link.addEventListener('mouseleave', function() {
          this.style.color = colors.background;
        });
      });
      
      // 更新其他文字元素
      const textElements = footerWrap.querySelectorAll('.footer-separator, .footer-custom-text, .copyright');
      textElements.forEach(el => {
        el.style.color = colors.background;
      });
    }
    
    console.log(`[实时时钟] 更新footer文字颜色为 ${hour}:00 时段`);
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
    
    // 更新footer背景（与body保持一致）
    const footer = document.getElementById('footer');
    if (footer) {
      footer.style.background = gradient;
      footer.style.backgroundAttachment = 'fixed';
    }
    
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

    // 检查是否需要更新背景和按钮颜色（每小时更新一次）
    const currentHour = now.getHours();
    if (currentHour !== updateBackground.lastHour) {
      updateBackground();
      updateRightsideButtonColors();
      updateFooterTextColor();
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

    // 立即更新一次（包括背景和按钮颜色）
    updateClock();
    updateBackground();
    updateRightsideButtonColors();
    updateFooterTextColor();

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
      // 重新应用按钮和footer颜色
      updateRightsideButtonColors();
      updateFooterTextColor();
    });
  }
})();
