// 修复浏览器警告的脚本
(function() {
  'use strict';

  function fixFormIssues() {
    // 1. 修复缺少 id/name 的表单字段
    const formFields = document.querySelectorAll('input:not([id]):not([name]), textarea:not([id]):not([name])');
    formFields.forEach((field, index) => {
      if (!field.id && !field.name) {
        field.id = `auto-field-${Date.now()}-${index}`;
      }
    });

    // 2. 修复缺少 autocomplete 的表单字段
    const fieldsNeedAutocomplete = document.querySelectorAll('input[type="text"], input[type="email"], input[type="search"]');
    fieldsNeedAutocomplete.forEach(field => {
      if (!field.hasAttribute('autocomplete')) {
        // 根据字段类型设置合适的 autocomplete
        if (field.type === 'email') {
          field.setAttribute('autocomplete', 'email');
        } else if (field.type === 'search') {
          field.setAttribute('autocomplete', 'off');
        } else {
          field.setAttribute('autocomplete', 'on');
        }
      }
    });

    // 3. 修复重复的表单 id
    const allIds = {};
    const allFields = document.querySelectorAll('input[id], textarea[id], select[id]');
    allFields.forEach((field, index) => {
      const id = field.id;
      if (allIds[id]) {
        // 发现重复 id，重命名
        field.id = `${id}-${index}`;
        console.warn(`Fixed duplicate form id: ${id} -> ${field.id}`);
      } else {
        allIds[id] = true;
      }
    });
  }

  // 页面加载完成后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixFormIssues);
  } else {
    fixFormIssues();
  }

  // 支持 PJAX
  if (typeof window.pjax !== 'undefined') {
    document.addEventListener('pjax:complete', fixFormIssues);
  }
})();
