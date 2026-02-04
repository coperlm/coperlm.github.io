/**
 * Waline 全局访客统计（优化版）
 * 通过 Waline API 获取全局浏览量统计
 * 包含：重试机制、缓存、错误处理
 */
(function() {
  'use strict';

  const WALINE_SERVER_URL = 'https://walinetest-coperlms-projects.vercel.app';
  const CACHE_KEY = 'waline_global_stats';
  const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1秒

  /**
   * 从缓存中获取数据
   */
  function getCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      const now = Date.now();
      
      // 检查缓存是否过期
      if (now - data.timestamp < CACHE_DURATION) {
        return data.stats;
      }
      
      // 清除过期缓存
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (e) {
      console.warn('Waline cache read error:', e);
      return null;
    }
  }

  /**
   * 保存数据到缓存
   */
  function setCache(stats) {
    try {
      const data = {
        stats: stats,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Waline cache write error:', e);
    }
  }

  /**
   * 延迟函数
   */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取全局 PV 统计（带重试）
   */
  async function fetchGlobalPV(retries = 0) {
    try {
      const response = await fetch(`${WALINE_SERVER_URL}/api/article?type=count&url=/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // 尝试多种数据格式解析
      let totalPV = 0;
      
      // 格式1: { data: [{pageview: number}, ...] }
      if (data && Array.isArray(data.data)) {
        totalPV = data.data.reduce((sum, item) => sum + (item.pageview || 0), 0);
      }
      // 格式2: { data: {url: count, ...} }
      else if (data && typeof data.data === 'object' && data.data !== null) {
        totalPV = Object.values(data.data).reduce((sum, count) => {
          const num = typeof count === 'number' ? count : parseInt(count) || 0;
          return sum + num;
        }, 0);
      }
      // 格式3: 直接是数字
      else if (typeof data === 'number') {
        totalPV = data;
      }
      // 格式4: { count: number } 或 { pageview: number }
      else if (data && (data.count !== undefined || data.pageview !== undefined)) {
        totalPV = data.count || data.pageview || 0;
      }
      
      return totalPV;
    } catch (error) {
      console.warn(`Waline global PV fetch error (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
      
      // 如果还有重试次数，则重试
      if (retries < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY * (retries + 1)); // 指数退避
        return fetchGlobalPV(retries + 1);
      }
      
      throw error;
    }
  }

  /**
   * 更新全局 PV 显示
   */
  async function updateGlobalPV() {
    const pvElement = document.getElementById('waline-site-pv');
    if (!pvElement) return;
    
    try {
      // 先尝试从缓存获取
      const cached = getCache();
      if (cached !== null && cached.pv !== undefined) {
        pvElement.textContent = cached.pv;
        console.log('Waline global PV loaded from cache:', cached.pv);
        return;
      }
      
      // 显示加载中
      pvElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      
      // 从 API 获取
      const totalPV = await fetchGlobalPV();
      
      // 更新显示
      pvElement.textContent = totalPV;
      
      // 保存到缓存
      setCache({ pv: totalPV, uv: null });
      
      console.log('Waline global PV loaded:', totalPV);
    } catch (error) {
      console.error('Waline global PV final error:', error);
      pvElement.textContent = '-';
      pvElement.title = '统计加载失败，请检查网络或稍后重试';
    }
  }

  /**
   * 更新全局 UV 显示
   * 注意：Waline 不直接提供全局 UV，这里使用评论总数作为活跃度指标
   */
  async function updateGlobalUV() {
    const uvElement = document.getElementById('waline-site-uv');
    if (!uvElement) return;
    
    try {
      // 先尝试从缓存获取
      const cached = getCache();
      if (cached !== null && cached.uv !== undefined) {
        uvElement.textContent = cached.uv || '-';
        console.log('Waline global UV loaded from cache:', cached.uv);
        return;
      }
      
      // 显示加载中
      uvElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      
      // Waline 没有全局 UV API，这里使用评论总数或显示 "-"
      // 你可以根据需要调整这个逻辑
      uvElement.textContent = '-';
      uvElement.title = 'Waline 暂不支持全局独立访客统计';
      
      console.log('Waline global UV: not supported');
    } catch (error) {
      console.error('Waline global UV error:', error);
      uvElement.textContent = '-';
    }
  }

  /**
   * 初始化函数
   */
  function init() {
    // 检查是否有统计元素
    const hasPV = document.getElementById('waline-site-pv');
    const hasUV = document.getElementById('waline-site-uv');
    
    if (!hasPV && !hasUV) {
      console.log('Waline global count elements not found, skipping...');
      return;
    }
    
    console.log('Initializing Waline global count...');
    
    // 延迟执行，确保页面完全加载
    setTimeout(() => {
      if (hasPV) updateGlobalPV();
      if (hasUV) updateGlobalUV();
    }, 500);
  }

  /**
   * 清理缓存（调试用）
   */
  window.clearWalineCache = function() {
    localStorage.removeItem(CACHE_KEY);
    console.log('Waline cache cleared');
  };

  // 页面加载完成后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 支持 PJAX
  if (typeof window.pjax !== 'undefined') {
    document.addEventListener('pjax:complete', init);
  }
})();
