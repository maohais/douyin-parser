document.addEventListener('DOMContentLoaded', () => {
    const shareInput = document.getElementById('share-input');
    const parseButton = document.getElementById('parse-button');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error-message');
    const resultContainer = document.getElementById('result-container');
    const downloadButton = document.getElementById('download-button');
    const videoTitle = document.querySelector('#video-title span');
    const videoAuthor = document.querySelector('#video-author span');
    const likeCount = document.getElementById('like-count');
    const commentCount = document.getElementById('comment-count');
    const shareCount = document.getElementById('share-count');
    const originalLinkSpan = document.getElementById('original-link');
    const copyButton = document.getElementById('copy-button');

    let dp; // DPlayer 实例

    parseButton.addEventListener('click', handleParse);
    copyButton.addEventListener('click', handleCopy);

    shareInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleParse();
        }
    });

    async function handleParse() {
        hideError();
        resultContainer.classList.add('hidden');
        loadingDiv.classList.remove('hidden');
        parseButton.disabled = true;
        parseButton.textContent = '解析中...';

        const inputText = shareInput.value;
        const douyinUrl = extractUrl(inputText);

        if (!douyinUrl) {
            showError('未能从输入内容中提取有效的抖音链接，请检查后重试。');
            resetUI();
            return;
        }

        try {
            // 定义 EdgeOne Functions 的 API 端点
            const urlEndpoint = `/api/parse?url=${encodeURIComponent(douyinUrl)}`;
            const infoEndpoint = `/api/parse?data&url=${encodeURIComponent(douyinUrl)}`;

            const [urlData, videoInfo] = await Promise.all([
                fetch(urlEndpoint).then(res => res.json()),
                fetch(infoEndpoint).then(res => res.json())
            ]);

            if (urlData.error || videoInfo.error) {
                 throw new Error(urlData.error || videoInfo.error || 'API 返回错误');
            }

            updateResult(urlData, videoInfo);

        } catch (error) {
            console.error('解析失败:', error);
            showError(error.message || '解析失败，请检查链接或稍后再试。');
        } finally {
            resetUI();
        }
    }

    function extractUrl(text) {
        const regex = /(https?:\/\/v\.douyin\.com\/[a-zA-Z0-9-_]+)/;
        const match = text.match(regex);
        return match ? match[0] : null;
    }

    function updateResult(urlData, info) {
        const { originalUrl, finalUrl } = urlData;

        // **核心修改：构建指向我们 EdgeOne 代理函数的 URL**
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(originalUrl)}`;

        if (dp) {
            dp.destroy();
        }

        dp = new DPlayer({
            container: document.getElementById('dplayer'),
            video: {
                url: proxyUrl, // <-- 使用代理 URL 进行播放！
            },
        });

        // 下载按钮使用无防盗链的最终链接
        downloadButton.href = finalUrl;
        downloadButton.download = `${info.nickname || 'douyin'}-${info.desc || 'video'}.mp4`;

        // UI 更新
        originalLinkSpan.textContent = originalUrl;
        videoTitle.textContent = info.desc || '无标题';
        videoAuthor.textContent = info.nickname || '未知作者';
        likeCount.textContent = formatNumber(info.digg_count);
        commentCount.textContent = formatNumber(info.comment_count);
        shareCount.textContent = formatNumber(info.share_count);

        resultContainer.classList.remove('hidden');
    }

    // ... (其他辅助函数: handleCopy, showError, hideError, resetUI, formatNumber 保持不变) ...
    function handleCopy() {
        const linkToCopy = originalLinkSpan.textContent;
        if (!linkToCopy) return;
        navigator.clipboard.writeText(linkToCopy).then(() => {
            const originalText = copyButton.textContent;
            copyButton.textContent = '已复制!';
            copyButton.style.backgroundColor = '#FE2C55';
            copyButton.style.color = '#fff';
            setTimeout(() => {
                copyButton.textContent = originalText;
                copyButton.style.backgroundColor = '';
                copyButton.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('复制失败: ', err);
            alert('复制失败，请手动复制。');
        });
    }
    function showError(message) {
        loadingDiv.classList.add('hidden');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
    function hideError() {
        errorDiv.classList.add('hidden');
    }
    function resetUI() {
        loadingDiv.classList.add('hidden');
        parseButton.disabled = false;
        parseButton.textContent = '立即解析';
    }
    function formatNumber(num) {
        if (num === null || num === undefined) return 'N/A';
        if (num >= 10000) {
            return (num / 10000).toFixed(1) + 'w';
        }
        return num.toString();
    }
});
