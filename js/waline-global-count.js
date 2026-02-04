/**
 * Waline 全局访客统计（完整修正版）
 * 根据 Waline 官方 API 文档正确实现：
 * - 全站评论数：GET /api/comment?type=count (无url参数返回全站评论数)
 * - 全站浏览量：GET /api/article?path=path1,path2&type=time 批量查询后求和
 * 包含：重试机制、缓存、错误处理
 */
(function() {
  'use strict';

  const WALINE_SERVER_URL = 'https://walinetest-coperlms-projects.vercel.app';
  const CACHE_KEY = 'waline_global_stats';
  const CACHE_DURATION = 10 * 60 * 1000; // 10分钟缓存
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
   * 获取全站评论数（带重试）
   * API: GET /api/comment?type=count (不传url参数则返回全站评论数)
   * 根据 Waline 源码文档：packages/server/src/logic/comment.js#L81-L101
   */
  async function fetchGlobalCommentCount(retries = 0) {
    try {
      // 关键：不传 url 参数，返回全站评论数
      const response = await fetch(`${WALINE_SERVER_URL}/api/comment?type=count`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Waline comment count API response:', data);
      
      // 解析响应
      let totalComments = 0;
      
      if (typeof data === 'number') {
        totalComments = data;
      } else if (data && typeof data.data === 'number') {
        totalComments = data.data;
      } else if (Array.isArray(data)) {
        // 返回数组的情况，取第一个
        totalComments = data[0] || 0;
      }
      
      return totalComments;
    } catch (error) {
      console.warn(`Waline comment count fetch error (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
      
      if (retries < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY * (retries + 1));
        return fetchGlobalCommentCount(retries + 1);
      }
      
      throw error;
    }
  }

  /**
   * 获取所有文章路径的浏览量总和（带重试）
   * API: GET /api/article?path=/path1,/path2&type=time
   * 根据 Waline 源码：packages/server/src/controller/article.js
   */
  async function fetchAllArticlePageviews(allPaths, retries = 0) {
    try {
      if (!allPaths || allPaths.length === 0) {
        console.warn('No paths provided for pageview statistics');
        return 0;
      }
      
      console.log(`Querying pageviews for ${allPaths.length} paths...`);
      
      // 批量查询所有路径的浏览量
      const pathsParam = encodeURIComponent(allPaths.join(','));
      const response = await fetch(
        `${WALINE_SERVER_URL}/api/article?path=${pathsParam}&type=time`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Waline pageview API response:', data);
      
      // 解析响应并求和
      let totalPV = 0;
      
      if (data && Array.isArray(data.data)) {
        // 格式: { data: [{time: number}, {time: number}, ...] }
        totalPV = data.data.reduce((sum, item) => {
          return sum + (item.time || 0);
        }, 0);
      } else if (Array.isArray(data)) {
        // 格式: [{time: number}, {time: number}, ...]
        totalPV = data.reduce((sum, item) => {
          return sum + (item.time || 0);
        }, 0);
      }
      
      console.log(`Total pageviews from ${allPaths.length} paths: ${totalPV}`);
      return totalPV;
      
    } catch (error) {
      console.warn(`Waline pageview fetch error (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
      
      if (retries < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY * (retries + 1));
        return fetchAllArticlePageviews(allPaths, retries + 1);
      }
      
      throw error;
    }
  }

  /**
   * 从页面收集所有文章路径
   * 策略：查找所有带 data-path 的 waline-pageview-count 元素
   */
  function collectAllArticlePaths() {
    const paths = new Set();
    
    // 从页面中所有 waline-pageview-count 元素收集路径
    const pageviewElements = document.querySelectorAll('.waline-pageview-count[data-path]');
    pageviewElements.forEach(el => {
      const path = el.getAttribute('data-path');
      if (path) {
        paths.add(path);
      }
    });
    
    // 添加当前页面路径
    paths.add(window.location.pathname);
    
    // 添加根路径
    paths.add('/');
    
    const pathArray = Array.from(paths);
    console.log(`Collected ${pathArray.length} unique paths:`, pathArray);
    
    return pathArray;
  }

  /**
   * 更新全局浏览量（PV）显示
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
      
      // 收集所有文章路径
      const allPaths = collectAllArticlePaths();
      
      // 从 API 获取所有文章的浏览量总和
      const totalPV = await fetchAllArticlePageviews(allPaths);
      
      // 更新显示
      pvElement.textContent = totalPV;
      
      // 保存到缓存
      const currentCache = getCache() || {};
      setCache({ ...currentCache, pv: totalPV });
      
      console.log('✅ Waline global PV loaded:', totalPV);
    } catch (error) {
      console.error('❌ Waline global PV final error:', error);
      pvElement.textContent = '-';
      pvElement.title = '浏览量统计加载失败，请检查网络';
    }
  }

  /**
   * 更新全局访客数/活跃度显示
   * 使用全站评论总数作为网站活跃度指标
   */
  async function updateGlobalUV() {
    const uvElement = document.getElementById('waline-site-uv');
    if (!uvElement) return;
    
    try {
      // 先尝试从缓存获取
      const cached = getCache();
      if (cached !== null && cached.uv !== undefined) {
        uvElement.textContent = cached.uv;
        console.log('Waline comment count loaded from cache:', cached.uv);
        return;
      }
      
      // 显示加载中
      uvElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      
      // 从 API 获取全站评论数
      const totalComments = await fetchGlobalCommentCount();
      
      // 更新显示
      uvElement.textContent = totalComments;
      
      // 保存到缓存
      const currentCache = getCache() || {};
      setCache({ ...currentCache, uv: totalComments });
      
      console.log('✅ Waline comment count loaded:', totalComments);
    } catch (error) {
      console.error('❌ Waline comment count final error:', error);
      uvElement.textContent = '-';
      uvElement.title = '评论数统计加载失败';
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
    
    console.log('🚀 Initializing Waline global count...', { hasPV: !!hasPV, hasUV: !!hasUV });
    
    // 延迟执行，确保页面完全加载
    setTimeout(() => {
      if (hasPV) updateGlobalPV();
      if (hasUV) updateGlobalUV();
    }, 1000); // 增加延迟，确保 Waline 单页统计元素已加载
  }

  /**
   * 清理缓存（调试用）
   */
  window.clearWalineCache = function() {
    localStorage.removeItem(CACHE_KEY);
    console.log('🗑️ Waline cache cleared');
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
