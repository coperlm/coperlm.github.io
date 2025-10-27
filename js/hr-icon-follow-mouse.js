// HR 图标躲避鼠标效果 - 丝滑闪避
(function() {
  'use strict';

  // 可调整的配置参数
  const CONFIG = {
    detectionRange: 100       // 检测范围（像素），鼠标在图标这个距离内触发闪避
  };

  function initHrIconEscape() {
    // 选择所有 hr 元素(包括 .custom-hr 和普通 hr)
    const hrElements = document.querySelectorAll('.custom-hr, hr');
    
    hrElements.forEach(hr => {
      let currentIconLeft = 50;        // 当前图标位置（百分比）- 初始在中央
      
      // 初始化时设置图标在中央
      hr.style.setProperty('--icon-left', '50%');
      
      // 生成随机位置（完全随机）
      function getRandomPosition() {
        // 生成 5% 到 95% 之间的随机位置
        return Math.random() * 90 + 5;
      }
      
      hr.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const hrWidth = rect.width;
        const mouseX = e.clientX - rect.left;
        
        // 计算图标当前的实际像素位置
        const iconPixelPos = (currentIconLeft / 100) * hrWidth;
        
        // 计算鼠标与图标的距离
        const distance = Math.abs(mouseX - iconPixelPos);
        
        // 当鼠标接近图标时，立即传送到随机位置
        if (distance <= CONFIG.detectionRange) {
          // 立即传送到随机位置
          const newPosition = getRandomPosition();
          currentIconLeft = newPosition;
          this.style.setProperty('--icon-left', `${currentIconLeft}%`);
        }
      });
    });
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHrIconEscape);
  } else {
    initHrIconEscape();
  }

  // 支持 PJAX
  if (typeof window.pjax !== 'undefined') {
    document.addEventListener('pjax:complete', initHrIconEscape);
  }
})();
