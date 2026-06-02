var GAS_URL = 'https://script.google.com/macros/s/AKfycbwW8RSbV5TxS-vqn4GorB74q2fjPMPonqTshza1pdqLNi55sHjrx3SkgcQ7LVp-ogs-wA/exec';

// ─── 전역 상태 ──────────────────────────────────
var allVenues = [];
var settings  = {};
var selectedVenue = null;
var selectedDocTitle = '대관료 견적서';
var activeDocBtn = 'docBtn1';
var bizFileData = { type: '', data: '', name: '' };
var bizMode = 'file';

// ─── 초기화 ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var today = new Date().toISOString().split('T')[0];
  document.getElementById('useDate').value = today;
  loadData();
});

function loadData() {
  Promise.all([
    fetch(GAS_URL + '?action=getVenues').then(function(r) { return r.json(); }),
    fetch(GAS_URL + '?action=getSettings').then(function(r) { return r.json(); })
  ]).then(function(results) {
    if (results[0].success) allVenues = results[0].venues;
    if (results[1].success) settings  = results[1].settings;
    renderPricingTable();
    renderBuildingSelector();
    updateFootnote();
  }).catch(function() {
    showAlert('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.', 'error');
    renderPricingTable(); // 기본 데이터 없이 빈 테이블이라도 표시
  });
}

// ─── 탭 전환 ─────────────────────────────────────
function switchMainTab(tab) {
  document.getElementById('sectionRate').style.display = tab === 'rate' ? '' : 'none';
  document.getElementById('sectionBook').style.display = tab === 'book' ? '' : 'none';
  document.getElementById('tabRate').className = 'tab-btn' + (tab === 'rate' ? ' tab-active' : '');
  document.getElementById('tabBook').className = 'tab-btn' + (tab === 'book' ? ' tab-active' : '');
}

// ─── 표준 대관료 테이블 렌더 ─────────────────────
function renderPricingTable() {
  var tbody = document.getElementById('rateTableBody');
  if (!allVenues.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;font-weight:300;color:#a0aec0">시설 정보를 불러올 수 없습니다.</td></tr>';
    return;
  }

  var buildings = {};
  allVenues.forEach(function(v) {
    if (!buildings[v.building]) buildings[v.building] = [];
    buildings[v.building].push(v);
  });

  var html = '';
  Object.keys(buildings).forEach(function(bname) {
    var bVenues = buildings[bname];
    var totalRows = 0;
    bVenues.forEach(function(v) {
      totalRows += (v.personRates && v.personRates.length > 0) ? v.personRates.length : 1;
    });

    var bFirst = true;
    bVenues.forEach(function(v) {
      var rows = (v.personRates && v.personRates.length > 0) ? v.personRates : [null];
      rows.forEach(function(pr, pi) {
        html += '<tr data-vid="' + v.id + '">';
        if (bFirst && pi === 0) {
          html += '<td class="building-cell" rowspan="' + totalRows + '">' + bname + '</td>';
          bFirst = false;
        }
        if (pi === 0) {
          html += '<td rowspan="' + rows.length + '" style="font-weight:500">' + v.floor + '</td>';
          html += '<td rowspan="' + rows.length + '">';
          html += '<span style="font-weight:700">' + v.name + '</span>';
          if (v.isNew) html += ' <span class="badge badge-new">신규</span>';
          if (v.staffRequired) html += ' <span class="badge badge-staff">관리인원 상주</span>';
          if (v.area > 0) html += '<span class="rate-note">' + v.area + '평</span>';
          html += '</td>';
          html += '<td rowspan="' + rows.length + '" style="font-weight:500">' + (v.area > 0 ? v.area + '평' : '-') + '</td>';
        }
        if (v.separate) {
          if (pi === 0) {
            html += '<td colspan="2"><span class="badge badge-sep">별도협의</span></td>';
            html += '<td style="font-weight:300;font-size:0.76rem;">' + (v.notes || '') + '</td>';
          }
        } else if (pr) {
          html += '<td><span class="rate-amount">' + fmtMoney(pr.rate) + '원</span>';
          html += '<span class="rate-note">' + pr.rangeLabel + '</span></td>';
          html += '<td><span class="rate-amount">' + fmtMoney(pr.techFee) + '원</span></td>';
          html += '<td style="font-weight:300;font-size:0.76rem;">' + (v.notes || '') + '</td>';
        } else {
          var rateDisplay = v.baseRate > 0 ? '<span class="rate-amount">' + fmtMoney(v.baseRate) + '원</span>' : '<span class="badge badge-sep">미정/협의</span>';
          var techDisplay = v.techFee > 0  ? '<span class="rate-amount">' + fmtMoney(v.techFee) + '원</span>' : '-';
          html += '<td>' + rateDisplay + '</td>';
          html += '<td>' + techDisplay + '</td>';
          html += '<td style="font-weight:300;font-size:0.76rem;">' + (v.notes || '') + '</td>';
        }
        html += '</tr>';
      });
    });
  });
  tbody.innerHTML = html;
  setupTableHover(tbody);
}

function setupTableHover(tbody) {
  tbody.querySelectorAll('tr[data-vid]').forEach(function(row) {
    row.addEventListener('mouseenter', function() {
      var vid = this.dataset.vid;
      tbody.querySelectorAll('tr[data-vid="' + vid + '"]').forEach(function(r) {
        r.classList.add('venue-hover');
      });
    });
    row.addEventListener('mouseleave', function() {
      var vid = this.dataset.vid;
      tbody.querySelectorAll('tr[data-vid="' + vid + '"]').forEach(function(r) {
        r.classList.remove('venue-hover');
      });
    });
  });
}

function updateFootnote() {
  var rate = settings.SURCHARGE_RATE || 30;
  var start = settings.BIZ_START || 9;
  var end   = settings.BIZ_END   || 18;
  var full  = settings.FULL_DAY_HOURS || 6;
  document.getElementById('rateFootnote').innerHTML =
    '<b>※ 이용 시간:</b> 평일 0' + start + ':00~' + end + ':00 (기본)<br>' +
    '<b>※ ' + full + '시간 이상</b> 사용 시 평일 종일 대관료로 산정 (' + String(start).padStart(2,'0') + ':00~' + String(end).padStart(2,'0') + ':00 기준)<br>' +
    '<b>※ 공휴일 및 시간 외(' + end + ':00 이후, 0' + start + ':00 이전)</b> 사용 시 기본 요금의 <b>' + rate + '%</b> 할증 적용<br>' +
    '<b>※ 기술관리비:</b> 시설 이용 1회당 별도 부과 (시간 무관)<br>' +
    '<b>※ 부가세 면세</b> 사업장으로, 모든 금액은 공급가 기준입니다.';
}

// ─── 건물 선택 버튼 렌더 ─────────────────────────
function renderBuildingSelector() {
  var buildings = [];
  allVenues.forEach(function(v) {
    if (buildings.indexOf(v.building) === -1) buildings.push(v.building);
  });
  var wrap = document.getElementById('buildingSelector');
  wrap.innerHTML = buildings.map(function(b) {
    return '<button class="building-btn" onclick="selectBuilding(\'' + b.replace(/'/g, "\\'") + '\")">' + b + '</button>';
  }).join('');
}

function selectBuilding(bname) {
  document.querySelectorAll('.building-btn').forEach(function(b) { b.classList.remove('active'); });
  event.target.classList.add('active');

  var venues = allVenues.filter(function(v) { return v.building === bname; });
  var grid = document.getElementById('venueGrid');
  grid.innerHTML = venues.map(function(v) {
    var priceText = v.separate
      ? '별도협의'
      : v.personRates && v.personRates.length
        ? v.personRates[0].rate.toLocaleString() + '원~'
        : v.baseRate > 0 ? v.baseRate.toLocaleString() + '원/2시간' : '단가 미정';
    return '<div class="venue-card' + (v.separate ? ' separate' : '') + '" ' +
      (v.separate ? '' : 'onclick="selectVenue(' + v.id + ')"') +
      ' data-id="' + v.id + '">' +
      '<div class="vc-name">' + v.name + (v.isNew ? ' <span class="badge badge-new">신규</span>' : '') + '</div>' +
      '<div class="vc-floor">' + v.floor + (v.area > 0 ? ' · ' + v.area + '평' : '') + (v.staffRequired ? ' · 관리인원상주' : '') + '</div>' +
      '<div class="vc-price">' + priceText + (v.techFee > 0 ? ' + 기술관리비 ' + v.techFee.toLocaleString() + '원' : '') + '</div>' +
      (v.separate ? '<div style="font-size:0.72rem;font-weight:300;color:#a05800;margin-top:4px;">☎ 010-2055-5883으로 문의</div>' : '') +
      '</div>';
  }).join('');
}

function selectVenue(id) {
  document.querySelectorAll('.venue-card').forEach(function(c) { c.classList.remove('selected'); });
  var card = document.querySelector('.venue-card[data-id="' + id + '"]');
  if (card) card.classList.add('selected');
  selectedVenue = allVenues.find(function(v) { return v.id == id; });
  updatePriceCalc();
}

// ─── 금액 계산 ────────────────────────────────────
function updatePriceCalc() {
  var priceBox  = document.getElementById('priceBox');
  var sepBox    = document.getElementById('separateBox');
  priceBox.style.display = 'none';
  sepBox.style.display   = 'none';

  if (!selectedVenue) return;
  if (selectedVenue.separate) { sepBox.style.display = ''; return; }

  var dateVal  = document.getElementById('useDate').value;
  var startVal = document.getElementById('startTime').value;
  var endVal   = document.getElementById('endTime').value;
  var persons  = parseInt(document.getElementById('persons').value) || 0;
  if (!dateVal || !startVal || !endVal) return;

  var startDT = new Date(dateVal + 'T' + startVal);
  var endDT   = new Date(dateVal + 'T' + endVal);
  if (endDT <= startDT) return;

  var hours       = (endDT - startDT) / 3600000;
  var bizStart    = parseInt(settings.BIZ_START || 9);
  var bizEnd      = parseInt(settings.BIZ_END   || 18);
  var fullDayHrs  = parseInt(settings.FULL_DAY_HOURS || 6);
  var surchargeRt = parseInt(settings.SURCHARGE_RATE || 30) / 100;

  // 요금 산출
  var rate = getApplicableRate(selectedVenue, persons);
  var basePerSlot = rate.baseRate;
  var techFee     = rate.techFee;

  var slots, baseTotal;
  if (hours >= fullDayHrs) {
    slots     = fullDayHrs / 2;
    baseTotal = basePerSlot * slots;
  } else {
    slots     = Math.ceil(hours / 2);
    baseTotal = basePerSlot * slots;
  }

  // 할증 여부 판단
  var startH = startDT.getHours() + startDT.getMinutes() / 60;
  var endH   = endDT.getHours()   + endDT.getMinutes()   / 60;
  var isHoliday = isHolidayOrWeekend(startDT);
  var isOutside = startH < bizStart || endH > bizEnd;
  var needSurcharge = isHoliday || isOutside;
  var surchargeAmt  = needSurcharge ? Math.round(baseTotal * surchargeRt) : 0;
  var total = baseTotal + surchargeAmt + techFee;

  // 표시
  priceBox.style.display = '';
  var baseLabel = '기본 대관료 (' + (hours >= fullDayHrs ? '종일 ' + fullDayHrs + 'h' : slots + '슬롯 · ' + hours.toFixed(1) + 'h') + ')';
  document.getElementById('baseLabel').textContent  = baseLabel;
  document.getElementById('baseAmount').textContent = fmtMoney(baseTotal) + '원';
  document.getElementById('techFeeAmount').textContent = fmtMoney(techFee) + '원';
  document.getElementById('totalAmount').textContent   = fmtMoney(total) + '원';

  var surRow = document.getElementById('surchargeRow');
  var surWarn = document.getElementById('surchargeWarn');
  if (needSurcharge) {
    surRow.style.display = '';
    document.getElementById('surchargeAmount').textContent = fmtMoney(surchargeAmt) + '원';
    surWarn.style.display = '';
    surWarn.textContent = isHoliday ? '⚠ 공휴일·주말 적용 — 기본료의 ' + (surchargeRt * 100) + '% 할증'
                                    : '⚠ 시간외 사용 적용 — 기본료의 ' + (surchargeRt * 100) + '% 할증';
  } else {
    surRow.style.display = 'none';
    surWarn.style.display = 'none';
  }

  var note = '';
  if (rate.rangeLabel) note += '인원 기준: ' + rate.rangeLabel + ' | ';
  note += '슬롯당 단가: ' + fmtMoney(basePerSlot) + '원 (기본 2시간 기준)';
  document.getElementById('priceNote').textContent = note;
}

function getApplicableRate(venue, persons) {
  if (venue.personRates && venue.personRates.length > 0) {
    for (var i = 0; i < venue.personRates.length; i++) {
      var pr = venue.personRates[i];
      if (persons >= (pr.min || 0) && persons <= (pr.max || 999)) {
        return { baseRate: pr.rate, techFee: pr.techFee, rangeLabel: pr.rangeLabel };
      }
    }
    var last = venue.personRates[venue.personRates.length - 1];
    return { baseRate: last.rate, techFee: last.techFee, rangeLabel: last.rangeLabel };
  }
  return { baseRate: venue.baseRate, techFee: venue.techFee, rangeLabel: '' };
}

function isHolidayOrWeekend(date) {
  var d = date.getDay();
  return d === 0 || d === 6;
}

// ─── 위저드 단계 이동 ────────────────────────────
function goStep2() {
  if (!selectedVenue) { showAlert('시설을 선택해주세요.', 'error'); return; }
  if (selectedVenue.separate) { showAlert('별도협의 시설은 담당자에게 직접 연락해주세요.', 'error'); return; }
  if (!document.getElementById('useDate').value)  { showAlert('사용 날짜를 입력해주세요.', 'error'); return; }
  if (!document.getElementById('persons').value)  { showAlert('인원을 입력해주세요.', 'error'); return; }
  if (!document.getElementById('purpose').value)  { showAlert('사용 목적을 입력해주세요.', 'error'); return; }
  showStep(2);
}

function goStep1() { showStep(1); }

function goStep3() {
  if (!document.getElementById('orgName').value)     { showAlert('기관명을 입력해주세요.', 'error'); return; }
  if (!document.getElementById('managerName').value) { showAlert('담당자명을 입력해주세요.', 'error'); return; }
  if (!document.getElementById('managerTel').value)  { showAlert('연락처를 입력해주세요.', 'error'); return; }
  if (!document.getElementById('managerEmail').value){ showAlert('이메일을 입력해주세요.', 'error'); return; }
  renderQuoteSummary();
  showStep(3);
}

function goStep2Back() { showStep(2); }

function showStep(n) {
  document.getElementById('step1').style.display = n === 1 ? '' : 'none';
  document.getElementById('step2').style.display = n === 2 ? '' : 'none';
  document.getElementById('step3').style.display = n === 3 ? '' : 'none';
  ['ws1','ws2','ws3'].forEach(function(id, i) {
    var el = document.getElementById(id);
    el.className = 'wizard-step' + (i + 1 === n ? ' active' : i + 1 < n ? ' done' : '');
  });
  window.scrollTo(0, 0);
}

// ─── 견적 요약 렌더 ──────────────────────────────
function renderQuoteSummary() {
  var calc = getCalcValues();
  var html = '<div class="detail-grid">' +
    '<div class="detail-item"><div class="di-lbl">기관명</div><div class="di-val">' + document.getElementById('orgName').value + '</div></div>' +
    '<div class="detail-item"><div class="di-lbl">담당자</div><div class="di-val">' + document.getElementById('managerName').value + '</div></div>' +
    '<div class="detail-item"><div class="di-lbl">시설</div><div class="di-val">' + selectedVenue.building + ' ' + selectedVenue.name + '</div></div>' +
    '<div class="detail-item"><div class="di-lbl">일시</div><div class="di-val">' + document.getElementById('useDate').value + ' ' + document.getElementById('startTime').value + '~' + document.getElementById('endTime').value + '</div></div>' +
    '<div class="detail-item"><div class="di-lbl">인원</div><div class="di-val">' + document.getElementById('persons').value + '명</div></div>' +
    '<div class="detail-item"><div class="di-lbl">문서 제목</div><div class="di-val">' + getDocTitle() + '</div></div>' +
    '</div>' +
    '<div style="margin-top:14px;padding:12px 16px;background:#edf2f8;border-radius:10px;">' +
    '<div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px;"><span style="font-weight:300">기본 대관료</span><span style="font-weight:500">' + fmtMoney(calc.base) + '원</span></div>' +
    (calc.surcharge > 0 ? '<div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px;"><span style="font-weight:300">할증료</span><span style="font-weight:500">' + fmtMoney(calc.surcharge) + '원</span></div>' : '') +
    '<div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:8px;"><span style="font-weight:300">기술관리비</span><span style="font-weight:500">' + fmtMoney(calc.techFee) + '원</span></div>' +
    '<div style="display:flex;justify-content:space-between;font-weight:700;font-size:1rem;color:#1e3a5f;border-top:1px solid #c5d8f5;padding-top:8px;"><span>합계 (VAT 면세)</span><span>' + fmtMoney(calc.total) + '원</span></div>' +
    '</div>';
  document.getElementById('quoteSummary').innerHTML = html;
}

function getCalcValues() {
  var base = 0, surcharge = 0, techFee = 0;
  var ba = document.getElementById('baseAmount');
  var sa = document.getElementById('surchargeAmount');
  var ta = document.getElementById('techFeeAmount');
  var tot = document.getElementById('totalAmount');
  if (ba) base     = parseInt((ba.textContent || '0').replace(/[^0-9]/g, '')) || 0;
  if (sa && document.getElementById('surchargeRow').style.display !== 'none')
    surcharge = parseInt((sa.textContent || '0').replace(/[^0-9]/g, '')) || 0;
  if (ta) techFee  = parseInt((ta.textContent || '0').replace(/[^0-9]/g, '')) || 0;
  if (tot) {
    var totalStr = (tot.textContent || '0').replace(/[^0-9]/g, '');
    return { base: base, surcharge: surcharge, techFee: techFee, total: parseInt(totalStr) || (base + surcharge + techFee) };
  }
  return { base: base, surcharge: surcharge, techFee: techFee, total: base + surcharge + techFee };
}

function getDocTitle() {
  if (selectedDocTitle === 'custom') {
    return document.getElementById('customTitle').value || '대관료 견적서';
  }
  return selectedDocTitle;
}

// ─── 문서 제목 선택 ──────────────────────────────
function selectDocTitle(title, btnId) {
  selectedDocTitle = title;
  activeDocBtn = btnId;
  document.querySelectorAll('#docBtn1,#docBtn2,#docBtn3').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById(btnId).classList.add('active');
  document.getElementById('customTitleWrap').style.display = title === 'custom' ? '' : 'none';
}

// ─── 사업자 탭 ────────────────────────────────────
function switchBizTab(mode) {
  bizMode = mode;
  document.querySelectorAll('.biz-tab').forEach(function(b) { b.classList.remove('active'); });
  event.target.classList.add('active');
  document.querySelectorAll('.biz-tab-content').forEach(function(c) { c.classList.remove('active'); });
  document.getElementById('bizTab' + mode.charAt(0).toUpperCase() + mode.slice(1)).classList.add('active');
}

function handleBizFileUpload(event) {
  var file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showAlert('파일 크기는 2MB 이하여야 합니다.', 'error'); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    bizFileData = { type: file.type, data: e.target.result, name: file.name };
    var preview = document.getElementById('bizFilePreview');
    if (file.type.startsWith('image/')) {
      preview.innerHTML = '<img src="' + e.target.result + '" class="biz-preview-img" alt="사업자등록증">';
    } else {
      preview.innerHTML = '<div class="file-chip">📄 ' + file.name + '</div>';
    }
  };
  reader.readAsDataURL(file);
}

// ─── 텍스트 문서 생성 ────────────────────────────
function buildTextDoc() {
  var calc   = getCalcValues();
  var title  = getDocTitle();
  var org    = document.getElementById('orgName').value;
  var mgr    = document.getElementById('managerName').value;
  var tel    = document.getElementById('managerTel').value;
  var email  = document.getElementById('managerEmail').value;
  var date   = document.getElementById('useDate').value;
  var start  = document.getElementById('startTime').value;
  var end    = document.getElementById('endTime').value;
  var persons= document.getElementById('persons').value;
  var purpose= document.getElementById('purpose').value;
  var now    = new Date().toLocaleDateString('ko-KR');
  var s = settings;

  var line = '─'.repeat(48);
  var text = '';
  text += '  ' + (s.ISSUER_NAME || '(재)아세아항공직업전문학교') + '\n';
  text += '\n';
  text += '         【 ' + title + ' 】\n';
  text += '\n';
  text += line + '\n';
  text += '  발 행 일: ' + now + '          발행번호: ' + new Date().getTime().toString().slice(-8) + '\n';
  text += line + '\n';
  text += '\n';
  text += '■ 수신처\n';
  text += '  기 관 명: ' + org + '\n';
  text += '  담 당 자: ' + mgr + '\n';
  text += '  연 락 처: ' + tel + '   이메일: ' + email + '\n';
  text += '\n';
  text += '■ 대관 내용\n';
  text += '  시    설: ' + selectedVenue.building + ' ' + selectedVenue.floor + ' ' + selectedVenue.name + (selectedVenue.area > 0 ? ' (' + selectedVenue.area + '평)' : '') + '\n';
  text += '  사 용 일: ' + date + '\n';
  text += '  사용시간: ' + start + ' ~ ' + end + '\n';
  text += '  인    원: ' + persons + '명\n';
  text += '  사용목적: ' + purpose + '\n';
  text += '\n';
  text += '■ 요금 내역 (부가세 면세)\n';
  text += line + '\n';
  text += '  항  목              금  액\n';
  text += line + '\n';
  text += '  기본 대관료         ' + fmtMoney(calc.base) + '원\n';
  if (calc.surcharge > 0)
    text += '  시간외·공휴일 할증  ' + fmtMoney(calc.surcharge) + '원\n';
  text += '  기술관리비          ' + fmtMoney(calc.techFee) + '원\n';
  text += line + '\n';
  text += '  합     계           ' + fmtMoney(calc.total) + '원\n';
  text += line + '\n';
  text += '\n';
  text += '■ 입금 계좌\n';
  text += '  ' + (s.ISSUER_ACCOUNT || 'IBK기업 (재)아세아항공직업전문학교 025-049131-04-042') + '\n';
  text += '\n';
  text += '■ 주요 안내사항\n';
  text += '  · 본 ' + title + '의 유효기간은 발행일로부터 ' + (s.QUOTE_VALIDITY || 7) + '일입니다.\n';
  text += '  · 공휴일 및 평일 09:00 이전·18:00 이후 사용 시 할증 요금이 적용됩니다.\n';
  text += '  · 대관 확정은 담당자 승인 후 최종 안내됩니다.\n';
  text += '\n';
  text += line + '\n';
  text += '  ' + (s.ISSUER_NAME || '(재)아세아항공직업전문학교') + '\n';
  text += '  사업자번호: ' + (s.ISSUER_BIZ_NO || '106-82-06370') + '\n';
  text += '  주소: ' + (s.ISSUER_ADDR || '서울특별시 영등포구 당산로32길 16') + '\n';
  text += '  담당: ' + (s.MANAGER_NAME || '방시원') + ' ' + (s.MANAGER_TITLE || '차장') + '\n';
  text += '        ' + (s.MANAGER_TEL || '010-2055-5883') + '   ' + (s.MANAGER_EMAIL || 'bangsw@asea.or.kr') + '\n';
  text += line + '\n';
  return text;
}

function showTextDoc() {
  var text = buildTextDoc();
  document.getElementById('textDocContent').textContent = text;
  document.getElementById('textModalTitle').textContent = getDocTitle();
  openModal('textModal');
}

function copyDocText() {
  var text = buildTextDoc();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      showAlert('클립보드에 복사되었습니다.', 'success');
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showAlert('클립보드에 복사되었습니다.', 'success');
  }
}

function sendEmailWithDoc() {
  var text  = buildTextDoc();
  var title = getDocTitle();
  var org   = document.getElementById('orgName').value;
  var s     = settings;
  var subject = encodeURIComponent('[아세아항공] ' + title + ' - ' + org);
  var body    = encodeURIComponent(
    '안녕하세요, ' + org + ' ' + document.getElementById('managerName').value + '님.\n\n' +
    '요청하신 ' + title + '를 안내드립니다.\n\n' + text + '\n\n' +
    '문의사항은 담당자에게 연락 주세요.\n\n' +
    (s.MANAGER_NAME || '방시원') + ' ' + (s.MANAGER_TITLE || '차장') + '\n' +
    (s.MANAGER_TEL || '010-2055-5883') + ' | ' + (s.MANAGER_EMAIL || 'bangsw@asea.or.kr')
  );
  var mgEmail = document.getElementById('managerEmail').value;
  window.location.href = 'mailto:' + mgEmail + '?subject=' + subject + '&body=' + body;
}

// ─── PDF 생성 ─────────────────────────────────────
function generateAndDownloadPDF() {
  var calc  = getCalcValues();
  var title = getDocTitle();
  var org   = document.getElementById('orgName').value;
  var mgr   = document.getElementById('managerName').value;
  var tel   = document.getElementById('managerTel').value;
  var email = document.getElementById('managerEmail').value;
  var date  = document.getElementById('useDate').value;
  var start = document.getElementById('startTime').value;
  var end   = document.getElementById('endTime').value;
  var persons = document.getElementById('persons').value;
  var purpose = document.getElementById('purpose').value;
  var s     = settings;
  var now   = new Date().toLocaleDateString('ko-KR');
  var docNo = 'AHK-' + new Date().getTime().toString().slice(-8);

  // 발행처 정보 채우기
  document.getElementById('pt-issuerName').textContent = s.ISSUER_NAME || '(재)아세아항공직업전문학교';
  document.getElementById('pt-issuerDetail').innerHTML =
    '대표: ' + (s.ISSUER_REP || '전영숙') + '&nbsp;&nbsp;|&nbsp;&nbsp;' +
    '사업자번호: ' + (s.ISSUER_BIZ_NO || '106-82-06370') + '<br>' +
    (s.ISSUER_ADDR || '서울특별시 영등포구 당산로32길 16');
  document.getElementById('pt-docNo').innerHTML = '발행일: ' + now + '<br>문서번호: ' + docNo;
  document.getElementById('pt-title').textContent = title;

  // 메타 정보
  document.getElementById('pt-meta').innerHTML =
    '<div class="pdf-meta-cell"><span class="pm-label">수신 기관</span><span class="pm-val">' + org + '</span></div>' +
    '<div class="pdf-meta-cell"><span class="pm-label">담당자</span><span class="pm-val">' + mgr + '</span></div>' +
    '<div class="pdf-meta-cell"><span class="pm-label">연락처</span><span class="pm-val">' + tel + '</span></div>' +
    '<div class="pdf-meta-cell"><span class="pm-label">이메일</span><span class="pm-val">' + email + '</span></div>';

  // 테이블
  var rate = getApplicableRate(selectedVenue, parseInt(persons) || 0);
  var hours = calcHours(start, end);
  var fullDayHrs = parseInt(s.FULL_DAY_HOURS || 6);
  var slots = hours >= fullDayHrs ? fullDayHrs / 2 : Math.ceil(hours / 2);

  document.getElementById('pt-tbody').innerHTML =
    '<tr>' +
    '<td>' + selectedVenue.building + ' ' + selectedVenue.name + '</td>' +
    '<td class="tc">' + date + ' ' + start + '~' + end + '</td>' +
    '<td class="tc">' + hours.toFixed(1) + 'h</td>' +
    '<td class="tr">' + fmtMoney(rate.baseRate) + '원</td>' +
    '<td class="tc">' + slots + '슬롯</td>' +
    '<td class="tr">' + fmtMoney(calc.base) + '원</td>' +
    '</tr>' +
    (calc.surcharge > 0 ?
      '<tr><td colspan="5">시간외·공휴일 할증 (' + (s.SURCHARGE_RATE || 30) + '%)</td><td class="tr">' + fmtMoney(calc.surcharge) + '원</td></tr>' : '') +
    '<tr><td colspan="5">기술관리비</td><td class="tr">' + fmtMoney(calc.techFee) + '원</td></tr>';

  document.getElementById('pt-tfoot').innerHTML =
    '<tr class="grand-total">' +
    '<td colspan="5" style="font-weight:700">합 계 (부가세 면세)</td>' +
    '<td class="tr" style="font-weight:700;font-size:12px;">' + fmtMoney(calc.total) + '원</td>' +
    '</tr>';

  document.getElementById('pt-account').innerHTML =
    '<div class="pa-lbl">입금 계좌 정보</div>' +
    '<div class="pa-val">' + (s.ISSUER_ACCOUNT || 'IBK기업 (재)아세아항공직업전문학교 025-049131-04-042') + '</div>';

  document.getElementById('pt-note').innerHTML =
    '<b>※ 이용 시간:</b> 평일 09:00~18:00 &nbsp;|&nbsp; <b>※ 유효기간:</b> 발행일로부터 ' + (s.QUOTE_VALIDITY || 7) + '일<br>' +
    '<b>※ 공휴일 및 시간 외</b> 사용 시 별도 할증 적용 &nbsp;|&nbsp; <b>※ 부가세 면세</b> — 공급가액 = 결제금액';

  document.getElementById('pt-manager').innerHTML =
    '<div class="pdf-manager-box">' +
    '<div class="pm-name">' + (s.MANAGER_NAME || '방시원') + ' ' + (s.MANAGER_TITLE || '차장') + '</div>' +
    '<div class="pm-detail">' + (s.MANAGER_TEL || '010-2055-5883') + '<br>' + (s.MANAGER_EMAIL || 'bangsw@asea.or.kr') + '</div>' +
    '</div>';

  // 폰트 로드 후 캡처
  document.fonts.ready.then(function() {
    var tmpl = document.getElementById('pdfTemplate');
    tmpl.style.top = '0';
    tmpl.style.left = '0';
    tmpl.style.zIndex = '9999';
    tmpl.style.position = 'absolute';

    html2canvas(tmpl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }).then(function(canvas) {
      tmpl.style.top = '-9999px';
      tmpl.style.left = '-9999px';
      tmpl.style.zIndex = '-1';
      tmpl.style.position = 'fixed';

      var imgData = canvas.toDataURL('image/png');
      var h = canvas.height * 210 / canvas.width;
      var pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, 210, Math.min(h, 297));

      var org2   = document.getElementById('orgName').value.replace(/\s/g, '');
      var fac    = selectedVenue.name.replace(/\s/g, '');
      var dateStr = date.replace(/-/g, '');
      pdf.save(org2 + '_' + fac + '_' + dateStr + '_' + title + '.pdf');
    }).catch(function(err) {
      tmpl.style.top = '-9999px'; tmpl.style.left = '-9999px';
      tmpl.style.zIndex = '-1'; tmpl.style.position = 'fixed';
      showAlert('PDF 생성 중 오류가 발생했습니다: ' + err.message, 'error');
    });
  });
}

// ─── 예약 요청 전송 ──────────────────────────────
function submitReservation() {
  var calc = getCalcValues();
  var date = document.getElementById('useDate').value;
  var s    = document.getElementById('startTime').value;
  var e    = document.getElementById('endTime').value;
  var rate = getApplicableRate(selectedVenue, parseInt(document.getElementById('persons').value) || 0);

  var bizText = '';
  if (bizMode === 'text') {
    bizText = [
      '사업자번호: ' + (document.getElementById('bizNo').value || ''),
      '법인번호: '   + (document.getElementById('corpNo').value || ''),
      '대표자: '     + (document.getElementById('bizRep').value || ''),
      '사업장주소: '  + (document.getElementById('bizAddr').value || ''),
      '계산서이메일: ' + (document.getElementById('billEmail').value || '')
    ].join(' | ');
  }

  var payload = {
    action: 'submitRequest',
    orgName: document.getElementById('orgName').value,
    managerName: document.getElementById('managerName').value,
    tel: document.getElementById('managerTel').value,
    email: document.getElementById('managerEmail').value,
    bizNo:    bizMode === 'text' ? (document.getElementById('bizNo').value || '') : '',
    corpNo:   bizMode === 'text' ? (document.getElementById('corpNo').value || '') : '',
    bizRep:   bizMode === 'text' ? (document.getElementById('bizRep').value || '') : '',
    bizAddr:  bizMode === 'text' ? (document.getElementById('bizAddr').value || '') : '',
    billEmail:bizMode === 'text' ? (document.getElementById('billEmail').value || '') : '',
    bizText:  bizText,
    bizFileType: bizMode === 'file' ? bizFileData.type : '',
    bizFileData: bizMode === 'file' ? bizFileData.data : '',
    venueId: selectedVenue.id, venueName: selectedVenue.name, building: selectedVenue.building,
    startDateTime: date + ' ' + s, endDateTime: date + ' ' + e,
    hours: calcHours(s, e),
    persons: parseInt(document.getElementById('persons').value) || 0,
    purpose: document.getElementById('purpose').value,
    baseRate: calc.base, techFee: calc.techFee, surcharge: calc.surcharge, totalAmount: calc.total,
    docTitle: getDocTitle(),
    remarks: document.getElementById('remarks').value || ''
  };

  var btn = document.getElementById('reserveBtn');
  btn.disabled = true;
  btn.textContent = '전송 중...';

  fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.success) {
        document.getElementById('reserveResult').innerHTML =
          '<span style="color:#1e7e34;font-weight:700">✅ 예약 요청이 접수되었습니다!</span><br>' +
          '<span style="font-weight:300">요청번호: ' + (res.requestId || '') + '<br>담당자 검토 후 ' +
          (document.getElementById('managerEmail').value || '이메일') + '으로 안내드립니다.</span>';
        btn.style.display = 'none';
      } else {
        showAlert(res.message || '요청 전송에 실패했습니다.', 'error');
        btn.disabled = false; btn.textContent = '📨 대관 예약 요청 전송';
      }
    }).catch(function() {
      showAlert('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      btn.disabled = false; btn.textContent = '📨 대관 예약 요청 전송';
    });
}

// ─── 유틸 ─────────────────────────────────────────
function calcHours(start, end) {
  var sp = start.split(':'); var ep = end.split(':');
  return ((parseInt(ep[0]) * 60 + parseInt(ep[1])) - (parseInt(sp[0]) * 60 + parseInt(sp[1]))) / 60;
}

function fmtMoney(n) { return parseInt(n || 0).toLocaleString('ko-KR'); }

function showAlert(msg, type) {
  var el = document.getElementById('alertBox');
  el.textContent = msg;
  el.className = 'alert ' + type;
  setTimeout(function() { el.className = 'alert'; }, 4000);
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
