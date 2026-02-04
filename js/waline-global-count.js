/**
 * Waline 全局访客统计（优化版 v2）
 * 通过累加所有页面的 pageview 实现全局统计
 * 包含：重试机制、缓存、错误处理、多种获取方式
 */
(function() {
  'use strict';

  const WALINE_SERVER_URL = 'https://walinetest-coperlms-projects.vercel.app';
  const CACHE_KEY = 'waline_global_stats';
  const CACHE_DURATION = 3 * 60 * 1000; // 3分钟缓存
  const MAX_RETRIES = 2;
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
   * 方法1: 通过 API 批量获取所有页面的浏览量
   */
  async function fetchGlobalPVFromAPI(retries = 0) {
    try {
      // 获取所有文章的浏览量统计
      // Waline API: /api/article 可以返回所有文章的统计
      const response = await fetch(`${WALINE_SERVER_URL}/api/article`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Waline API response:', data);
      
      // 尝试多种数据格式解析
      let totalPV = 0;
      
      // 格式1: { data: [{url, time}, ...] } - 数组格式
      if (data && Array.isArray(data.data)) {
        totalPV = data.data.reduce((sum, item) => {
          return sum + (item.time || item.pageview || item.count || 0);
        }, 0);
        console.log('Parsed from array format:', totalPV);
      }
      // 格式2: { data: {url: count, ...} } - 对象格式，每个 URL 对应一个浏览量
      else if (data && typeof data.data === 'object' && data.data !== null && !Array.isArray(data.data)) {
        const values = Object.values(data.data);
        totalPV = values.reduce((sum, count) => {
          const num = typeof count === 'object' ? (count.time || count.pageview || count.count || 0) : (parseInt(count) || 0);
          return sum + num;
        }, 0);
        console.log('Parsed from object format:', totalPV, 'from', values.length, 'articles');
      }
      // 格式3: [count1, count2, ...] - 直接是数组
      else if (Array.isArray(data)) {
        totalPV = data.reduce((sum, count) => sum + (parseInt(count) || 0), 0);
      }
      // 格式4: { count: number } 或 { time: number }
      else if (data && (data.count !== undefined || data.time !== undefined)) {
        totalPV = data.count || data.time || 0;
      }
      
      return totalPV;
    } catch (error) {
      console.warn(`Waline API fetch error (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
      
      if (retries < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY * (retries + 1));
        return fetchGlobalPVFromAPI(retries + 1);
      }
      
      throw error;
    }
  }
  
  /**
   * 获取全局 PV 统计
   */
  async function fetchGlobalPV() {
    try {
      const apiPV = await fetchGlobalPVFromAPI();
      if (apiPV > 0) {
        return apiPV;
      }
      // 如果 API 返回 0，可能是真的没有数据，或者需要等待 Waline 初始化
      console.warn('Waline API returned 0 pageviews');
      return 0;
    } catch (error) {
      console.error('Failed to fetch global PV:', error);
      return 0;
    }
  }

  /**
   * 更新全局 PV 显示
   */
  async function updateGlobalPV() {
    const pvElement = document.getElementById('waline-site-pv');
    if (!pvElement) {
      console.log('waline-site-pv element not found');
      return;
    }
    
    try {
      // 先尝试从缓存获取
      const cached = getCache();
      if (cached !== null && cached.pv !== undefined && cached.pv > 0) {
        pvElement.textContent = cached.pv;
        console.log('Waline global PV loaded from cache:', cached.pv);
        
        // 后台更新数据
        fetchGlobalPV().then(totalPV => {
          if (totalPV > 0 && totalPV !== cached.pv) {
            pvElement.textContent = totalPV;
            setCache({ pv: totalPV });
            console.log('Waline global PV updated:', totalPV);
          }
        }).catch(err => console.warn('Background update failed:', err));
        
        return;
      }
      
      // 显示加载中
      pvElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      
      // 从 API 获取
      const totalPV = await fetchGlobalPV();
      
      // 更新显示
      if (totalPV > 0) {
        pvElement.textContent = totalPV;
        setCache({ pv: totalPV });
        console.log('Waline global PV loaded:', totalPV);
      } else {
        pvElement.textContent = '0';
        pvElement.title = '暂无浏览数据或统计加载失败';
        console.warn('Waline global PV is 0');
      }
    } catch (error) {
      console.error('Waline global PV final error:', error);
      pvElement.textContent = '-';
      pvElement.title = '统计加载失败: ' + error.message;
    }
  }

  /**
   * 更新全局 UV 显示
   * 注意：Waline 不直接提供全局 UV，这里使用评论总数作为活跃度指标
   */
  async function updateGlobalUV() {
    const uvElement = document.getElementById('waline-site-uv');
    if (!uvElement) {
      console.log('waline-site-uv element not found');
      return;
    }
    
    try {
      // 先尝试从缓存获取
      const cached = getCache();
      if (cached !== null && cached.uv !== undefined && cached.uv !== '-') {
        uvElement.textContent = cached.uv || '-';
        console.log('Waline global UV loaded from cache:', cached.uv);
        return;
      }
      
      // 显示加载中
      uvElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      
      // 尝试获取评论总数作为活跃度
      try {
        const response = await fetch(`${WALINE_SERVER_URL}/api/comment?type=count`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Waline comment count response:', data);
          
          // 尝试解析评论总数
          let commentCount = 0;
          if (typeof data === 'number') {
            commentCount = data;
          } else if (data && typeof data.data === 'number') {
            commentCount = data.data;
          } else if (data && data.count !== undefined) {
            commentCount = data.count;
          }
          
          if (commentCount > 0) {
            uvElement.textContent = commentCount;
            uvElement.title = '评论总数（作为活跃度参考）';
            setCache({ uv: commentCount });
            console.log('Waline comment count loaded:', commentCount);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch comment count:', err);
      }
      
      // 如果评论数获取失败，显示 "-"
      uvElement.textContent = '-';
      uvElement.title = 'Waline 暂不支持全局独立访客统计';
      setCache({ uv: '-' });
      console.log('Waline global UV: not supported, showing placeholder');
    } catch (error) {
      console.error('Waline global UV error:', error);
      uvElement.textContent = '-';
      uvElement.title = '统计加载失败';
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
    
    console.log('Initializing Waline global count...', { hasPV: !!hasPV, hasUV: !!hasUV });
    
    // 延迟执行，确保 Waline 已初始化
    setTimeout(() => {
      if (hasPV) {
        console.log('Updating global PV...');
        updateGlobalPV();
      }
      if (hasUV) {
        console.log('Updating global UV...');
        updateGlobalUV();
      }
    }, 1000); // 增加延迟到1秒，确保 Waline 完全加载
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
