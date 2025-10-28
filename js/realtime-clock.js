/**
 * 实时时钟模块
 * 显示在页面右下角的实时时间
 */
(function() {
  'use strict';

  /**
   * 获取当前时间（本地时间）
   */
  function getCurrentTime() {
    return new Date();
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
      // 04-06 黎明：柔和桃粉 - 从浅米到桃色到玫瑰粉
      return g('#FFF5F0 0%', '#FFE4D6 30%', '#FFD6BA 60%', '#FFB4A2 100%');
    }
    if (h >= 6 && h < 8) {
      // 06-08 日出：金粉暖调 - 从金黄到杏色到粉红
      return g('#FFEAA7 0%', '#FFD79A 25%', '#FFA99F 60%', '#FF719A 100%');
    }
    if (h >= 8 && h < 10) {
      // 08-10 清晨：薄荷天光 - 从柠檬黄到薄荷绿到天蓝
      return g('#F8FFAE 0%', '#D4FC79 25%', '#96E6A1 60%', '#A8E6CF 85%', '#C2FFD8 100%');
    }
    if (h >= 10 && h < 12) {
      // 10-12 蔚蓝天空 - 从淡蓝到天蓝到云白
      return g('#E0F7FA 0%', '#A1C4FD 35%', '#B8D5F0 65%', '#C2E9FB 100%');
    }
    if (h >= 12 && h < 14) {
      // 12-14 仲午：清爽青绿 - 从薄荷到青绿到湖蓝
      return g('#A7FFE4 0%', '#84FAB0 30%', '#7FE5D4 65%', '#8FD3F4 100%');
    }
    if (h >= 14 && h < 16) {
      // 14-16 海岛青蓝 - 从翠绿到青绿到碧蓝
      return g('#55E6C1 0%', '#43E97B 30%', '#3FD5BA 65%', '#38F9D7 100%');
    }
    if (h >= 16 && h < 18) {
      // 16-18 午后：琥珀暖金 - 从金黄到琥珀到珊瑚
      return g('#FFEAA7 0%', '#FCE38A 30%', '#FFBE76 65%', '#F38181 100%');
    }
    if (h >= 18 && h < 19) {
      // 18-19 黄金时刻：金→珊瑚 - 从金色到橙色到粉红
      return g('#FDD835 0%', '#FBD786 25%', '#FFA87D 60%', '#F7797D 100%');
    }
    if (h >= 19 && h < 20) {
      // 19-20 黄昏：橙粉→绯紫 - 从橙粉到玫瑰到紫罗兰
      return g('#FFB088 0%', '#FF9A9E 30%', '#D988B9 65%', '#8E54E9 100%');
    }
    if (h >= 20 && h < 22) {
      // 20-22 晚霞：霓虹粉紫 - 从淡粉到玫瑰到深紫
      return g('#FFE5EC 0%', '#FBD3E9 25%', '#E5A3C7 60%', '#BB377D 100%');
    }
    if (h >= 22 || h < 2) {
      // 22-02 深夜：蓝紫星空 - 从蓝紫到深紫到宝石紫
      return g('#7B68EE 0%', '#667eea 30%', '#6B5EA8 65%', '#764ba2 100%');
    }
    // 02-04 凌晨：深紫夜空 - 从深蓝到紫罗兰到淡紫
    return g('#3B4371 0%', '#4e54c8 30%', '#7B7FDC 65%', '#8f94fb 100%');
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
    const rightside = document.getElementById('rightside');
    if (!rightside) {
      return false;
    }
    
    const now = getCurrentTime();
    const hour = now.getHours();
    const colors = chooseButtonColorByHour(hour);
    
    // 为所有rightside按钮应用颜色
    const buttons = rightside.querySelectorAll('button, a');
    if (buttons.length === 0) {
      return false;
    }
    
    buttons.forEach(btn => {
      btn.style.backgroundColor = colors.background;
      btn.style.color = colors.color;
      btn.style.transition = 'all 0.3s ease';
      
      // 使用onmouseenter/onmouseleave避免重复添加监听器
      btn.onmouseenter = function() {
        this.style.backgroundColor = colors.hover;
      };
      
      btn.onmouseleave = function() {
        this.style.backgroundColor = colors.background;
      };
    });
    
    return true;
  }

  /**
   * 更新footer文字颜色
   */
  function updateFooterTextColor() {
    const footer = document.getElementById('footer');
    if (!footer) {
      return false;
    }
    
    const footerWrap = footer.querySelector('#footer-wrap');
    if (!footerWrap) {
      return false;
    }
    
    const now = getCurrentTime();
    const hour = now.getHours();
    const colors = chooseButtonColorByHour(hour);
    
    // 设置统一的文字颜色（与按钮背景色相同，确保对比度）
    footerWrap.style.setProperty('color', colors.background, 'important');
    
    // 更新所有链接和文字元素
    const allElements = footerWrap.querySelectorAll('a, .footer-separator, .footer-custom-text, .copyright, span, div');
    
    allElements.forEach(el => {
      el.style.color = colors.background;
      el.style.transition = 'all 0.3s ease';
      
      // 只为链接添加hover效果
      if (el.tagName === 'A') {
        el.onmouseenter = function() {
          this.style.color = colors.hover;
        };
        
        el.onmouseleave = function() {
          this.style.color = colors.background;
        };
      }
    });
    
    return true;
  }

  /**
   * 更新页面背景
   */
  function updateBackground() {
    const now = getCurrentTime();
    const hour = now.getHours();
    
    // 如果小时没变，不重复更新
    if (hour === updateBackground.lastHour) {
      return;
    }
    
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
    
    // 保存当前小时
    updateBackground.lastHour = hour;
    
    console.log(`[实时时钟] 背景更新为 ${hour}:00 时段 (${getTimeDescription(hour)})`);
  }
  updateBackground.lastHour = -1;

  /**
   * 获取时段描述
   */
  function getTimeDescription(h) {
    if (h >= 4 && h < 6) return '黎明·柔和渐染';
    if (h >= 6 && h < 8) return '日出·温暖朝霞';
    if (h >= 8 && h < 10) return '清晨·清新明亮';
    if (h >= 10 && h < 12) return '上午·晴空万里';
    if (h >= 12 && h < 14) return '中午·清爽正午';
    if (h >= 14 && h < 16) return '下午·海岛风情';
    if (h >= 16 && h < 18) return '傍晚·暖调黄昏';
    if (h >= 18 && h < 19) return '黄昏·黄金时刻';
    if (h >= 19 && h < 20) return '日落·梦幻紫霞';
    if (h >= 20 && h < 22) return '晚霞·霓虹绚烂';
    if (h >= 22 || h < 2) return '深夜·星空璀璨';
    return '凌晨·宁静深邃';
  }

  /**
   * 获取时段主题颜色（用于时钟主题名称显示）
   */
  function getThemeColor(h) {
    if (h >= 4 && h < 6) return '#D4A574';    // 黎明：温暖的桃棕色
    if (h >= 6 && h < 8) return '#FF8FA3';    // 日出：柔和的粉红
    if (h >= 8 && h < 10) return '#7BC96F';   // 清晨：清新的绿色
    if (h >= 10 && h < 12) return '#5A9FD4';  // 上午：明朗的天蓝
    if (h >= 12 && h < 14) return '#4ECDC4';  // 中午：清爽的青绿
    if (h >= 14 && h < 16) return '#26D0CE';  // 下午：明亮的碧蓝
    if (h >= 16 && h < 18) return '#F5A623';  // 傍晚：温暖的琥珀
    if (h >= 18 && h < 19) return '#F39C12';  // 黄昏：金色橙
    if (h >= 19 && h < 20) return '#A569BD';  // 日落：梦幻紫
    if (h >= 20 && h < 22) return '#C25283';  // 晚霞：玫瑰红
    if (h >= 22 || h < 2) return '#6C5CE7';   // 深夜：星空紫
    return '#5B6EAA';                          // 凌晨：深邃蓝紫
  }

  /**
   * 更新时钟显示
   */
  function updateClock() {
    const clockElement = document.getElementById('realtime-clock');
    if (!clockElement) return;

    const now = getCurrentTime();
    const { date, weekday, time } = formatTime(now);
    const currentHour = now.getHours();
    const themeName = getTimeDescription(currentHour);
    const themeColor = getThemeColor(currentHour);

    clockElement.querySelector('.clock-date').textContent = date;
    clockElement.querySelector('.clock-weekday').textContent = weekday;
    clockElement.querySelector('.clock-time').textContent = time;
    
    const themeElement = clockElement.querySelector('.clock-theme');
    themeElement.textContent = themeName;
    themeElement.style.color = themeColor;

    // 检查是否需要更新背景和按钮颜色（每小时更新一次）
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
        <div class="clock-left">
          <div class="clock-icon">
            <i class="fas fa-clock"></i>
          </div>
          <div class="clock-weekday">---</div>
        </div>
        <div class="clock-content">
          <div class="clock-date">----------</div>
          <div class="clock-time">--:--:--</div>
          <div class="clock-theme">---</div>
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
  function initClock() {
    // 创建时钟元素
    createClockElement();

    // 立即更新一次（包括背景和按钮颜色）
    updateClock();
    updateBackground();
    
    // 尝试更新按钮和footer颜色，如果失败则延迟重试
    let retryCount = 0;
    const maxRetries = 5;
    
    const tryUpdateColors = () => {
      const rightsideSuccess = updateRightsideButtonColors();
      const footerSuccess = updateFooterTextColor();
      
      if ((!rightsideSuccess || !footerSuccess) && retryCount < maxRetries) {
        retryCount++;
        console.log(`[实时时钟] 颜色更新重试 ${retryCount}/${maxRetries}`);
        setTimeout(tryUpdateColors, 300); // 300ms后重试
      } else if (rightsideSuccess && footerSuccess) {
        console.log('[实时时钟] 所有颜色更新成功');
      } else if (retryCount >= maxRetries) {
        console.warn('[实时时钟] 达到最大重试次数，部分元素可能未更新');
      }
    };
    
    // 立即尝试
    tryUpdateColors();
    
    // 300ms后再次尝试（确保页面完全加载）
    setTimeout(tryUpdateColors, 300);
    
    // 1秒后最终尝试
    setTimeout(tryUpdateColors, 1000);

    // 监听DOM变化，当footer元素被添加时自动更新颜色
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // 元素节点
              if (node.id === 'footer' || (node.querySelector && node.querySelector('#footer'))) {
                console.log('[实时时钟] 检测到footer元素加载，更新颜色');
                setTimeout(() => {
                  updateFooterTextColor();
                  updateBackground();
                }, 100);
              }
              if (node.id === 'rightside' || (node.querySelector && node.querySelector('#rightside'))) {
                console.log('[实时时钟] 检测到rightside元素加载，更新颜色');
                setTimeout(() => {
                  updateRightsideButtonColors();
                }, 100);
              }
            }
          });
        }
      }
    });

    // 开始监听body的子元素变化
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    // 每秒更新时钟
    setInterval(updateClock, 1000);
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
