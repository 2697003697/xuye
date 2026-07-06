(function() {
    'use strict';

    const defaultConfig = {
        maxPages: 5,
        loadingDelay: 500,
        scrollThreshold: 300,
        enabled: true
    };

    const config = { ...defaultConfig };

    const state = {
        currentPage: 1,
        isLoading: false,
        hasMorePages: true,
        loadedUrls: new Set(),
        totalResults: 0,
        initialized: false,
        scrollListener: null
    };

    const adapters = {
        google: {
            name: 'Google',
            match: () => window.location.hostname.includes('google'),
            
            getSearchParams() {
                const urlParams = new URLSearchParams(window.location.search);
                return {
                    q: urlParams.get('q'),
                    start: parseInt(urlParams.get('start')) || 0
                };
            },
            
            getNextPageUrl(pageNum) {
                const start = (pageNum - 1) * 10;
                const url = new URL(window.location.href);
                url.searchParams.set('start', start.toString());
                return url.toString();
            },
            
            getResultsContainer() {
                const selectors = [
                    '#search',
                    '#rso',
                    '#center_col',
                    'div[role="main"]'
                ];
                for (const selector of selectors) {
                    const container = document.querySelector(selector);
                    if (container) return container;
                }
                return null;
            },
            
            countInitialResults() {
                const selectors = [
                    'div[data-ved] div.g',
                    'div.g',
                    '.g',
                    'div[role="listitem"]'
                ];
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        let count = 0;
                        elements.forEach(el => {
                            if (el.textContent.trim().length > 50) count++;
                        });
                        return count;
                    }
                }
                return 0;
            },
            
            extractResults(html) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const results = [];
                
                const selectors = [
                    'div[data-ved] div.g',
                    'div.g',
                    'div[data-header-feature]',
                    '.g',
                    'div[role="listitem"]'
                ];
                
                for (const selector of selectors) {
                    const elements = doc.querySelectorAll(selector);
                    if (elements.length > 0) {
                        elements.forEach(el => {
                            if (el.textContent.trim().length > 50) {
                                results.push(el.cloneNode(true));
                            }
                        });
                        if (results.length > 0) break;
                    }
                }
                
                return results;
            },
            
            createSeparator(pageNum) {
                const separator = document.createElement('div');
                separator.className = 'auto-expand-separator';
                separator.innerHTML = `
                    <div class="separator-line"></div>
                    <span class="separator-text">第 ${pageNum} 页</span>
                    <div class="separator-line"></div>
                `;
                return separator;
            },
            
            removePagination() {
                const paginations = document.querySelectorAll(
                    '#botstuff, #foot, #xjs, .AaVjTc, td[role="heading"]'
                );
                paginations.forEach(el => {
                    if (el) el.style.display = 'none';
                });
            },
            
            showPagination() {
                const paginations = document.querySelectorAll(
                    '#botstuff, #foot, #xjs, .AaVjTc, td[role="heading"]'
                );
                paginations.forEach(el => {
                    if (el) el.style.display = '';
                });
            }
        },

        baidu: {
            name: 'Baidu',
            match: () => window.location.hostname.includes('baidu'),
            
            getSearchParams() {
                const urlParams = new URLSearchParams(window.location.search);
                return {
                    wd: urlParams.get('wd') || urlParams.get('word'),
                    pn: parseInt(urlParams.get('pn')) || 0
                };
            },
            
            getNextPageUrl(pageNum) {
                const pn = (pageNum - 1) * 10;
                const url = new URL(window.location.href);
                url.searchParams.set('pn', pn.toString());
                return url.toString();
            },
            
            getResultsContainer() {
                return document.querySelector('#content_left');
            },
            
            countInitialResults() {
                const results = document.querySelectorAll('#content_left > .result, #content_left > .c-container');
                return results.length;
            },
            
            extractResults(html) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const results = [];
                
                const container = doc.querySelector('#content_left');
                if (!container) return results;
                
                const children = container.querySelectorAll(':scope > .result, :scope > .c-container, :scope > div[tpl]');
                children.forEach(child => {
                    results.push(child.cloneNode(true));
                });
                
                return results;
            },
            
            createSeparator(pageNum) {
                const separator = document.createElement('div');
                separator.className = 'auto-expand-separator baidu-separator';
                separator.innerHTML = `
                    <div class="separator-line"></div>
                    <span class="separator-text">第 ${pageNum} 页</span>
                    <div class="separator-line"></div>
                `;
                return separator;
            },
            
            removePagination() {
                const page = document.querySelector('#page');
                if (page) page.style.display = 'none';
            },
            
            showPagination() {
                const page = document.querySelector('#page');
                if (page) page.style.display = '';
            }
        },

        bing: {
            name: 'Bing',
            match: () => window.location.hostname.includes('bing.com') || window.location.hostname.includes('cn.bing.com'),
            
            getSearchParams() {
                const urlParams = new URLSearchParams(window.location.search);
                return {
                    q: urlParams.get('q'),
                    first: parseInt(urlParams.get('first')) || 1
                };
            },
            
            getNextPageUrl(pageNum) {
                const first = (pageNum - 1) * 10 + 1;
                const url = new URL(window.location.href);
                url.searchParams.set('first', first.toString());
                return url.toString();
            },
            
            getResultsContainer() {
                return document.querySelector('#b_results') || document.querySelector('#b_content');
            },
            
            countInitialResults() {
                return document.querySelectorAll('#b_results > li.b_algo').length;
            },
            
            extractResults(html) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const results = [];
                
                const resultsContainer = doc.querySelector('#b_results');
                if (!resultsContainer) return results;
                
                const algoItems = resultsContainer.querySelectorAll(':scope > li.b_algo');
                algoItems.forEach(item => {
                    const clonedItem = item.cloneNode(true);
                    
                    clonedItem.querySelectorAll('img').forEach(img => {
                        const dataSrc = img.getAttribute('data-src');
                        const dataSrcSet = img.getAttribute('data-srcset');
                        const dataLoading = img.getAttribute('data-loading');
                        const dataLazySrc = img.getAttribute('data-lazy-src');
                        const dataOriginal = img.getAttribute('data-original');
                        const dataOriginalSrc = img.getAttribute('data-original-src');
                        const srcset = img.getAttribute('srcset');

                        const srcNeedsFix = !img.src || img.src === '' || img.src.startsWith('data:');

                        if (dataSrc && srcNeedsFix) {
                            img.src = dataSrc;
                            img.removeAttribute('data-src');
                        }

                        if (dataLazySrc && srcNeedsFix) {
                            img.src = dataLazySrc;
                            img.removeAttribute('data-lazy-src');
                        }

                        if (dataOriginal && srcNeedsFix) {
                            img.src = dataOriginal;
                            img.removeAttribute('data-original');
                        }

                        if (dataOriginalSrc && srcNeedsFix) {
                            img.src = dataOriginalSrc;
                            img.removeAttribute('data-original-src');
                        }

                        if (dataSrcSet && !img.srcset) {
                            img.srcset = dataSrcSet;
                            img.removeAttribute('data-srcset');
                        }

                        if (srcset && srcNeedsFix) {
                            const firstSrcsetUrl = srcset.trim().split(',')[0].trim().split(/\s+/)[0];
                            if (firstSrcsetUrl) {
                                img.src = firstSrcsetUrl;
                            }
                        }

                        if (dataLoading) {
                            img.removeAttribute('data-loading');
                        }

                        if (img.src && img.src.startsWith('//')) {
                            img.src = 'https:' + img.src;
                        } else if (img.src && img.src.startsWith('/')) {
                            img.src = 'https://www.bing.com' + img.src;
                        }
                    });

                    // 将 Bing 懒加载占位 div 替换为真实的 <img> 元素
                    // fetch 到的原始 HTML 中，.rms_iac 是带 data-src 的空 div，
                    // Bing 的客户端 JS 在第 1 页会将其替换为 <img>，但后续页面不会自动执行
                    clonedItem.querySelectorAll('.rms_iac[data-src]').forEach(rmsDiv => {
                        const img = document.createElement('img');
                        img.src = rmsDiv.getAttribute('data-src');

                        const dataHeight = rmsDiv.getAttribute('data-height');
                        const dataWidth = rmsDiv.getAttribute('data-width');
                        const dataAlt = rmsDiv.getAttribute('data-alt');
                        const dataClass = rmsDiv.getAttribute('data-class');

                        if (dataHeight) img.height = dataHeight;
                        if (dataWidth) img.width = dataWidth;
                        if (dataAlt) img.alt = dataAlt;
                        if (dataClass) img.className = dataClass;

                        rmsDiv.parentNode.replaceChild(img, rmsDiv);
                    });

                    clonedItem.querySelectorAll('.cico, .rms_iac, .b_icon').forEach(container => {
                        const style = container.getAttribute('style') || '';
                        const bgMatch = style.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/i);
                        if (bgMatch) {
                            let iconUrl = bgMatch[1];
                            if (iconUrl.startsWith('//')) {
                                iconUrl = 'https:' + iconUrl;
                            } else if (iconUrl.startsWith('/')) {
                                iconUrl = 'https://www.bing.com' + iconUrl;
                            }

                            const existingImg = container.querySelector('img');
                            if (existingImg) {
                                if (!existingImg.src || existingImg.src === '' || existingImg.src.startsWith('data:')) {
                                    existingImg.src = iconUrl;
                                }
                            } else {
                                const img = document.createElement('img');
                                img.src = iconUrl;
                                img.style.width = '16px';
                                img.style.height = '16px';
                                img.className = 'rms_img';
                                container.appendChild(img);
                            }
                        } else {
                            const existingImg = container.querySelector('img');
                            if (existingImg && (!existingImg.src || existingImg.src === '' || existingImg.src.startsWith('data:'))) {
                                const dataSrc = existingImg.getAttribute('data-src');
                                const dataLazySrc = existingImg.getAttribute('data-lazy-src');
                                const dataOriginal = existingImg.getAttribute('data-original');
                                const dataOriginalSrc = existingImg.getAttribute('data-original-src');
                                const srcset = existingImg.getAttribute('srcset');

                                if (dataSrc) {
                                    existingImg.src = dataSrc;
                                    existingImg.removeAttribute('data-src');
                                } else if (dataLazySrc) {
                                    existingImg.src = dataLazySrc;
                                    existingImg.removeAttribute('data-lazy-src');
                                } else if (dataOriginal) {
                                    existingImg.src = dataOriginal;
                                    existingImg.removeAttribute('data-original');
                                } else if (dataOriginalSrc) {
                                    existingImg.src = dataOriginalSrc;
                                    existingImg.removeAttribute('data-original-src');
                                } else if (srcset) {
                                    const firstUrl = srcset.trim().split(',')[0].trim().split(/\s+/)[0];
                                    if (firstUrl) {
                                        existingImg.src = firstUrl;
                                    }
                                }
                            }
                        }
                    });
                    
                    clonedItem.querySelectorAll('[style*="background-image"]').forEach(el => {
                        const style = el.getAttribute('style') || '';
                        const bgMatch = style.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/i);
                        if (bgMatch && (bgMatch[1].includes('favicon') || bgMatch[1].includes('icon'))) {
                            let iconUrl = bgMatch[1];
                            if (iconUrl.startsWith('//')) {
                                iconUrl = 'https:' + iconUrl;
                            } else if (iconUrl.startsWith('/')) {
                                iconUrl = 'https://www.bing.com' + iconUrl;
                            }
                            el.style.backgroundImage = `url('${iconUrl}')`;
                        }
                    });
                    
                    results.push(clonedItem);
                });
                
                return results;
            },
            
            createSeparator(pageNum) {
                const separator = document.createElement('div');
                separator.className = 'auto-expand-separator bing-separator';
                separator.innerHTML = `
                    <div class="separator-line"></div>
                    <span class="separator-text">第 ${pageNum} 页</span>
                    <div class="separator-line"></div>
                `;
                return separator;
            },
            
            removePagination() {
                const pagination = document.querySelector('.b_pag');
                if (pagination) pagination.style.display = 'none';
            },
            
            showPagination() {
                const pagination = document.querySelector('.b_pag');
                if (pagination) pagination.style.display = '';
            }
        }
    };

    function getCurrentAdapter() {
        for (const key in adapters) {
            if (adapters[key].match()) {
                return adapters[key];
            }
        }
        return null;
    }

    function createLoadingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'auto-expand-loading';
        indicator.innerHTML = `
            <div class="loading-spinner"></div>
            <span>正在加载第 ${state.currentPage + 1} 页...</span>
        `;
        return indicator;
    }

    async function loadNextPage() {
        if (!config.enabled || state.isLoading || !state.hasMorePages || state.currentPage >= config.maxPages) {
            return;
        }

        const adapter = getCurrentAdapter();
        if (!adapter) return;

        state.isLoading = true;
        const nextPage = state.currentPage + 1;
        const nextUrl = adapter.getNextPageUrl(nextPage);

        if (state.loadedUrls.has(nextUrl)) {
            state.isLoading = false;
            return;
        }

        const container = adapter.getResultsContainer();
        if (!container) {
            state.isLoading = false;
            return;
        }

        const loadingIndicator = createLoadingIndicator();
        container.appendChild(loadingIndicator);

        try {
            const response = await fetch(nextUrl, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            const results = adapter.extractResults(html);

            loadingIndicator.remove();

            if (results.length === 0) {
                state.hasMorePages = false;
                showMessage('没有更多结果了');
            } else {
                const separator = adapter.createSeparator(nextPage);
                container.appendChild(separator);

                results.forEach((result) => {
                    container.appendChild(result);
                });

                state.currentPage = nextPage;
                state.loadedUrls.add(nextUrl);
                state.totalResults += results.length;

                updateStats();

                if (config.enabled) {
                    adapter.removePagination();
                }
            }

        } catch (error) {
            console.error('加载下一页失败:', error);
            loadingIndicator.remove();
            showMessage('加载失败，请稍后重试');
        } finally {
            state.isLoading = false;
        }
    }

    function showMessage(text) {
        const existingMsg = document.getElementById('auto-expand-message');
        if (existingMsg) existingMsg.remove();

        const msg = document.createElement('div');
        msg.id = 'auto-expand-message';
        msg.textContent = text;
        document.body.appendChild(msg);

        setTimeout(() => {
            msg.remove();
        }, 3000);
    }

    function updateStats() {
        let stats = document.getElementById('auto-expand-stats');
        if (!stats) {
            stats = document.createElement('div');
            stats.id = 'auto-expand-stats';
            document.body.appendChild(stats);
        }
        
        if (config.enabled) {
            stats.style.display = 'flex';
            stats.innerHTML = `
                <span>已加载 ${state.currentPage} 页</span>
                <span>共 ${state.totalResults} 条结果</span>
            `;
        } else {
            stats.style.display = 'none';
        }
    }

    function handleScroll() {
        if (!config.enabled) return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        if (documentHeight - (scrollTop + windowHeight) < config.scrollThreshold) {
            loadNextPage();
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    const debouncedScroll = debounce(handleScroll, 200);

    function loadSettings(callback) {
        chrome.storage.sync.get(['enabled', 'maxPages'], function(result) {
            config.enabled = result.enabled !== false;
            config.maxPages = result.maxPages || defaultConfig.maxPages;
            if (callback) callback();
        });
    }

    function setupStorageListener() {
        chrome.storage.onChanged.addListener(function(changes, namespace) {
            if (namespace !== 'sync') return;
            
            if (changes.enabled !== undefined) {
                const wasEnabled = config.enabled;
                config.enabled = changes.enabled.newValue;
                
                const adapter = getCurrentAdapter();
                if (adapter) {
                    if (config.enabled) {
                        adapter.removePagination();
                        updateStats();
                        showMessage('自动展开已启用');
                    } else {
                        adapter.showPagination();
                        const stats = document.getElementById('auto-expand-stats');
                        if (stats) stats.style.display = 'none';
                        showMessage('自动展开已禁用');
                    }
                }
            }
            
            if (changes.maxPages !== undefined) {
                config.maxPages = changes.maxPages.newValue;
                showMessage(`最大页数已设置为 ${config.maxPages}`);
            }
        });
    }

    function cleanupLoadedUrls() {
        if (state.loadedUrls.size > 100) {
            const urlsArray = Array.from(state.loadedUrls);
            state.loadedUrls = new Set(urlsArray.slice(-50));
        }
    }

    function init() {
        const adapter = getCurrentAdapter();
        if (!adapter) {
            console.log('当前页面不支持自动展开');
            return;
        }

        loadSettings(() => {
            console.log(`续页已启用: ${adapter.name}, 状态: ${config.enabled ? '开启' : '关闭'}`);

            state.initialized = true;
            state.totalResults = adapter.countInitialResults();

            state.scrollListener = debouncedScroll;
            window.addEventListener('scroll', state.scrollListener);

            if (config.enabled) {
                adapter.removePagination();
                updateStats();

                setTimeout(() => {
                    loadNextPage();
                }, config.loadingDelay);
            }

            setupStorageListener();

            setInterval(cleanupLoadedUrls, 60000);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
