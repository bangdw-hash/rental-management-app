'use strict';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxWezOw5Nqjc7ppWdqNAPM8EXwvPa57u8JVnkEjM64LN6ymfUR9W1MLW8xaxWCIP-Cs7w/exec';

let currentTab = 'venues';
let venues = [];
let requests = [];
let settings = {};
let currentProjectId = null;
let currentEmailProjectId = null;
let currentSchedProjectId = null;
let editingVenueId = null;
let personRateCount = 0;

// ─────────────────────────────────────────
//  인증
// ─────────────────────────────────────────
function doLogin() {
  const pw = document.getElementById('loginPw').value;
  if (!pw) return;
  callGAS('checkPassword', { password: pw })
    .then(r => {
      if (r.ok) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminDash').style.display = 'flex';
        loadAll();
      } else {
        document.getElementById('loginErr').textContent = '비밀번호가 올바르지 않습니다.';
      }
    })
    .catch(() => {
      // fallback: 로컬 확인
      if (pw === 'admin1234') {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminDash').style.display = 'flex';
        loadAll();
      } else {
        document.getElementById('loginErr').textContent = '비밀번호가 올바르지 않습니다.';
      }
    });
}

function doLogout() {
  document.getElementById('adminDash').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginPw').value = '';
  document.getElementById('loginErr').textContent = '';
}

// ─────────────────────────────────────────
//  데이터 로드
// ─────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadVenues(), loadRequests(), loadSettings()]);
  renderCurrentTab();
}

async function loadVenues() {
  try {
    const r = await callGAS('getVenues', {});
    venues = r.data || [];
    populateBuildingFilter();
  } catch (e) { venues = []; }
}

async function loadRequests() {
  try {
    const r = await callGAS('getRequests', {});
    requests = r.data || [];
    updateReqBadge();
  } catch (e) { requests = []; }
}

async function loadSettings() {
  try {
    const r = await callGAS('getSettings', {});
    settings = r.data || {};
    applySettingsToForm();
  } catch (e) { settings = {}; }
}

async function loadReport() {
  const period = document.getElementById('reportPeriod').value;
  try {
    const r = await callGAS('getReport', { period });
    renderReport(r.data || {});
  } catch (e) { renderReport({}); }
}

function updateReqBadge() {
  const pending = requests.filter(r => r.status === 'REQUESTED').length;
  const badge = document.getElementById('reqBadge');
  if (pending > 0) { badge.textContent = pending; badge.style.display = 'inline-block'; }
  else badge.style.display = 'none';
}

// ─────────────────────────────────────────
//  탭 전환
// ─────────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sb-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
  document.getElementById('sb' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
  renderCurrentTab();
}

function renderCurrentTab() {
  if (currentTab === 'venues') renderVenueTable();
  if (currentTab === 'requests') renderRequestList();
  if (currentTab === 'kanban') renderKanban();
  if (currentTab === 'report') loadReport();
}

// ─────────────────────────────────────────
//  표준 대관료 관리
// ─────────────────────────────────────────
function populateBuildingFilter() {
  const sel = document.getElementById('venueFilterBuilding');
  const buildings = [...new Set(venues.map(v => v.building))];
  const cur = sel.value;
  sel.innerHTML = '<option value="">전체 건물</option>';
  buildings.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b; opt.textContent = b;
    if (b === cur) opt.selected = true;
    sel.appendChild(opt);
  });
}

function renderVenueTable() {
  const buildingFilter = document.getElementById('venueFilterBuilding').value;
  const showInactive = document.getElementById('showInactive').checked;
  const tbody = document.getElementById('venueTableBody');
  const list = venues.filter(v =>
    (!buildingFilter || v.building === buildingFilter) &&
    (showInactive || v.active !== false)
  );
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" class="ta-center">시설이 없습니다.</td></tr>'; return; }
  tbody.innerHTML = list.map(v => `
    <tr class="${v.active === false ? 'row-inactive' : ''}">
      <td>${v.building || ''}</td>
      <td>${v.name}</td>
      <td>${v.type || ''}</td>
      <td>${v.capacity ? v.capacity + '명' : '-'}</td>
      <td>${v.halfDayAmt ? fmtMoney(v.halfDayAmt) + '원' : (v.personRates ? '인원별' : '-')}</td>
      <td>${v.extraDesc ? v.extraDesc + (v.extraAmt ? ' ' + fmtMoney(v.extraAmt) + '원' : '') : '-'}</td>
      <td><span class="status-chip ${v.active === false ? 'chip-off' : 'chip-on'}">${v.active === false ? '비활성' : '활성'}</span></td>
      <td class="td-actions">
        <button class="btn-xs" onclick="openVenueModal('${v.id}')">수정</button>
        <button class="btn-xs btn-danger" onclick="toggleVenueActive('${v.id}', ${v.active !== false})">${v.active === false ? '활성화' : '비활성'}</button>
      </td>
    </tr>`).join('');
}

function openVenueModal(venueId) {
  editingVenueId = venueId;
  const v = venueId ? venues.find(x => x.id === venueId) : null;
  document.getElementById('venueModalTitle').textContent = v ? '시설 수정' : '시설 추가';

  document.getElementById('vBuilding').value = v?.building || '';
  document.getElementById('vName').value = v?.name || '';
  document.getElementById('vType').value = v?.type || '강의실';
  document.getElementById('vCapacity').value = v?.capacity || '';
  document.getElementById('vHalfDay').value = v?.halfDayAmt || '';
  document.getElementById('vFullDay').value = v?.fullDayAmt || '';
  document.getElementById('vHourly').value = v?.hourlyAmt || '';
  document.getElementById('vExtraDesc').value = v?.extraDesc || '';
  document.getElementById('vExtraAmt').value = v?.extraAmt || '';
  document.getElementById('vNote').value = v?.note || '';

  personRateCount = 0;
  const hasPersonRate = !!(v?.personRates?.length);
  document.getElementById('vHasPersonRate').checked = hasPersonRate;
  togglePersonRate();
  if (hasPersonRate) {
    v.personRates.forEach(pr => addPersonRateRow(pr.minPerson, pr.maxPerson, pr.halfDay, pr.fullDay));
  }

  document.getElementById('venueModal').style.display = 'flex';
}

function closeVenueModal() { document.getElementById('venueModal').style.display = 'none'; }

function togglePersonRate() {
  const has = document.getElementById('vHasPersonRate').checked;
  document.getElementById('personRatesSection').style.display = has ? 'block' : 'none';
}

function addPersonRateRow(minP = '', maxP = '', half = '', full = '') {
  personRateCount++;
  const id = personRateCount;
  const div = document.createElement('div');
  div.className = 'person-rate-row';
  div.id = 'prRow' + id;
  div.innerHTML = `
    <input type="number" placeholder="최소 인원" value="${minP}" class="pr-min" style="width:90px">
    <span>~</span>
    <input type="number" placeholder="최대 인원 (0=초과)" value="${maxP}" class="pr-max" style="width:90px">
    <span>인, 반일</span>
    <input type="number" placeholder="0" value="${half}" class="pr-half" style="width:110px">
    <span>원, 전일</span>
    <input type="number" placeholder="0" value="${full}" class="pr-full" style="width:110px">
    <span>원</span>
    <button class="btn-xs btn-danger" onclick="document.getElementById('prRow${id}').remove()">삭제</button>`;
  document.getElementById('personRateRows').appendChild(div);
}

async function saveVenue() {
  const payload = {
    id: editingVenueId,
    building: document.getElementById('vBuilding').value.trim(),
    name: document.getElementById('vName').value.trim(),
    type: document.getElementById('vType').value,
    capacity: parseInt(document.getElementById('vCapacity').value) || 0,
    halfDayAmt: parseInt(document.getElementById('vHalfDay').value) || 0,
    fullDayAmt: parseInt(document.getElementById('vFullDay').value) || 0,
    hourlyAmt: parseInt(document.getElementById('vHourly').value) || 0,
    extraDesc: document.getElementById('vExtraDesc').value.trim(),
    extraAmt: parseInt(document.getElementById('vExtraAmt').value) || 0,
    note: document.getElementById('vNote').value.trim(),
  };
  if (!payload.name) { showToast('시설명을 입력하세요.'); return; }

  if (document.getElementById('vHasPersonRate').checked) {
    const rows = document.querySelectorAll('.person-rate-row');
    payload.personRates = [...rows].map(row => ({
      minPerson: parseInt(row.querySelector('.pr-min').value) || 0,
      maxPerson: parseInt(row.querySelector('.pr-max').value) || 0,
      halfDay: parseInt(row.querySelector('.pr-half').value) || 0,
      fullDay: parseInt(row.querySelector('.pr-full').value) || 0,
    }));
  }

  try {
    const action = editingVenueId ? 'updateVenue' : 'addVenue';
    await callGAS(action, payload);
    showToast('저장되었습니다.');
    closeVenueModal();
    await loadVenues();
    renderVenueTable();
  } catch (e) { showToast('저장 실패: ' + e.message); }
}

async function toggleVenueActive(id, currentlyActive) {
  try {
    await callGAS('toggleVenue', { id, active: !currentlyActive });
    await loadVenues();
    renderVenueTable();
  } catch (e) { showToast('상태 변경 실패'); }
}

// ─────────────────────────────────────────
//  예약 요청 현황
// ─────────────────────────────────────────
function renderRequestList() {
  const statusFilter = document.getElementById('reqFilterStatus').value;
  const search = document.getElementById('reqSearch').value.trim().toLowerCase();
  const tbody = document.getElementById('reqTableBody');
  const list = requests.filter(r =>
    (!statusFilter || r.status === statusFilter) &&
    (!search || (r.orgName || '').toLowerCase().includes(search) || (r.contactName || '').toLowerCase().includes(search))
  );
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" class="ta-center">해당 항목이 없습니다.</td></tr>'; return; }
  tbody.innerHTML = list.map(r => `
    <tr>
      <td class="monospace">${r.reqId || r.id || ''}</td>
      <td>${r.orgName || ''}</td>
      <td>${r.venueName || ''}</td>
      <td>${formatDate(r.useDate)} ${r.startTime || ''}~${r.endTime || ''}</td>
      <td>${fmtMoney(r.finalAmt || r.totalAmt || 0)}원</td>
      <td><span class="status-badge s-${r.status}">${statusLabel(r.status)}</span></td>
      <td>${formatDate(r.requestedAt)}</td>
      <td class="td-actions">
        <button class="btn-xs" onclick="openProjectModal('${r.id}')">상세</button>
        ${r.status === 'REQUESTED' ? `
          <button class="btn-xs btn-success" onclick="quickStatus('${r.id}','APPROVED')">승인</button>
          <button class="btn-xs btn-danger" onclick="quickStatus('${r.id}','REJECTED')">거절</button>` : ''}
      </td>
    </tr>`).join('');
}

async function quickStatus(id, status) {
  const reason = status === 'REJECTED' ? prompt('거절 사유를 입력하세요.') : '';
  if (status === 'REJECTED' && reason === null) return;
  try {
    await callGAS('updateStatus', { id, status, reason: reason || '' });
    await loadRequests();
    renderRequestList();
    showToast('상태가 변경되었습니다.');
  } catch (e) { showToast('상태 변경 실패'); }
}

// ─────────────────────────────────────────
//  프로젝트 상세 모달
// ─────────────────────────────────────────
async function openProjectModal(id) {
  currentProjectId = id;
  const req = requests.find(r => r.id === id);
  if (!req) return;
  document.getElementById('projModalTitle').textContent = (req.orgName || '대관') + ' – 상세 정보';

  let detail = req;
  try {
    const r = await callGAS('getRequestDetail', { id });
    detail = r.data || req;
  } catch (e) {}

  document.getElementById('projModalBody').innerHTML = buildProjectDetail(detail);
  document.getElementById('projectModal').style.display = 'flex';
}

function closeProjectModal() {
  document.getElementById('projectModal').style.display = 'none';
  currentProjectId = null;
}

function buildProjectDetail(d) {
  const sched = d.scheduleHistory || [];
  const log = d.processLog || [];

  return `
  <div class="proj-detail-grid">
    <!-- 기본 정보 -->
    <div class="proj-section">
      <div class="proj-section-title">기본 정보</div>
      <table class="info-table">
        <tr><th>요청번호</th><td class="monospace">${d.reqId || d.id}</td></tr>
        <tr><th>기관명</th><td>${d.orgName || ''}</td></tr>
        <tr><th>담당자</th><td>${d.contactName || ''} ${d.contactPhone || ''}</td></tr>
        <tr><th>이메일</th><td>${d.contactEmail || ''}</td></tr>
        <tr><th>시설</th><td>${d.building || ''} ${d.venueName || ''}</td></tr>
        <tr><th>사용 목적</th><td>${d.purpose || ''}</td></tr>
        <tr><th>인원</th><td>${d.persons || ''}명</td></tr>
        <tr><th>상태</th><td><span class="status-badge s-${d.status}">${statusLabel(d.status)}</span></td></tr>
      </table>
    </div>

    <!-- 금액 정보 -->
    <div class="proj-section">
      <div class="proj-section-title">금액 정보
        <button class="btn-xs" onclick="openFinalAmtModal('${d.id}', ${d.finalAmt || d.totalAmt || 0})">수정</button>
      </div>
      <table class="info-table">
        <tr><th>기본 대관료</th><td>${fmtMoney(d.baseAmt || 0)}원</td></tr>
        <tr><th>할증액</th><td>${fmtMoney(d.surchargeAmt || 0)}원</td></tr>
        <tr><th>기술지원비</th><td>${fmtMoney(d.techFee || 0)}원</td></tr>
        <tr><th>소계</th><td>${fmtMoney(d.totalAmt || 0)}원</td></tr>
        <tr><th>최종 대관료</th><td><b>${fmtMoney(d.finalAmt || d.totalAmt || 0)}원</b></td></tr>
        ${d.finalAmtNote ? `<tr><th>수정 사유</th><td>${d.finalAmtNote}</td></tr>` : ''}
      </table>
    </div>

    <!-- 사업자등록증 -->
    ${buildBizRegSection(d)}

    <!-- 일정 이력 -->
    <div class="proj-section col-2">
      <div class="proj-section-title">
        일정 이력
        <button class="btn-xs" onclick="openSchedModal('${d.id}')">+ 일정 추가/수정</button>
      </div>
      <div class="sched-timeline">
        ${sched.length ? sched.map(s => `
          <div class="sched-item">
            <span class="sched-type sched-${s.type}">${schedTypeLabel(s.type)}</span>
            <span class="sched-date">${formatDate(s.date)} ${s.startTime || ''}~${s.endTime || ''}</span>
            ${s.amt ? `<span class="sched-amt">${s.amt > 0 ? '+' : ''}${fmtMoney(s.amt)}원</span>` : ''}
            ${s.note ? `<span class="sched-note">${s.note}</span>` : ''}
            <button class="btn-xs btn-danger" onclick="removeSchedEntry('${d.id}','${s.schedId}')">삭제</button>
          </div>`).join('') : '<div class="text-muted">일정 이력 없음</div>'}
      </div>
    </div>

    <!-- 공정 타임라인 -->
    <div class="proj-section col-2">
      <div class="proj-section-title">공정 타임라인</div>
      <div class="process-timeline">
        ${buildProcessTimeline(d, log)}
      </div>
    </div>

    <!-- 워크플로 액션 -->
    <div class="proj-section col-2">
      <div class="proj-section-title">워크플로 액션</div>
      <div class="action-buttons">
        ${buildActionButtons(d)}
      </div>
    </div>

    <!-- 문서 생성 -->
    <div class="proj-section col-2">
      <div class="proj-section-title">문서 생성</div>
      <div class="doc-action-grid">
        <button class="btn-doc" onclick="genAdminPDF('${d.id}','quote')">📄 견적서 PDF</button>
        <button class="btn-doc" onclick="genAdminPDF('${d.id}','transaction')">📄 거래내역서 PDF</button>
        <button class="btn-doc" onclick="genAdminPDF('${d.id}','invoice')">📄 청구서 PDF</button>
        <button class="btn-doc" onclick="openEmailModal('${d.id}')">✉️ 이메일 발송</button>
      </div>
    </div>
  </div>`;
}

function buildBizRegSection(d) {
  if (d.bizRegMode === 'skip' || !d.bizRegMode) return '';
  let content = '';
  if (d.bizRegMode === 'file' && d.bizRegData) {
    const isImage = d.bizRegMime && d.bizRegMime.startsWith('image/');
    content = isImage
      ? `<img src="data:${d.bizRegMime};base64,${d.bizRegData}" style="max-width:100%;border:1px solid #ddd">`
      : `<a class="btn-xs" href="data:application/pdf;base64,${d.bizRegData}" download="사업자등록증.pdf">PDF 다운로드</a>`;
  } else if (d.bizRegMode === 'text') {
    content = `<pre style="white-space:pre-wrap;font-size:11px;background:#f8f8f8;padding:8px;border-radius:4px">${d.bizRegText || ''}</pre>`;
  }
  return `<div class="proj-section col-2"><div class="proj-section-title">사업자등록증</div>${content}</div>`;
}

function buildProcessTimeline(d, log) {
  const steps = [
    { key: 'QUOTE_ISSUED', label: '견적 발행', field: 'quoteIssuedAt' },
    { key: 'REQUESTED', label: '예약 요청', field: 'requestedAt' },
    { key: 'APPROVED', label: '승인', field: 'approvedAt' },
    { key: 'IN_USE', label: '사용 시작', field: 'inUseAt' },
    { key: 'COMPLETED', label: '사용 완료', field: 'completedAt' },
    { key: 'INVOICED', label: '계산서 발행', field: 'invoicedAt' },
    { key: 'PAID', label: '입금 완료', field: 'paidAt' },
  ];
  const statusOrder = steps.map(s => s.key);
  const curIdx = statusOrder.indexOf(d.status);

  return steps.map((s, i) => {
    const done = i < curIdx || d.status === s.key;
    const active = d.status === s.key;
    const ts = d[s.field] ? formatDateTime(d[s.field]) : '';
    return `<div class="pt-step ${done ? 'pt-done' : ''} ${active ? 'pt-active' : ''}">
      <div class="pt-dot"></div>
      <div class="pt-content">
        <div class="pt-label">${s.label}</div>
        ${ts ? `<div class="pt-time">${ts}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function buildActionButtons(d) {
  const map = {
    'QUOTE_ISSUED': [{ label: '예약 요청 접수', next: 'REQUESTED', cls: '' }],
    'REQUESTED': [
      { label: '✓ 승인', next: 'APPROVED', cls: 'btn-success' },
      { label: '✗ 거절', next: 'REJECTED', cls: 'btn-danger' },
    ],
    'APPROVED': [
      { label: '사용 시작', next: 'IN_USE', cls: '' },
      { label: '취소', next: 'CANCELLED', cls: 'btn-danger' },
    ],
    'IN_USE': [{ label: '사용 완료', next: 'COMPLETED', cls: '' }],
    'COMPLETED': [{ label: '계산서 발행', next: 'INVOICED', cls: '' }],
    'INVOICED': [{ label: '입금 완료', next: 'PAID', cls: 'btn-success' }],
  };
  const btns = map[d.status] || [];
  if (!btns.length) return `<span class="text-muted">이 단계에서는 상태 변경이 없습니다.</span>`;
  return btns.map(b => `
    <button class="btn-primary ${b.cls || ''}" onclick="changeProjectStatus('${d.id}','${b.next}')">${b.label}</button>`).join('');
}

async function changeProjectStatus(id, status) {
  let reason = '';
  if (status === 'REJECTED') {
    reason = prompt('거절 사유를 입력하세요.') || '';
    if (reason === null) return;
  }
  try {
    await callGAS('updateStatus', { id, status, reason });
    showToast('상태가 변경되었습니다.');
    await loadRequests();
    const updated = requests.find(r => r.id === id);
    if (updated) {
      document.getElementById('projModalBody').innerHTML = buildProjectDetail(updated);
    }
    renderRequestList();
  } catch (e) { showToast('상태 변경 실패'); }
}

// ─────────────────────────────────────────
//  최종 금액 수정
// ─────────────────────────────────────────
function openFinalAmtModal(id, currentAmt) {
  currentProjectId = id;
  document.getElementById('finalAmtInput').value = currentAmt;
  document.getElementById('finalAmtNote').value = '';
  document.getElementById('finalAmtModal').style.display = 'flex';
}

async function saveFinalAmt() {
  const amt = parseInt(document.getElementById('finalAmtInput').value) || 0;
  const note = document.getElementById('finalAmtNote').value.trim();
  try {
    await callGAS('updateFinalAmt', { id: currentProjectId, amt, note });
    showToast('금액이 수정되었습니다.');
    document.getElementById('finalAmtModal').style.display = 'none';
    await loadRequests();
    const updated = requests.find(r => r.id === currentProjectId);
    if (updated) document.getElementById('projModalBody').innerHTML = buildProjectDetail(updated);
  } catch (e) { showToast('수정 실패'); }
}

// ─────────────────────────────────────────
//  일정 이력
// ─────────────────────────────────────────
function openSchedModal(id) {
  currentSchedProjectId = id;
  const req = requests.find(r => r.id === id);
  document.getElementById('schedModalTitle').textContent = (req?.orgName || '') + ' 일정 변경';
  document.getElementById('schedType').value = 'added';
  document.getElementById('schedDate').value = req?.useDate || '';
  document.getElementById('schedStart').value = req?.startTime || '';
  document.getElementById('schedEnd').value = req?.endTime || '';
  document.getElementById('schedAmt').value = 0;
  document.getElementById('schedNote').value = '';
  document.getElementById('schedModal').style.display = 'flex';
}

function closeSchedModal() { document.getElementById('schedModal').style.display = 'none'; }

async function saveSchedEntry() {
  const payload = {
    id: currentSchedProjectId,
    type: document.getElementById('schedType').value,
    date: document.getElementById('schedDate').value,
    startTime: document.getElementById('schedStart').value,
    endTime: document.getElementById('schedEnd').value,
    amt: parseInt(document.getElementById('schedAmt').value) || 0,
    note: document.getElementById('schedNote').value.trim(),
  };
  if (!payload.date) { showToast('날짜를 입력하세요.'); return; }
  try {
    await callGAS('addSchedule', payload);
    showToast('일정이 추가되었습니다.');
    closeSchedModal();
    await loadRequests();
    const updated = requests.find(r => r.id === currentSchedProjectId);
    if (updated && document.getElementById('projectModal').style.display !== 'none') {
      document.getElementById('projModalBody').innerHTML = buildProjectDetail(updated);
    }
  } catch (e) { showToast('저장 실패: ' + e.message); }
}

async function removeSchedEntry(reqId, schedId) {
  if (!confirm('이 일정 기록을 삭제하시겠습니까?')) return;
  try {
    await callGAS('removeSchedule', { id: reqId, schedId });
    showToast('삭제되었습니다.');
    await loadRequests();
    const updated = requests.find(r => r.id === reqId);
    if (updated) document.getElementById('projModalBody').innerHTML = buildProjectDetail(updated);
  } catch (e) { showToast('삭제 실패'); }
}

// ─────────────────────────────────────────
//  이메일 발송 모달
// ─────────────────────────────────────────
function openEmailModal(id) {
  currentEmailProjectId = id;
  const d = requests.find(r => r.id === id);
  if (!d) return;
  document.getElementById('emailTo').value = d.contactEmail || '';
  document.getElementById('emailCc').value = settings.mgrEmail || 'bangsw@asea.or.kr';
  document.getElementById('emailSubject').value = `[아세아항공직업전문학교] 대관 관련 안내 – ${d.orgName || ''}`;
  document.getElementById('emailBody').value = buildEmailTemplate(d);
  document.getElementById('attachQuote').checked = false;
  document.getElementById('attachTx').checked = false;
  document.getElementById('attachInvoice').checked = false;
  document.getElementById('emailModal').style.display = 'flex';
}

function closeEmailModal() { document.getElementById('emailModal').style.display = 'none'; }

function buildEmailTemplate(d) {
  const statusMsg = {
    APPROVED: '귀 기관의 대관 신청을 검토한 결과, 아래와 같이 대관을 승인 드립니다.',
    REJECTED: '귀 기관의 대관 신청을 검토한 결과, 아쉽게도 아래 사유로 대관이 어렵게 되었습니다.',
    INVOICED: '이용하신 대관에 대해 아래와 같이 계산서를 발행하였습니다.',
    PAID: '입금을 확인하였습니다. 감사합니다.',
  };
  const intro = statusMsg[d.status] || '대관 관련 안내사항을 전달 드립니다.';
  return `안녕하세요, ${d.orgName || ''} ${d.contactName || ''} 담당자님.

(재)아세아항공직업전문학교 대관담당 방시원 차장입니다.

${intro}

■ 대관 정보
  시설: ${d.building || ''} ${d.venueName || ''}
  일시: ${formatDate(d.useDate)} ${d.startTime || ''}~${d.endTime || ''}
  인원: ${d.persons || ''}명
  금액: ${fmtMoney(d.finalAmt || d.totalAmt || 0)}원 (부가세 면세)

문의사항이 있으시면 아래 연락처로 문의 주시기 바랍니다.

담당: 방시원 차장
TEL: 010-2055-5883
E-mail: bangsw@asea.or.kr

감사합니다.
(재)아세아항공직업전문학교`;
}

async function sendAdminEmail() {
  const to = document.getElementById('emailTo').value.trim();
  const cc = document.getElementById('emailCc').value.trim();
  const subject = document.getElementById('emailSubject').value.trim();
  const body = document.getElementById('emailBody').value.trim();
  if (!to || !subject) { showToast('받는 사람과 제목을 입력하세요.'); return; }
  try {
    await callGAS('sendEmail', {
      id: currentEmailProjectId,
      to, cc, subject, body,
      attachQuote: document.getElementById('attachQuote').checked,
      attachTx: document.getElementById('attachTx').checked,
      attachInvoice: document.getElementById('attachInvoice').checked,
    });
    showToast('이메일이 발송되었습니다.');
    closeEmailModal();
  } catch (e) { showToast('발송 실패: ' + e.message); }
}

// ─────────────────────────────────────────
//  PDF 생성 (관리자 문서)
// ─────────────────────────────────────────
async function genAdminPDF(id, docType) {
  const d = requests.find(r => r.id === id);
  if (!d) return;
  const docTitles = { quote: '대관료 견적서', transaction: '거래내역서', invoice: '청구서' };
  const title = docTitles[docType] || '문서';

  const template = document.getElementById('adminPdfTemplate');
  document.getElementById('apdfTitle').textContent = title;
  document.getElementById('apdfSubtitle').textContent = `발행일: ${todayStr()} | 요청번호: ${d.reqId || d.id}`;
  document.getElementById('apdfDate').textContent = `발행일: ${todayStr()}`;
  document.getElementById('apdfContent').innerHTML = buildPdfContent(d, docType);
  template.style.display = 'block';

  try {
    const canvas = await html2canvas(template, { scale: 2, useCORS: true, logging: false });
    template.style.display = 'none';
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgW = 210, imgH = (canvas.height * 210) / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, Math.min(imgH, 297));
    const org = (d.orgName || '기관').replace(/[\\/:*?"<>|]/g, '_');
    const fac = (d.venueName || '시설').replace(/[\\/:*?"<>|]/g, '_');
    const dt = (d.useDate || todayStr()).replace(/-/g, '');
    pdf.save(`${org}_${fac}_${dt}_${title}.pdf`);
    showToast(`${title} PDF가 다운로드되었습니다.`);
  } catch (e) {
    template.style.display = 'none';
    showToast('PDF 생성 실패: ' + e.message);
  }
}

function buildPdfContent(d, docType) {
  // 서체 기준: Bold(700)=헤딩·합계  Medium(500)=본문값  Light(300)=보조·각주
  const sched = d.scheduleHistory || [];
  const finalAmt = d.finalAmt || d.totalAmt || 0;

  // 공통 셀 스타일
  const TH = 'padding:5px 8px;font-weight:700;font-size:10px;';
  const TD = 'padding:5px 8px;font-weight:500;font-size:10.5px;';
  const TD_LIGHT = 'padding:5px 8px;font-weight:300;font-size:10px;color:#555;';

  let rows = '';
  if (docType === 'transaction' && sched.length) {
    [...sched.filter(s=>s.type==='original'),
     ...sched.filter(s=>s.type==='added'),
     ...sched.filter(s=>s.type==='removed'),
     ...sched.filter(s=>s.type==='modified')].forEach(s => {
      rows += `<tr>
        <td style="${TD}">${formatDate(s.date)}</td>
        <td style="${TD_LIGHT}">${s.startTime || ''}~${s.endTime || ''}</td>
        <td style="${TD}"><span style="color:${schedTypeColor(s.type)};font-weight:700">${schedTypeLabel(s.type)}</span></td>
        <td style="${TD};text-align:right;font-weight:${s.type==='removed'?'300':'700'};color:${s.type==='removed'?'#c0392b':'#1a3c6e'}">${s.amt ? (s.amt > 0 ? '+' : '') + fmtMoney(s.amt) + '원' : '-'}</td>
        <td style="${TD_LIGHT}">${s.note || ''}</td>
      </tr>`;
    });
  } else {
    rows = `<tr>
      <td style="${TD}">${d.building || ''} ${d.venueName || ''}</td>
      <td style="${TD_LIGHT}">${formatDate(d.useDate)} ${d.startTime || ''}~${d.endTime || ''}</td>
      <td style="${TD};text-align:center">1</td>
      <td style="${TD};text-align:right">${fmtMoney(d.baseAmt || finalAmt)}원</td>
      <td style="${TD_LIGHT}">${d.purpose || ''}</td>
    </tr>`;
    if (d.surchargeAmt) rows += `<tr><td style="${TD}">할증료</td><td style="${TD_LIGHT}"></td><td style="${TD};text-align:center">1</td><td style="${TD};text-align:right">${fmtMoney(d.surchargeAmt)}원</td><td style="${TD_LIGHT}">주말·공휴일·업무외 시간</td></tr>`;
    if (d.techFee) rows += `<tr><td style="${TD}">기술관리비</td><td style="${TD_LIGHT}"></td><td style="${TD};text-align:center">1</td><td style="${TD};text-align:right">${fmtMoney(d.techFee)}원</td><td style="${TD_LIGHT}"></td></tr>`;
  }

  const headerCol = docType === 'transaction' ? ['날짜', '시간', '구분', '금액', '비고'] : ['항목', '일시', '수량', '금액', '비고'];
  const docLabel = docType === 'quote' ? '견적서' : docType === 'transaction' ? '거래내역서' : '청구서';

  return `
    <!-- 수신처 메타 테이블: Bold 라벨 / Medium 값 -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px;border:1px solid #ccc">
      <tr style="background:#1a3c6e;color:#fff">
        <th style="${TH}width:22%">신청 기관</th>
        <td style="${TD}" colspan="3">${d.orgName || ''}</td>
      </tr>
      <tr style="background:#f0f4fb">
        <th style="${TH}">담당자</th>
        <td style="${TD}">${d.contactName || ''}&nbsp;(${d.contactPhone || ''})</td>
        <th style="${TH}">인원</th>
        <td style="${TD}">${d.persons || ''}명</td>
      </tr>
      <tr>
        <th style="${TH}">시설</th>
        <td style="${TD}" colspan="3">${d.building || ''} ${d.venueName || ''}</td>
      </tr>
      <tr>
        <th style="${TH}">사용 목적</th>
        <td style="${TD_LIGHT}" colspan="3">${d.purpose || ''}</td>
      </tr>
    </table>

    <!-- 요금 명세 테이블: Bold 헤더·합계 / Medium 본문 / Light 보조 -->
    <div style="font-weight:700;font-size:10px;color:#1a3c6e;margin-bottom:5px;padding-bottom:3px;border-bottom:1.5px solid #1a3c6e">■ 대관 요금 내역</div>
    <table style="width:100%;border-collapse:collapse;font-size:10.5px">
      <thead>
        <tr style="background:#1a3c6e;color:#fff">
          ${headerCol.map(h => `<th style="${TH}text-align:left">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#edf2f8">
          <td colspan="3" style="${TH}text-align:right;border-top:2px solid #1a3c6e;color:#1a3c6e">합계 (부가세 면세)</td>
          <td style="padding:6px 8px;text-align:right;border-top:2px solid #1a3c6e;font-weight:700;font-size:13px;color:#1a3c6e">${fmtMoney(finalAmt)}원</td>
          <td style="border-top:2px solid #1a3c6e"></td>
        </tr>
      </tfoot>
    </table>

    <!-- 입금 계좌: Bold 라벨 / Medium 계좌번호 -->
    <div style="margin-top:14px;padding:9px 12px;background:#f0f6ff;border-left:3px solid #1a3c6e;border-radius:4px">
      <span style="font-weight:700;font-size:9.5px;color:#1a3c6e">입금 계좌</span>
      <span style="font-weight:500;font-size:10.5px;color:#1a3c6e;margin-left:8px">IBK기업  (재)아세아항공직업전문학교  025-049131-04-042</span>
    </div>

    <!-- 각주: Light -->
    <div style="margin-top:8px;text-align:right;font-weight:300;font-size:9px;color:#e07b39">
      ※ 본 ${docLabel}는 부가세 면세 사업장 발행 문서로 공급가액만 표기됩니다.
    </div>`;
}

// ─────────────────────────────────────────
//  칸반
// ─────────────────────────────────────────
function renderKanban() {
  const cols = [
    { key: 'QUOTE_ISSUED', label: '견적 발행' },
    { key: 'REQUESTED', label: '예약 요청' },
    { key: 'APPROVED', label: '승인' },
    { key: 'IN_USE', label: '사용 중' },
    { key: 'COMPLETED', label: '완료' },
    { key: 'INVOICED', label: '계산서' },
    { key: 'PAID', label: '입금 완료' },
  ];
  const board = document.getElementById('kanbanBoard');
  board.innerHTML = cols.map(col => {
    const items = requests.filter(r => r.status === col.key);
    return `
      <div class="kanban-col">
        <div class="kanban-col-header">
          <span>${col.label}</span>
          <span class="kanban-count">${items.length}</span>
        </div>
        ${items.map(r => `
          <div class="kanban-item" onclick="openProjectModal('${r.id}')">
            <div class="ki-org">${r.orgName || '기관 미입력'}</div>
            <div class="ki-venue">${r.venueName || ''}</div>
            <div class="ki-date">${formatDate(r.useDate)}</div>
            <div class="ki-amt">${fmtMoney(r.finalAmt || r.totalAmt || 0)}원</div>
          </div>`).join('')}
      </div>`;
  }).join('');
}

// ─────────────────────────────────────────
//  설정
// ─────────────────────────────────────────
function applySettingsToForm() {
  const s = settings;
  if (!s || !Object.keys(s).length) return;
  setVal('sIssuerName', s.issuerName);
  setVal('sIssuerCeo', s.issuerCeo);
  setVal('sIssuerBiz', s.issuerBiz);
  setVal('sIssuerCorp', s.issuerCorp);
  setVal('sIssuerAddr', s.issuerAddr);
  setVal('sIssuerAccount', s.issuerAccount);
  setVal('sMgrName', s.mgrName);
  setVal('sMgrPhone', s.mgrPhone);
  setVal('sMgrEmail', s.mgrEmail);
  setVal('sSurchargeRate', s.surchargeRate);
  setVal('sOffHourRate', s.offHourRate);
  setVal('sFullDayHours', s.fullDayHours);
  setVal('sBizStart', s.bizStart);
  setVal('sBizEnd', s.bizEnd);
  setVal('sTgToken', s.tgToken);
  setVal('sTgChat', s.tgChat);
  setVal('sNotiEmail', s.notiEmail);
  setVal('sParkingNotice', s.parkingNotice);
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) el.value = val;
}

async function saveSettings() {
  const payload = {
    issuerName: document.getElementById('sIssuerName').value.trim(),
    issuerCeo: document.getElementById('sIssuerCeo').value.trim(),
    issuerBiz: document.getElementById('sIssuerBiz').value.trim(),
    issuerCorp: document.getElementById('sIssuerCorp').value.trim(),
    issuerAddr: document.getElementById('sIssuerAddr').value.trim(),
    issuerAccount: document.getElementById('sIssuerAccount').value.trim(),
    mgrName: document.getElementById('sMgrName').value.trim(),
    mgrPhone: document.getElementById('sMgrPhone').value.trim(),
    mgrEmail: document.getElementById('sMgrEmail').value.trim(),
    surchargeRate: parseFloat(document.getElementById('sSurchargeRate').value) || 30,
    offHourRate: parseFloat(document.getElementById('sOffHourRate').value) || 30,
    fullDayHours: parseFloat(document.getElementById('sFullDayHours').value) || 6,
    bizStart: document.getElementById('sBizStart').value,
    bizEnd: document.getElementById('sBizEnd').value,
    tgToken: document.getElementById('sTgToken').value.trim(),
    tgChat: document.getElementById('sTgChat').value.trim(),
    notiEmail: document.getElementById('sNotiEmail').value.trim(),
    parkingNotice: document.getElementById('sParkingNotice').value.trim(),
  };
  try {
    await callGAS('saveSettings', payload);
    settings = payload;
    showToast('설정이 저장되었습니다.');
  } catch (e) { showToast('저장 실패: ' + e.message); }
}

// ─────────────────────────────────────────
//  리포트
// ─────────────────────────────────────────
function renderReport(data) {
  const stats = document.getElementById('reportStats');
  const charts = document.getElementById('reportCharts');

  stats.innerHTML = `
    <div class="rstat"><div class="rstat-val">${data.totalRequests || 0}</div><div class="rstat-label">전체 요청</div></div>
    <div class="rstat"><div class="rstat-val">${data.approvedCount || 0}</div><div class="rstat-label">승인 건수</div></div>
    <div class="rstat"><div class="rstat-val">${data.rejectedCount || 0}</div><div class="rstat-label">거절 건수</div></div>
    <div class="rstat"><div class="rstat-val">${fmtMoney(data.totalRevenue || 0)}원</div><div class="rstat-label">총 대관료</div></div>
    <div class="rstat"><div class="rstat-val">${data.paidCount || 0}</div><div class="rstat-label">입금 완료</div></div>
    <div class="rstat"><div class="rstat-val">${fmtMoney(data.unpaidAmt || 0)}원</div><div class="rstat-label">미수금</div></div>`;

  const venueStats = data.byVenue || [];
  if (venueStats.length) {
    const maxCnt = Math.max(...venueStats.map(v => v.count || 0), 1);
    charts.innerHTML = `
      <div class="report-section-title">시설별 이용 현황</div>
      <div class="bar-chart">
        ${venueStats.map(v => `
          <div class="bar-row">
            <div class="bar-label">${v.name}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.round((v.count / maxCnt) * 100)}%"></div>
            </div>
            <div class="bar-val">${v.count}건 / ${fmtMoney(v.revenue || 0)}원</div>
          </div>`).join('')}
      </div>`;
  } else {
    charts.innerHTML = '<div class="text-muted">데이터가 없습니다.</div>';
  }
}

// ─────────────────────────────────────────
//  GAS 통신
// ─────────────────────────────────────────
async function callGAS(action, params) {
  if (!GAS_URL || GAS_URL === 'YOUR_GAS_WEB_APP_URL') {
    console.warn('GAS_URL이 설정되지 않았습니다. 더미 데이터를 사용합니다.');
    return getDummyData(action, params);
  }
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => {
    if (typeof v !== 'undefined' && v !== null) url.searchParams.set(k, String(v));
  });

  if (['submitRequest','updateStatus','addSchedule','removeSchedule','addVenue','updateVenue',
       'toggleVenue','saveSettings','updateFinalAmt','sendEmail','checkPassword'].includes(action)) {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...params }),
    });
    return res.json();
  }
  const res = await fetch(url.toString());
  return res.json();
}

// 개발용 더미 데이터
function getDummyData(action, params) {
  if (action === 'checkPassword') return { ok: true };
  if (action === 'getVenues') return { data: getDummyVenues() };
  if (action === 'getRequests') return { data: getDummyRequests() };
  if (action === 'getSettings') return { data: {} };
  if (action === 'getReport') return { data: { totalRequests: 5, approvedCount: 3, rejectedCount: 1, totalRevenue: 1200000, paidCount: 2, unpaidAmt: 400000, byVenue: [{ name: '드림에듀 아트센터', count: 3, revenue: 900000 }, { name: '본관 대강당', count: 2, revenue: 300000 }] } };
  return { ok: true, data: {} };
}

function getDummyVenues() {
  return [
    { id: 'v1', building: '드림에듀관', name: '드림에듀 아트센터', type: '아트센터', capacity: 200, halfDayAmt: 0, fullDayAmt: 0, active: true, personRates: [{ minPerson: 1, maxPerson: 5, halfDay: 80000, fullDay: 150000 }, { minPerson: 6, maxPerson: 10, halfDay: 120000, fullDay: 200000 }, { minPerson: 11, maxPerson: 0, halfDay: 180000, fullDay: 300000 }] },
    { id: 'v2', building: '본관', name: '대강당', type: '강당', capacity: 500, halfDayAmt: 300000, fullDayAmt: 500000, active: true },
    { id: 'v3', building: '본관', name: '대회의실', type: '회의실', capacity: 50, halfDayAmt: 100000, fullDayAmt: 180000, active: true },
  ];
}

function getDummyRequests() {
  return [
    { id: 'r1', reqId: 'RQ-20260601-001', orgName: '한국항공대학교', contactName: '김민준', contactPhone: '010-1234-5678', contactEmail: 'test@example.com', building: '드림에듀관', venueName: '드림에듀 아트센터', useDate: '2026-07-15', startTime: '10:00', endTime: '18:00', persons: 80, purpose: '학술행사', baseAmt: 300000, surchargeAmt: 0, techFee: 0, totalAmt: 300000, finalAmt: 300000, status: 'REQUESTED', requestedAt: '2026-06-01', scheduleHistory: [{ schedId: 's1', type: 'original', date: '2026-07-15', startTime: '10:00', endTime: '18:00', amt: 300000 }] },
    { id: 'r2', reqId: 'RQ-20260602-002', orgName: '서울관광재단', contactName: '이지연', contactPhone: '010-9876-5432', contactEmail: 'lee@example.com', building: '본관', venueName: '대강당', useDate: '2026-08-01', startTime: '09:00', endTime: '17:00', persons: 300, purpose: '채용박람회', baseAmt: 500000, surchargeAmt: 0, techFee: 50000, totalAmt: 550000, finalAmt: 550000, status: 'APPROVED', requestedAt: '2026-06-01', approvedAt: '2026-06-02', scheduleHistory: [] },
  ];
}

// ─────────────────────────────────────────
//  유틸
// ─────────────────────────────────────────
function fmtMoney(n) {
  return Number(n || 0).toLocaleString('ko-KR');
}

function formatDate(str) {
  if (!str) return '';
  return str.replace(/-/g, '.').substring(0, 10);
}

function formatDateTime(str) {
  if (!str) return '';
  return str.replace('T', ' ').substring(0, 16);
}

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

function statusLabel(s) {
  const map = {
    QUOTE_ISSUED: '견적 발행', REQUESTED: '예약 요청', APPROVED: '승인', REJECTED: '거절',
    CANCELLED: '취소', IN_USE: '사용 중', COMPLETED: '완료', INVOICED: '계산서', PAID: '입금 완료'
  };
  return map[s] || s;
}

function schedTypeLabel(t) {
  return { original: '최초', added: '추가됨', removed: '제외됨', modified: '변경됨' }[t] || t;
}

function schedTypeColor(t) {
  return { original: '#1a3c6e', added: '#0a7c42', removed: '#c0392b', modified: '#e67e22' }[t] || '#555';
}

function showToast(msg, duration = 3000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, duration);
}

// 페이지 로드
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginPw').focus();
});
