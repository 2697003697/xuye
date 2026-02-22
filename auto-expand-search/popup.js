// 弹出窗口脚本
document.addEventListener('DOMContentLoaded', function() {
    // 获取元素
    const enableToggle = document.getElementById('enableToggle');
    const maxPagesSlider = document.getElementById('maxPagesSlider');
    const maxPagesValue = document.getElementById('maxPagesValue');

    // 加载保存的设置
    chrome.storage.sync.get(['enabled', 'maxPages'], function(result) {
        // 默认启用
        const enabled = result.enabled !== false;
        if (enabled) {
            enableToggle.classList.add('active');
        } else {
            enableToggle.classList.remove('active');
        }

        // 默认最大页数
        const maxPages = result.maxPages || 5;
        maxPagesSlider.value = maxPages;
        maxPagesValue.textContent = maxPages;
    });

    // 切换启用状态
    enableToggle.addEventListener('click', function() {
        const isActive = enableToggle.classList.contains('active');
        const newState = !isActive;
        
        if (newState) {
            enableToggle.classList.add('active');
        } else {
            enableToggle.classList.remove('active');
        }

        chrome.storage.sync.set({ enabled: newState }, function() {
            console.log('自动展开已' + (newState ? '启用' : '禁用'));
        });
    });

    // 滑动条变化
    maxPagesSlider.addEventListener('input', function() {
        const value = parseInt(this.value);
        maxPagesValue.textContent = value;
    });

    maxPagesSlider.addEventListener('change', function() {
        const value = parseInt(this.value);
        chrome.storage.sync.set({ maxPages: value }, function() {
            console.log('最大页数已设置为: ' + value);
        });
    });
});
