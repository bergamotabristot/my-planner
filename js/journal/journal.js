let todayBlockRef = null;
const allDayBlocks = new Map();
let blocksWrapperGlobal = null;
let journalContainerGlobal = null;

// Rola APENAS o container interno do diário
function scrollBlockToTop(container, block) {
    if (!container || !block) return;
    const containerTop = container.getBoundingClientRect().top;
    const blockTop = block.getBoundingClientRect().top;
    const targetScroll = container.scrollTop + (blockTop - containerTop) - 12;

    container.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
    });
}

export function scrollToToday(smooth = true) {
    if (todayBlockRef && journalContainerGlobal) {
        if (smooth) {
            scrollBlockToTop(journalContainerGlobal, todayBlockRef);
        } else {
            const containerTop = journalContainerGlobal.getBoundingClientRect().top;
            const blockTop = todayBlockRef.getBoundingClientRect().top;
            journalContainerGlobal.scrollTop = journalContainerGlobal.scrollTop + (blockTop - containerTop) - 12;
        }
    }
}

// Garante que o intervalo entre o offset atual e o offset desejado exista no DOM
function ensureRangeExists(targetOffset) {
    const currentOffsets = Array.from(allDayBlocks.keys());
    if (currentOffsets.length === 0) return;

    let minOffset = Math.min(...currentOffsets);
    let maxOffset = Math.max(...currentOffsets);

    // Se o alvo está no passado mais distante que o carregado
    if (targetOffset > maxOffset) {
        for (let i = maxOffset + 1; i <= targetOffset; i++) {
            if (!allDayBlocks.has(i)) {
                const block = createDayBlock(i);
                blocksWrapperGlobal.insertBefore(block, blocksWrapperGlobal.firstChild);
            }
        }
    }
    // Se o alvo está no futuro mais distante que o carregado
    else if (targetOffset < minOffset) {
        for (let i = minOffset - 1; i >= targetOffset; i--) {
            if (!allDayBlocks.has(i)) {
                const block = createDayBlock(i);
                blocksWrapperGlobal.appendChild(block);
            }
        }
    }
}

function scrollToDayOffset(targetOffset) {
    if (!journalContainerGlobal) return;

    // Garante que os blocos até a data desejada sejam criados instantaneamente
    ensureRangeExists(targetOffset);

    let block = allDayBlocks.get(targetOffset);
    if (block) {
        setTimeout(() => {
            scrollBlockToTop(journalContainerGlobal, block);
        }, 50);
    }
}

function createDayBlock(dayOffset) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - dayOffset);

    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dateString = `${day}/${month}/${targetDate.getFullYear()}`;
    const shortDateString = `${day}/${month}`;
    const dateKey = targetDate.toISOString().split('T')[0];

    const dayWrapper = document.createElement('div');
    dayWrapper.className = 'journal-day-block';
    dayWrapper.dataset.offset = dayOffset;

    const dateHeader = document.createElement('h3');
    dateHeader.className = 'journal-date';
    dateHeader.textContent = dayOffset === 0 ? `Today - ${shortDateString}` : dateString;

    const journalInput = document.createElement('textarea');
    journalInput.className = 'journal-input';
    journalInput.dataset.date = dateKey;
    journalInput.lang = 'pt-BR';
    journalInput.placeholder = dayOffset === 0 ? "Write your thoughts for today..." : `Journal for ${dateString}...`;

    const savedContent = localStorage.getItem(`journal_${dateKey}`);
    if (savedContent) {
        journalInput.value = savedContent;
    }

    journalInput.addEventListener('input', () => {
        localStorage.setItem(`journal_${dateKey}`, journalInput.value);
    });

    let startY = 0;
    let isScrolling = false;

    journalInput.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isScrolling = false;
    }, { passive: true });

    journalInput.addEventListener('touchmove', (e) => {
        const currentY = e.touches[0].clientY;
        if (Math.abs(currentY - startY) > 8) {
            isScrolling = true;
        }
    }, { passive: true });

    journalInput.addEventListener('touchend', (e) => {
        if (!isScrolling && document.activeElement !== journalInput) {
            e.preventDefault();
            scrollBlockToTop(journalContainerGlobal, dayWrapper);

            setTimeout(() => {
                journalInput.focus();
            }, 200);
        }
    });

    journalInput.addEventListener('mousedown', () => {
        if (document.activeElement !== journalInput) {
            scrollBlockToTop(journalContainerGlobal, dayWrapper);
        }
    });

    dayWrapper.appendChild(dateHeader);
    dayWrapper.appendChild(journalInput);

    if (dayOffset === 0) {
        todayBlockRef = dayWrapper;
    }

    allDayBlocks.set(dayOffset, dayWrapper);
    return dayWrapper;
}

export function initJournal() {
    journalContainerGlobal = document.querySelector('.journal-container');
    if (!journalContainerGlobal) return;

    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    const journalView = journalContainerGlobal.parentElement;
    if (!journalView) return;

    const existingTopBar = journalView.querySelector('.journal-top-bar');
    if (existingTopBar) existingTopBar.remove();

    journalContainerGlobal.innerHTML = '';
    allDayBlocks.clear();

    const topBar = document.createElement('div');
    topBar.className = 'journal-top-bar';

    const actionBtn = document.createElement('button');
    actionBtn.className = 'journal-top-btn';
    actionBtn.textContent = 'Months'; 
    
    actionBtn.addEventListener('click', () => {
        const modal = document.getElementById('journalYearModal');
        if (modal) modal.style.display = 'flex';
    });

    topBar.appendChild(actionBtn);
    journalView.insertBefore(topBar, journalContainerGlobal);

    setupYearModal();

    blocksWrapperGlobal = document.createElement('div');
    blocksWrapperGlobal.className = 'journal-blocks-wrapper';
    journalContainerGlobal.appendChild(blocksWrapperGlobal);

    // Inicializa com um range leve (30 dias no passado e 30 no futuro) para carregar instantaneamente sem lag
    const INITIAL_RANGE = 30;
    const fragment = document.createDocumentFragment();

    for (let i = INITIAL_RANGE; i >= -INITIAL_RANGE; i--) {
        const block = createDayBlock(i);
        fragment.appendChild(block);
    }

    blocksWrapperGlobal.appendChild(fragment);

    requestAnimationFrame(() => {
        scrollToToday(false);
    });

    // Scroll Infinito Dinâmico (Carrega mais blocos levemente conforme o usuário rola)
    let isFetching = false;
    journalContainerGlobal.addEventListener('scroll', () => {
        if (isFetching) return;

        const { scrollTop, scrollHeight, clientHeight } = journalContainerGlobal;

        // Perto do topo -> Carrega mais 30 dias para o passado
        if (scrollTop < 200) {
            isFetching = true;
            const currentOldest = Math.max(...allDayBlocks.keys());
            const prevScrollHeight = journalContainerGlobal.scrollHeight;

            for (let i = 1; i <= 30; i++) {
                const targetOffset = currentOldest + i;
                if (!allDayBlocks.has(targetOffset)) {
                    const block = createDayBlock(targetOffset);
                    blocksWrapperGlobal.insertBefore(block, blocksWrapperGlobal.firstChild);
                }
            }

            journalContainerGlobal.scrollTop += (journalContainerGlobal.scrollHeight - prevScrollHeight);
            setTimeout(() => { isFetching = false; }, 50);
        }

        // Perto do fundo -> Carrega mais 30 dias para o futuro
        if (scrollTop + clientHeight >= scrollHeight - 200) {
            isFetching = true;
            const currentNewest = Math.min(...allDayBlocks.keys());

            for (let i = 1; i <= 30; i++) {
                const targetOffset = currentNewest - i;
                if (!allDayBlocks.has(targetOffset)) {
                    const block = createDayBlock(targetOffset);
                    blocksWrapperGlobal.appendChild(block);
                }
            }

            setTimeout(() => { isFetching = false; }, 50);
        }
    });
}

function setupYearModal() {
    const modal = document.getElementById('journalYearModal');
    const closeBtn = document.getElementById('closeJournalModal');
    const monthsGrid = document.getElementById('journalMonthsGrid');

    if (!modal || !monthsGrid) return;

    let selectedYear = new Date().getFullYear();
    let yearHeader = modal.querySelector('.journal-year-header');
    
    if (!yearHeader) {
        yearHeader = document.createElement('div');
        yearHeader.className = 'journal-year-header';
        yearHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-weight: bold; width: 100%;';

        const prevYearBtn = document.createElement('button');
        prevYearBtn.type = 'button';
        prevYearBtn.className = 'journal-year-nav-btn';
        prevYearBtn.textContent = '◀';
        
        const nextYearBtn = document.createElement('button');
        nextYearBtn.type = 'button';
        nextYearBtn.className = 'journal-year-nav-btn';
        nextYearBtn.textContent = '▶';

        const yearTitle = document.createElement('span');
        yearTitle.className = 'journal-year-title';
        yearTitle.textContent = selectedYear;

        prevYearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedYear--;
            yearTitle.textContent = selectedYear;
            renderMonths();
        });

        nextYearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedYear++;
            yearTitle.textContent = selectedYear;
            renderMonths();
        });

        yearHeader.appendChild(prevYearBtn);
        yearHeader.appendChild(yearTitle);
        yearHeader.appendChild(nextYearBtn);

        monthsGrid.parentNode.insertBefore(yearHeader, monthsGrid);
    }

    function renderMonths() {
        monthsGrid.innerHTML = '';
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        monthNames.forEach((name, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'journal-month-btn';
            btn.textContent = name;
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                modal.style.display = 'none';

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const targetDate = new Date(selectedYear, index, 1);
                targetDate.setHours(0, 0, 0, 0);

                const diffTime = today - targetDate;
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                scrollToDayOffset(diffDays);
            });

            monthsGrid.appendChild(btn);
        });
    }

    renderMonths();

    const actionBtn = document.querySelector('.journal-top-btn');
    if (actionBtn && !actionBtn.dataset.listenerAttached) {
        actionBtn.dataset.listenerAttached = 'true';
        actionBtn.addEventListener('click', () => {
            selectedYear = new Date().getFullYear();
            const yearTitle = modal.querySelector('.journal-year-title');
            if (yearTitle) yearTitle.textContent = selectedYear;
            renderMonths();
            modal.style.display = 'flex';
        });
    }

    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            modal.style.display = 'none';
        };
    }

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}