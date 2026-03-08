document.addEventListener('DOMContentLoaded', () => {

    // =====================================================
    // DOM Referansları
    // =====================================================

    // Ekranlar
    const vaultScreen = document.getElementById('vault-screen');
    const errorScreen = document.getElementById('error-screen');
    const appContainer = document.getElementById('app');

    // Kasa Seçim Elemanları
    const vaultPathInput = document.getElementById('vault-path-input');
    const vaultOpenBtn = document.getElementById('vault-open-btn');
    const vaultBrowseBtn = document.getElementById('vault-browse-btn');
    const savedVaultsSection = document.getElementById('saved-vaults-section');
    const savedVaultsList = document.getElementById('saved-vaults-list');
    const vaultStatus = document.getElementById('vault-status');
    const activeVaultLabel = document.getElementById('active-vault-label');
    const changeVaultBtn = document.getElementById('change-vault-btn');

    // Hata Ekranı
    const errorTitle = document.getElementById('error-title');
    const errorMessage = document.getElementById('error-message');
    const errorBackBtn = document.getElementById('error-back-btn');

    // Sol Menü
    const menuContainer = document.getElementById('menu-container');
    const tabLibrary = document.getElementById('tab-library');
    const tabReview = document.getElementById('tab-review');
    const sidebarLibrary = document.getElementById('sidebar-library');
    const sidebarReview = document.getElementById('sidebar-review');
    const libraryInfo = document.getElementById('library-info');
    const reviewInfo = document.getElementById('review-info');

    // Kayıt Yöneticisi
    const saveSelector = document.getElementById('save-selector');
    const newSaveBtn = document.getElementById('new-save-btn');
    const hiddenCount = document.getElementById('hidden-count');
    const courseFilters = document.getElementById('course-filters');

    // Tekrar Modu
    const reviewQuestionTitle = document.getElementById('review-question-title');
    const reviewQuestionPath = document.getElementById('review-question-path');
    const reviewImageContainer = document.getElementById('review-image-container');
    const reviewQuestionImage = document.getElementById('review-question-image');
    const answerButtons = document.querySelectorAll('.answer-btn');
    const reviewFeedback = document.getElementById('review-feedback');
    const showSolutionBtn = document.getElementById('show-solution-btn');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const hideQuestionBtn = document.getElementById('hide-question-btn');

    // Video Oynatıcı
    const solutionPlayer = document.getElementById('solution-player');
    const videoPlaceholder = document.getElementById('video-placeholder');
    const videoTitle = document.getElementById('video-title');
    const videoPathText = document.getElementById('video-path-text');

    // =====================================================
    // Uygulama Durumu
    // =====================================================
    const state = {
        data: null,
        activeQuestionId: null,
        currentMode: 'library',
        saves: { 'save1': [] },
        currentSave: 'save1',
        reviewPool: [],
        currentReviewQuestion: null,
        activeVaultPath: null,
    };

    // localStorage anahtarları
    const LS_SAVES = 'yks_saves';
    const LS_VAULTS = 'yks_vaults';

    // =====================================================
    // BAŞLANGIÇ: Kasa Seçim Ekranını Göster
    // =====================================================
    function init() {
        showScreen('vault');
        renderSavedVaults();

        // Son kullanılan kasayı otomatik doldur
        const vaults = loadVaultHistory();
        if (vaults.length > 0) {
            vaultPathInput.value = vaults[0];
        }
    }

    // =====================================================
    // EKRAN YÖNETİMİ
    // =====================================================
    function showScreen(screen) {
        vaultScreen.classList.toggle('hidden', screen !== 'vault');
        errorScreen.classList.toggle('hidden', screen !== 'error');
        appContainer.classList.toggle('hidden', screen !== 'app');
    }

    function showError(title, message) {
        errorTitle.innerHTML = title;
        errorMessage.innerHTML = message;
        showScreen('error');
    }

    errorBackBtn.addEventListener('click', () => {
        showScreen('vault');
        setVaultStatus('', '');
    });

    // =====================================================
    // KASA GEÇMİŞİ (localStorage)
    // =====================================================
    function loadVaultHistory() {
        try {
            return JSON.parse(localStorage.getItem(LS_VAULTS)) || [];
        } catch {
            return [];
        }
    }

    function saveVaultHistory(path) {
        let vaults = loadVaultHistory().filter(v => v !== path);
        vaults.unshift(path); // En başa ekle
        vaults = vaults.slice(0, 10); // Maks 10 kayıt
        localStorage.setItem(LS_VAULTS, JSON.stringify(vaults));
    }

    function removeVaultFromHistory(path) {
        const vaults = loadVaultHistory().filter(v => v !== path);
        localStorage.setItem(LS_VAULTS, JSON.stringify(vaults));
    }

    // =====================================================
    // KASA SEÇİM UI
    // =====================================================
    function renderSavedVaults() {
        const vaults = loadVaultHistory();
        if (vaults.length === 0) {
            savedVaultsSection.classList.add('hidden');
            return;
        }

        savedVaultsSection.classList.remove('hidden');
        savedVaultsList.innerHTML = '';

        vaults.forEach(vaultPath => {
            const li = document.createElement('li');
            li.className = 'saved-vault-item';

            const folderName = vaultPath.split(/[\\/]/).pop() || vaultPath;

            li.innerHTML = `
                <button class="saved-vault-open" data-path="${vaultPath}" title="${vaultPath}">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                    </svg>
                    <span class="saved-vault-name">${folderName}</span>
                    <span class="saved-vault-path">${vaultPath}</span>
                </button>
                <button class="saved-vault-remove" data-path="${vaultPath}" title="Listeden Kaldır">✕</button>
            `;

            savedVaultsList.appendChild(li);
        });

        // Olaylar
        savedVaultsList.querySelectorAll('.saved-vault-open').forEach(btn => {
            btn.addEventListener('click', () => openVault(btn.dataset.path));
        });

        savedVaultsList.querySelectorAll('.saved-vault-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeVaultFromHistory(btn.dataset.path);
                renderSavedVaults();
            });
        });
    }

    function setVaultStatus(type, message) {
        if (!message) {
            vaultStatus.className = 'vault-status hidden';
            vaultStatus.textContent = '';
            return;
        }
        vaultStatus.className = `vault-status ${type}`;
        vaultStatus.textContent = message;
    }

    // Gözat Butonu — native klasör seçici
    vaultBrowseBtn.addEventListener('click', browseFolder);

    // Kasa Aç Butonu
    vaultOpenBtn.addEventListener('click', () => {
        const path = vaultPathInput.value.trim();
        if (!path) {
            setVaultStatus('error', 'Lütfen bir klasör yolu girin.');
            return;
        }
        openVault(path);
    });

    vaultPathInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') vaultOpenBtn.click();
    });

    // =====================================================
    // GÖZAT — tkinter üzerinden native klasör seçici
    // =====================================================
    async function browseFolder() {
        vaultBrowseBtn.disabled = true;
        vaultBrowseBtn.textContent = '...';
        setVaultStatus('loading', 'Klasör seçici açılıyor...');
        try {
            const res = await fetch('/api/browse');
            const data = await res.json();
            if (data.path) {
                vaultPathInput.value = data.path;
                setVaultStatus('', '');
                openVault(data.path);
            } else {
                // Kullanıcı iptal etti
                setVaultStatus('', '');
            }
        } catch (err) {
            setVaultStatus('error', 'Gözat başarısız: ' + err.message);
        } finally {
            vaultBrowseBtn.disabled = false;
            vaultBrowseBtn.innerHTML = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg> Gözat`;
        }
    }

    // Kasa Değiştir Butonu (ana uygulama içinden)
    changeVaultBtn.addEventListener('click', () => {
        solutionPlayer.pause();
        solutionPlayer.src = '';
        menuContainer.innerHTML = '';
        courseFilters.innerHTML = '';
        state.data = null;
        state.activeVaultPath = null;
        renderSavedVaults();
        setVaultStatus('', '');
        vaultPathInput.value = '';
        showScreen('vault');
    });

    // =====================================================
    // KASA AÇMA VE TARAMA
    // =====================================================
    async function openVault(vaultPath) {
        vaultOpenBtn.disabled = true;
        setVaultStatus('loading', `Taranıyor: ${vaultPath}`);

        try {
            const url = `/api/scan?path=${encodeURIComponent(vaultPath)}`;
            const response = await fetch(url);
            const jsonData = await response.json();

            if (!response.ok) {
                throw new Error(jsonData.error || `HTTP ${response.status}`);
            }

            if (!jsonData || jsonData.length === 0) {
                throw new Error('Bu klasörde tanınan video dosyası bulunamadı.\n\nBeklenen yapı: KasaKlasörü/Ders/Ünite/video.mp4');
            }

            // Başarılı — uygulamayı başlat
            state.data = jsonData;
            state.activeVaultPath = vaultPath;

            saveVaultHistory(vaultPath);
            renderSavedVaults();

            setupApp(jsonData, vaultPath);

        } catch (error) {
            console.error('Kasa açma hatası:', error);
            setVaultStatus('error', `Hata: ${error.message}`);
        } finally {
            vaultOpenBtn.disabled = false;
        }
    }

    // =====================================================
    // UYGULAMA KURULUMU (Kasa açıldıktan sonra)
    // =====================================================
    function setupApp(data, vaultPath) {
        // Menüyü sıfırla ve yeniden oluştur
        menuContainer.innerHTML = '';
        courseFilters.innerHTML = '';

        buildMenuOptimized(data);
        buildCourseFilters(data);
        loadSaves();
        setupEventDelegation();
        setupModeEventListeners();

        // Aktif kasa etiketini güncelle
        const folderName = vaultPath.split(/[\\/]/).pop() || vaultPath;
        activeVaultLabel.textContent = folderName;
        activeVaultLabel.title = vaultPath;

        // Tekrar modunu sıfırla
        switchMode('library');

        showScreen('app');
        setVaultStatus('', '');
    }

    // =====================================================
    // SAVE / KAYIT YÖNETİMİ
    // =====================================================
    function loadSaves() {
        const savedData = localStorage.getItem(LS_SAVES);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                state.saves = parsed.saves || { 'save1': [] };
                state.currentSave = parsed.currentSave || 'save1';
            } catch (e) {
                console.warn('Save datası okunamadı, sıfırlanıyor...');
            }
        }
        updateSaveUI();
    }

    function saveSaves() {
        localStorage.setItem(LS_SAVES, JSON.stringify({
            saves: state.saves,
            currentSave: state.currentSave
        }));
        updateSaveUI();
    }

    function updateSaveUI() {
        saveSelector.innerHTML = '';
        Object.keys(state.saves).forEach(saveName => {
            const opt = document.createElement('option');
            opt.value = saveName;
            opt.textContent = saveName === 'save1' ? 'Kayıt 1 (Ana)' : `Kayıt ${saveName.replace('save', '')}`;
            if (saveName === state.currentSave) opt.selected = true;
            saveSelector.appendChild(opt);
        });

        const hiddenArray = state.saves[state.currentSave] || [];
        hiddenCount.textContent = hiddenArray.length;
    }

    // =====================================================
    // MENÜ OLUŞTURMA
    // =====================================================
    function buildMenuOptimized(data) {
        const folderIcon = `<svg class="accordion-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`;
        const playIconSm = `<svg class="question-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 18 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

        let htmlString = '';

        data.forEach(ders => {
            htmlString += `<div class="accordion-item level-1">
                <button class="accordion-header" aria-expanded="false">
                    <span>${ders.baslik}</span>
                    ${folderIcon}
                </button>
                <div class="accordion-content">`;

            if (ders.uniteListesi) {
                ders.uniteListesi.forEach(unite => {
                    htmlString += `<div class="accordion-item level-2">
                        <button class="accordion-header" aria-expanded="false">
                            <span>${unite.baslik}</span>
                            ${folderIcon}
                        </button>
                        <div class="accordion-content">`;

                    if (unite.testListesi) {
                        unite.testListesi.forEach(test => {
                            htmlString += `<div class="accordion-item level-3">
                                <button class="accordion-header" aria-expanded="false">
                                    <span>${test.baslik}</span>
                                    ${folderIcon}
                                </button>
                                <div class="accordion-content">`;

                            if (test.soruListesi) {
                                test.soruListesi.forEach(soru => {
                                    htmlString += `
                                    <div class="level-4">
                                        <button class="question-item" data-id="${soru.id}" data-src="${soru.video}" data-title="${ders.baslik} > ${unite.baslik} > ${test.baslik} > ${soru.baslik}">
                                            ${playIconSm}
                                            <span>${soru.baslik}</span>
                                        </button>
                                    </div>`;
                                });
                            }

                            htmlString += `</div></div>`;
                        });
                    }

                    htmlString += `</div></div>`;
                });
            }

            htmlString += `</div></div>`;
        });

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;

        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
        }

        menuContainer.appendChild(fragment);
    }

    function buildCourseFilters(data) {
        courseFilters.innerHTML = '';
        data.forEach(ders => {
            const label = document.createElement('label');
            label.className = 'filter-label';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'filter-checkbox';
            checkbox.value = ders.id;
            checkbox.checked = true;

            checkbox.addEventListener('change', () => {
                buildReviewPool();
                loadRandomQuestion();
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(ders.baslik));
            courseFilters.appendChild(label);
        });
    }

    // =====================================================
    // OLAY DİNLEYİCİLERİ
    // =====================================================

    // Event delegation çeşitli kez kurulmasın diye flag tutuyoruz
    let delegationSetup = false;

    function setupEventDelegation() {
        if (delegationSetup) return;
        delegationSetup = true;

        menuContainer.addEventListener('click', (e) => {
            const headerBtn = e.target.closest('.accordion-header');
            if (headerBtn) { toggleAccordion(headerBtn); return; }

            const questionBtn = e.target.closest('.question-item');
            if (questionBtn) { playVideo(questionBtn); return; }
        });
    }

    let modeListenersSetup = false;

    function setupModeEventListeners() {
        if (modeListenersSetup) return;
        modeListenersSetup = true;

        tabLibrary.addEventListener('click', () => switchMode('library'));
        tabReview.addEventListener('click', () => switchMode('review'));

        saveSelector.addEventListener('change', (e) => {
            state.currentSave = e.target.value;
            saveSaves();
            buildReviewPool();
            loadRandomQuestion();
        });

        newSaveBtn.addEventListener('click', () => {
            const saveCount = Object.keys(state.saves).length + 1;
            const newSaveName = `save${saveCount}`;
            state.saves[newSaveName] = [];
            state.currentSave = newSaveName;
            saveSaves();
            buildReviewPool();
            loadRandomQuestion();
        });

        answerButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                handleAnswer(btn.getAttribute('data-answer'), btn);
            });
        });

        showSolutionBtn.addEventListener('click', showReviewSolution);
        nextQuestionBtn.addEventListener('click', loadRandomQuestion);
        hideQuestionBtn.addEventListener('click', hideCurrentQuestion);
    }

    // =====================================================
    // MOD GEÇİŞİ
    // =====================================================
    function switchMode(mode) {
        state.currentMode = mode;
        if (mode === 'library') {
            tabLibrary.classList.add('active');
            tabReview.classList.remove('active');
            sidebarLibrary.classList.remove('hidden');
            sidebarReview.classList.add('hidden');
            libraryInfo.classList.remove('hidden');
            reviewInfo.classList.add('hidden');

            if (state.activeQuestionId) {
                solutionPlayer.classList.add('active');
                videoPlaceholder.classList.add('hidden');
            } else {
                solutionPlayer.classList.remove('active');
                videoPlaceholder.classList.remove('hidden');
            }
        } else {
            tabReview.classList.add('active');
            tabLibrary.classList.remove('active');
            sidebarReview.classList.remove('hidden');
            sidebarLibrary.classList.add('hidden');
            reviewInfo.classList.remove('hidden');
            libraryInfo.classList.add('hidden');

            solutionPlayer.pause();
            solutionPlayer.classList.remove('active');
            videoPlaceholder.classList.remove('hidden');

            buildReviewPool();
            loadRandomQuestion();
        }
    }

    // =====================================================
    // TEKRAR MODU
    // =====================================================
    function buildReviewPool() {
        state.reviewPool = [];
        const hiddenIds = state.saves[state.currentSave] || [];
        const selectedCourses = Array.from(
            document.querySelectorAll('.filter-checkbox:checked')
        ).map(cb => cb.value);

        state.data.forEach(ders => {
            if (!selectedCourses.includes(ders.id)) return;
            if (!ders.uniteListesi) return;
            ders.uniteListesi.forEach(unite => {
                if (!unite.testListesi) return;
                unite.testListesi.forEach(test => {
                    if (!test.soruListesi) return;
                    test.soruListesi.forEach(soru => {
                        if (!hiddenIds.includes(soru.id)) {
                            state.reviewPool.push({
                                ...soru,
                                path: `${ders.baslik} > ${unite.baslik} > ${test.baslik}`
                            });
                        }
                    });
                });
            });
        });

        // Karıştır (Fisher-Yates)
        for (let i = state.reviewPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [state.reviewPool[i], state.reviewPool[j]] = [state.reviewPool[j], state.reviewPool[i]];
        }
    }

    function loadRandomQuestion() {
        reviewFeedback.className = 'feedback-message hidden';
        reviewFeedback.innerHTML = '';
        showSolutionBtn.classList.add('hidden');
        answerButtons.forEach(btn => {
            btn.classList.remove('selected', 'correct', 'wrong');
            btn.disabled = false;
        });

        solutionPlayer.pause();
        solutionPlayer.classList.remove('active');
        videoPlaceholder.classList.remove('hidden');

        reviewImageContainer.classList.add('hidden');
        reviewQuestionImage.src = '';

        if (state.reviewPool.length === 0) {
            reviewQuestionTitle.textContent = 'Gösterilecek Soru Kalmadı!';
            reviewQuestionPath.textContent = 'Tüm soruları gizlediniz veya havuz boş.';
            state.currentReviewQuestion = null;
            return;
        }

        const q = state.reviewPool.pop();
        state.currentReviewQuestion = q;

        reviewQuestionTitle.textContent = q.baslik;
        reviewQuestionPath.textContent = q.path;

        if (q.resim) {
            reviewQuestionImage.src = q.resim;
            reviewImageContainer.classList.remove('hidden');
        }
    }

    function handleAnswer(answer, btn) {
        if (!state.currentReviewQuestion) return;

        answerButtons.forEach(b => (b.disabled = true));
        btn.classList.add('selected');

        const q = state.currentReviewQuestion;
        if (!q.cevap) {
            reviewFeedback.textContent = 'Bu sorunun kayıtlı bir cevabı yok. Lütfen çözümü izleyerek kontrol edin.';
            reviewFeedback.className = 'feedback-message info';
        } else if (q.cevap === answer) {
            reviewFeedback.textContent = 'Tebrikler, Doğru Cevap!';
            reviewFeedback.className = 'feedback-message success';
            btn.classList.add('correct');
        } else {
            reviewFeedback.textContent = `Yanlış Cevap. Doğru cevap: ${q.cevap}`;
            reviewFeedback.className = 'feedback-message error';
            btn.classList.add('wrong');
            answerButtons.forEach(b => {
                if (b.getAttribute('data-answer') === q.cevap) b.classList.add('correct');
            });
        }

        showSolutionBtn.classList.remove('hidden');
    }

    function showReviewSolution() {
        if (!state.currentReviewQuestion) return;
        videoPlaceholder.classList.add('hidden');
        solutionPlayer.classList.add('active');
        solutionPlayer.src = state.currentReviewQuestion.video;
        solutionPlayer.play().catch(e => console.warn('Otomatik oynatma engellendi:', e));
    }

    function hideCurrentQuestion() {
        if (!state.currentReviewQuestion) return;
        const qId = state.currentReviewQuestion.id;
        if (!state.saves[state.currentSave].includes(qId)) {
            state.saves[state.currentSave].push(qId);
            saveSaves();
        }
        loadRandomQuestion();
    }

    // =====================================================
    // AKORDEON VE VİDEO
    // =====================================================
    function toggleAccordion(headerBtn) {
        const content = headerBtn.nextElementSibling;
        const isExpanded = headerBtn.getAttribute('aria-expanded') === 'true';

        if (isExpanded) {
            headerBtn.setAttribute('aria-expanded', 'false');
            content.style.maxHeight = null;
            content.style.opacity = '0';
        } else {
            headerBtn.setAttribute('aria-expanded', 'true');
            content.style.maxHeight = content.scrollHeight + 300 + 'px';
            content.style.opacity = '1';
        }
    }

    function playVideo(btn) {
        const prevActive = document.querySelector('.question-item.active');
        if (prevActive) prevActive.classList.remove('active');

        btn.classList.add('active');

        const videoSrc = btn.getAttribute('data-src');
        const questionTitle = btn.getAttribute('data-title');
        state.activeQuestionId = btn.getAttribute('data-id');

        videoPlaceholder.classList.add('hidden');
        solutionPlayer.classList.add('active');

        videoTitle.textContent = questionTitle;
        videoPathText.textContent = `Dosya: ${videoSrc}`;

        solutionPlayer.src = videoSrc;
        solutionPlayer.play().catch(error => {
            console.warn('Otomatik oynatma tarayıcı tarafından engellendi:', error);
        });
    }

    // =====================================================
    // BAŞLAT
    // =====================================================
    init();
});
