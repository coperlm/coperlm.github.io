/**
 * Waline 全局访客统计
 * 通过收集所有文章链接并批量查询 Waline API 获取全站浏览量
 */
(function() {
  'use strict';

  const WALINE_SERVER_URL = 'https://walinetest-coperlms-projects.vercel.app';
  const CACHE_KEY = 'waline_global_stats';
  const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000;

  /**
   * 从缓存获取数据
   */
  function getCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < CACHE_DURATION) {
        return data.stats;
      }
      
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 保存到缓存
   */
  function setCache(stats) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        stats: stats,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Waline cache error:', e);
    }
  }

  /**
   * 收集页面上所有文章路径
   */
  function collectArticlePaths() {
    const paths = new Set();
    
    // 方法1: 从文章链接收集
    document.querySelectorAll('a[href*="/posts/"], a[href*="/archives/"]').forEach(link => {
      try {
        const url = new URL(link.href, window.location.origin);
        const path = url.pathname;
        if (path && path !== '/' && !path.includes('#')) {
          paths.add(path);
        }
      } catch (e) {}
    });
    
    // 方法2: 从 waline-pageview-count 元素收集
    document.querySelectorAll('.waline-pageview-count').forEach(el => {
      const path = el.getAttribute('data-path');
      if (path && path !== '/') {
        paths.add(path);
      }
    });
    
    // 添加当前页面
    if (window.location.pathname !== '/') {
      paths.add(window.location.pathname);
    }
    
    return Array.from(paths);
  }

  /**
   * 批量查询 Waline API 获取浏览量
   */
  async function fetchPageviews(paths, retries = 0) {
    try {
      if (!paths || paths.length === 0) {
        console.warn('No paths to query');
        return [];
      }

      const pathsParam = paths.join(',');
      const url = `${WALINE_SERVER_URL}/api/article?path=${encodeURIComponent(pathsParam)}&type=time`;
      
      console.log(`Querying ${paths.length} paths from Waline API...`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Waline API response:', result);
      
      // 解析返回数据
      let data = result.data || result;
      
      if (Array.isArray(data)) {
        return data;
      }
      
      return [];
      
    } catch (error) {
      console.warn(`Waline API error (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
      
      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
        return fetchPageviews(paths, retries + 1);
      }
      
      throw error;
    }
  }

  /**
   * 计算总浏览量
   */
  function calculateTotalPageviews(data) {
    if (!Array.isArray(data)) return 0;
    
    let total = 0;
    data.forEach(item => {
      if (typeof item === 'number') {
        total += item;
      } else if (item && typeof item.time === 'number') {
        total += item.time;
      } else if (item && typeof item === 'object') {
        // 尝试从对象中提取数字
        const values = Object.values(item).filter(v => typeof v === 'number');
        if (values.length > 0) {
          total += Math.max(...values);
        }
      }
    });
    
    return total;
  }

  /**
   * 更新全局浏览量显示
   */
  async function updateGlobalPV() {
    const pvElement = document.getElementById('waline-site-pv');
    if (!pvElement) {
      console.log('Waline site PV element not found');
      return;
    }
    
    try {
      // 先尝试缓存
      const cached = getCache();
      if (cached !== null && cached.pv !== undefined) {
        pvElement.textContent = cached.pv;
        console.log('✅ Loaded from cache:', cached.pv);
        return;
      }
      
      // 显示加载中
      pvElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      
      // 收集所有文章路径
      const paths = collectArticlePaths();
      console.log('Collected paths:', paths);
      
      if (paths.length === 0) {
        pvElement.textContent = '0';
        return;
      }
      
      // 批量查询
      const data = await fetchPageviews(paths);
      const totalPV = calculateTotalPageviews(data);
      
      console.log(`✅ Total pageviews: ${totalPV} (from ${paths.length} paths)`);
      
      // 更新显示
      pvElement.textContent = totalPV;
      
      // 缓存结果
      setCache({ pv: totalPV, uv: null });
      
    } catch (error) {
      console.error('❌ Failed to load Waline global PV:', error);
      pvElement.textContent = '-';
      pvElement.title = '统计加载失败';
    }
  }

  /**
   * 更新全局访客数（使用评论总数）
   */
  async function updateGlobalUV() {
    const uvElement = document.getElementById('waline-site-uv');
    if (!uvElement) {
      console.log('Waline site UV element not found');
      return;
    }
    
    try {
      // 先尝试缓存
      const cached = getCache();
      if (cached !== null && cached.uv !== undefined) {
        uvElement.textContent = cached.uv || '-';
        return;
      }
      
      uvElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      
      // 获取全站评论数作为活跃度指标
      const response = await fetch(`${WALINE_SERVER_URL}/api/comment?type=count&lang=zh-CN`);
      const result = await response.json();
      
      console.log('Waline comment count:', result);
      
      const commentCount = result.data || result || 0;
      uvElement.textContent = commentCount;
      
      // 更新缓存
      const cachedData = getCache() || {};
      setCache({ ...cachedData, uv: commentCount });
      
    } catch (error) {
      console.error('❌ Failed to load comment count:', error);
      uvElement.textContent = '-';
      uvElement.title = 'Waline 暂不支持真实UV统计\n这里显示评论总数作为活跃度';
    }
  }

  /**
   * 初始化
   */
  function init() {
    const hasPV = document.getElementById('waline-site-pv');
    const hasUV = document.getElementById('waline-site-uv');
    
    if (!hasPV && !hasUV) {
      console.log('Waline global count elements not found');
      return;
    }
    
    console.log('🚀 Initializing Waline global count...');
    
    // 延迟执行确保页面完全加载
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
    console.log('✅ Waline cache cleared');
    location.reload();
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
