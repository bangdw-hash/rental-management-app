// ===== 설정값 =====
var SPREADSHEET_ID    = 'YOUR_SPREADSHEET_ID';   // Google Sheets ID 교체
var TELEGRAM_BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
var TELEGRAM_CHAT_ID   = 'YOUR_TELEGRAM_CHAT_ID';
var ADMIN_PASSWORD     = 'admin1234';
// ==================

// ─── 시트 이름 ────────────────────────────────────
var SH_VENUES    = '대관시설목록';
var SH_REQUESTS  = '대관요청내역';
var SH_SCHEDULES = '대관일정이력';
var SH_LOG       = '대관공정로그';
var SH_SETTINGS  = '관리자설정';

// ─── 기본 설정값 ──────────────────────────────────
var DEFAULT_SETTINGS = {
  SURCHARGE_RATE:       '30',
  OFF_HOUR_RATE:        '30',
  FULL_DAY_HOURS:       '6',
  BIZ_START:            '9',
  BIZ_END:              '18',
  QUOTE_VALIDITY:       '7',
  ISSUER_NAME:          '(재)아세아항공직업전문학교',
  ISSUER_REP:           '전영숙',
  ISSUER_BIZ_NO:        '106-82-06370',
  ISSUER_CORP_NO:       '114222-0006574',
  ISSUER_ADDR:          '서울특별시 영등포구 당산로32길 16',
  ISSUER_ACCOUNT:       'IBK기업 (재)아세아항공직업전문학교 025-049131-04-042',
  MANAGER_NAME:         '방시원',
  MANAGER_TITLE:        '차장',
  MANAGER_TEL:          '010-2055-5883',
  MANAGER_EMAIL:        'bangsw@asea.or.kr',
  TELEGRAM_BOT_TOKEN:   '',
  TELEGRAM_CHAT_ID:     '',
  NOTIFICATION_EMAIL:   '',
  PARKING_NOTICE:       ''
};

// ─── 기본 시설 데이터 ─────────────────────────────
var DEFAULT_VENUES = [
  {building:'항공기술교육관', floor:'1층',   name:'드림에듀 아트센터', isNew:true,  area:60, baseRate:0,      techFee:0,      separate:false, staffRequired:false, notes:'인원별 차등 단가', personRates:'[{"rangeLabel":"1~5인","min":1,"max":5,"rate":50000,"techFee":50000},{"rangeLabel":"6~10인","min":6,"max":10,"rate":100000,"techFee":50000},{"rangeLabel":"10인 초과","min":11,"max":999,"rate":200000,"techFee":100000}]'},
  {building:'항공기술교육관', floor:'1층',   name:'회의실',           isNew:true,  area:8,  baseRate:40000,  techFee:50000,  separate:false, staffRequired:false, notes:''},
  {building:'항공기술교육관', floor:'1층',   name:'8인 사무실',       isNew:true,  area:12, baseRate:60000,  techFee:50000,  separate:false, staffRequired:false, notes:'최대 8인'},
  {building:'항공기술교육관', floor:'3층',   name:'강의실',           isNew:true,  area:20, baseRate:40000,  techFee:50000,  separate:false, staffRequired:false, notes:''},
  {building:'항공기술교육관', floor:'4층',   name:'강의실',           isNew:false, area:20, baseRate:40000,  techFee:50000,  separate:false, staffRequired:false, notes:''},
  {building:'서울캠퍼스',    floor:'1층',   name:'시뮬레이터A',       isNew:true,  area:12, baseRate:150000, techFee:100000, separate:false, staffRequired:true,  notes:'A320'},
  {building:'서울캠퍼스',    floor:'1층',   name:'시뮬레이터B',       isNew:true,  area:12, baseRate:150000, techFee:100000, separate:false, staffRequired:true,  notes:'B737'},
  {building:'서울캠퍼스',    floor:'1층',   name:'시뮬레이터C',       isNew:true,  area:8,  baseRate:80000,  techFee:100000, separate:false, staffRequired:false, notes:'세스나'},
  {building:'서울캠퍼스',    floor:'1층',   name:'비행기내모형',       isNew:false, area:15, baseRate:80000,  techFee:100000, separate:false, staffRequired:true,  notes:'관리인원 상주'},
  {building:'서울캠퍼스',    floor:'지하1층',name:'무도연습장',        isNew:true,  area:25, baseRate:0,      techFee:100000, separate:false, staffRequired:false, notes:'단가 미정'},
  {building:'서울캠퍼스',    floor:'지하1층',name:'체력단련장',        isNew:true,  area:20, baseRate:0,      techFee:100000, separate:true,  staffRequired:false, notes:'별도협의'},
  {building:'서울캠퍼스',    floor:'지하1층',name:'전자사격장',        isNew:true,  area:15, baseRate:0,      techFee:100000, separate:false, staffRequired:false, notes:'단가 미정'},
  {building:'서울캠퍼스',    floor:'4층',   name:'식음료실습실',       isNew:false, area:20, baseRate:80000,  techFee:100000, separate:false, staffRequired:true,  notes:'관리인원 상주'},
  {building:'서울캠퍼스',    floor:'건물',  name:'강의실',            isNew:false, area:20, baseRate:40000,  techFee:50000,  separate:false, staffRequired:false, notes:''},
  {building:'서울캠퍼스',    floor:'건물',  name:'실습실',            isNew:false, area:0,  baseRate:70000,  techFee:0,      separate:true,  staffRequired:false, notes:'계열실습실 및 전산실 등, 개별산이'}
];

// ─── 상태 코드 ────────────────────────────────────
var STATUS = {
  QUOTE_ISSUED: '견적발행',
  REQUESTED:    '예약요청',
  APPROVED:     '승인',
  REJECTED:     '반려',
  CANCELLED:    '취소',
  IN_USE:       '사용중',
  COMPLETED:    '사용완료',
  INVOICED:     '거래내역서발행',
  PAID:         '입금완료'
};

// ─── doGet 라우팅 ─────────────────────────────────
function doGet(e) {
  var action = e.parameter.action;
  if (action === 'getVenues')        return getVenues();
  if (action === 'getRequests')      return getRequests(e.parameter);
  if (action === 'getRequestDetail') return getRequestDetail(e.parameter.id);
  if (action === 'getSchedules')     return getSchedules(e.parameter.requestId);
  if (action === 'getLog')           return getLog(e.parameter.requestId);
  if (action === 'getSettings')      return getSettings();
  if (action === 'getReport')        return getReport(e.parameter);
  return jsonResponse({ success: true });
}

// ─── doPost 라우팅 ────────────────────────────────
function doPost(e) {
  var data;
  try { data = JSON.parse(e.postData.contents); }
  catch (err) { return jsonResponse({ success: false, message: '잘못된 요청' }); }

  var action = data.action;
  if (action === 'checkPassword')   return checkPassword(data);
  if (action === 'submitRequest')   return submitRequest(data);
  if (action === 'updateStatus')    return updateStatus(data);
  if (action === 'addSchedule')     return addSchedule(data);
  if (action === 'removeSchedule')  return removeSchedule(data);
  if (action === 'addVenue')        return addVenue(data);
  if (action === 'updateVenue')     return updateVenue(data);
  if (action === 'toggleVenue')     return toggleVenue(data);
  if (action === 'saveSettings')    return saveSettings(data);
  if (action === 'updateFinalAmt')  return updateFinalAmount(data);
  if (action === 'sendEmail')       return sendEmailAction(data);
  if (action === 'confirmRequest')  return confirmRequest(data);
  if (action === 'requestChange')   return requestChange(data);
  return jsonResponse({ success: false, message: '알 수 없는 요청' });
}

// ══════════════════════════════════════════════════
//  인증
// ══════════════════════════════════════════════════

function checkPassword(data) {
  return jsonResponse({ ok: data.password === ADMIN_PASSWORD });
}

// ══════════════════════════════════════════════════
//  공개 API
// ══════════════════════════════════════════════════

function getVenues() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SH_VENUES);
  if (!sheet || sheet.getLastRow() < 2) {
    sheet = initVenueSheet(ss);
  }
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 15).getValues();
  var venues = rows
    .filter(function(r) { return r[0] !== '' && r[13] !== '비활성'; })
    .map(function(r) {
      return {
        id: r[0], building: r[1], floor: r[2], name: r[3],
        isNew: r[4] === '신규', area: parseInt(r[5]) || 0,
        baseRate: parseInt(r[6]) || 0, techFee: parseInt(r[7]) || 0,
        separate: r[8] === 'TRUE' || r[8] === true,
        personRates: r[9] ? JSON.parse(r[9]) : [],
        staffRequired: r[10] === 'TRUE' || r[10] === true,
        notes: r[11] || '', active: r[13] !== '비활성'
      };
    });
  return jsonResponse({ success: true, venues: venues });
}

// ── 견적 요청 제출 (공개 폼) ──────────────────────
function submitRequest(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = getOrCreateSheet(ss, SH_REQUESTS, [
    '요청ID','타임스탬프','상태','기관명','담당자명','연락처','이메일',
    '사업자번호','법인번호','대표자','사업장주소','계산서이메일',
    '사업자정보텍스트','사업자정보파일타입','사업자정보파일데이터',
    '시설ID','시설명','건물','사용시작일시','사용종료일시','사용시간',
    '인원','사용목적','기본대관료','기술관리비','할증료','조정금액',
    '조정사유','총금액','문서제목','요청사항',
    '견적발행일','예약요청일','승인일','반려일',
    '사용시작일','사용완료일','거래내역발행일','계산서발행일','입금완료일',
    '관리자메모','최종총금액'
  ]);

  var ts = getKSTTimestamp();
  var reqId = 'REQ-' + new Date().getTime();

  sheet.appendRow([
    reqId, ts, 'QUOTE_ISSUED',
    data.orgName, data.managerName, data.tel, data.email,
    data.bizNo || '', data.corpNo || '', data.bizRep || '',
    data.bizAddr || '', data.billEmail || '',
    data.bizText || '', data.bizFileType || '', data.bizFileData || '',
    data.venueId, data.venueName, data.building,
    data.startDateTime, data.endDateTime, data.hours,
    data.persons, data.purpose,
    data.baseRate, data.techFee, data.surcharge, data.adjustment || 0,
    data.adjustReason || '', data.totalAmount,
    data.docTitle, data.remarks || '',
    ts, '', '', '', '', '', '', '', '', '', data.totalAmount
  ]);

  // 최초 일정 이력 등록
  addScheduleEntry(ss, reqId, 'original', data.startDateTime, data.endDateTime,
    data.hours, data.totalAmount, data.managerName + '(신청)', '최초 신청 일정');

  // 공정 로그
  addLogEntry(ss, reqId, 'QUOTE_ISSUED', '견적 발행 완료 - 총액: ' + formatMoney(data.totalAmount) + '원');

  // 텔레그램 알림
  sendTelegram('📋 *대관 예약 요청 접수*\n\n' +
    '🕐 ' + ts + '\n' +
    '🏢 기관: ' + data.orgName + '\n' +
    '👤 담당: ' + data.managerName + ' (' + data.tel + ')\n' +
    '📍 시설: ' + data.building + ' ' + data.venueName + '\n' +
    '📅 일시: ' + data.startDateTime + ' ~ ' + data.endDateTime + '\n' +
    '👥 인원: ' + data.persons + '명\n' +
    '💰 총금액: ' + formatMoney(data.totalAmount) + '원\n' +
    '📄 문서: ' + data.docTitle);

  return jsonResponse({ success: true, requestId: reqId, message: '예약 요청이 접수되었습니다.' });
}

// ══════════════════════════════════════════════════
//  관리자 API
// ══════════════════════════════════════════════════

function getRequests(params) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SH_REQUESTS);
  if (!sheet || sheet.getLastRow() < 2) return jsonResponse({ success: true, requests: [] });

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 42).getValues();
  var list = rows
    .filter(function(r) { return r[0] !== ''; })
    .map(function(r) { return rowToRequest(r); });

  if (params.status && params.status !== 'ALL') {
    list = list.filter(function(r) { return r.status === params.status; });
  }

  list.sort(function(a, b) { return b.timestamp.localeCompare(a.timestamp); });
  return jsonResponse({ success: true, requests: list });
}

function getRequestDetail(id) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SH_REQUESTS);
  if (!sheet) return jsonResponse({ success: false, message: '데이터 없음' });

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      return jsonResponse({ success: true, request: rowToRequest(rows[i]) });
    }
  }
  return jsonResponse({ success: false, message: '요청을 찾을 수 없습니다.' });
}

function rowToRequest(r) {
  return {
    id: r[0], timestamp: r[1], status: r[2],
    orgName: r[3], managerName: r[4], tel: r[5], email: r[6],
    bizNo: r[7], corpNo: r[8], bizRep: r[9], bizAddr: r[10], billEmail: r[11],
    bizText: r[12], bizFileType: r[13], bizFileData: r[14],
    venueId: r[15], venueName: r[16], building: r[17],
    startDateTime: r[18], endDateTime: r[19], hours: r[20],
    persons: r[21], purpose: r[22],
    baseRate: r[23], techFee: r[24], surcharge: r[25],
    adjustment: r[26], adjustReason: r[27], totalAmount: r[28],
    docTitle: r[29], remarks: r[30],
    quoteDate: r[31], requestDate: r[32], approvedDate: r[33],
    rejectedDate: r[34], startDate: r[35], completedDate: r[36],
    invoicedDate: r[37], billDate: r[38], paidDate: r[39],
    adminMemo: r[40], finalAmount: r[41]
  };
}

// ── 상태 업데이트 ─────────────────────────────────
function updateStatus(data) {
  if (data.password !== ADMIN_PASSWORD) return jsonResponse({ success: false, message: '비밀번호 오류' });
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SH_REQUESTS);
  if (!sheet) return jsonResponse({ success: false, message: '시트 없음' });

  var rows = sheet.getDataRange().getValues();
  var statusColMap = {
    REQUESTED: 33, APPROVED: 34, REJECTED: 35, IN_USE: 36,
    COMPLETED: 37, INVOICED: 38, PAID: 40
  };

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      sheet.getRange(i + 1, 3).setValue(data.status);
      var ts = getKSTTimestamp();
      if (statusColMap[data.status]) {
        sheet.getRange(i + 1, statusColMap[data.status]).setValue(ts);
      }
      if (data.memo) sheet.getRange(i + 1, 41).setValue(data.memo);
      if (data.finalAmount != null) sheet.getRange(i + 1, 42).setValue(data.finalAmount);

      addLogEntry(ss, data.id, data.status,
        STATUS[data.status] + (data.memo ? ' - ' + data.memo : ''));

      var statusMsg = STATUS[data.status] || data.status;
      sendTelegram('🔄 *대관 상태 변경*\n요청ID: ' + data.id + '\n기관: ' + rows[i][3] + '\n시설: ' + rows[i][16] + '\n상태: ' + statusMsg + (data.memo ? '\n메모: ' + data.memo : ''));

      return jsonResponse({ success: true, message: '상태가 변경되었습니다.' });
    }
  }
  return jsonResponse({ success: false, message: '요청을 찾을 수 없습니다.' });
}

// ── 최종 금액 업데이트 ────────────────────────────
function updateFinalAmount(data) {
  if (data.password !== ADMIN_PASSWORD) return jsonResponse({ success: false, message: '비밀번호 오류' });
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SH_REQUESTS);
  if (!sheet) return jsonResponse({ success: false, message: '시트 없음' });

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      if (data.adjustment != null)  sheet.getRange(i + 1, 27).setValue(data.adjustment);
      if (data.adjustReason != null) sheet.getRange(i + 1, 28).setValue(data.adjustReason);
      if (data.finalAmount != null)  sheet.getRange(i + 1, 42).setValue(data.finalAmount);
      addLogEntry(ss, data.id, 'AMOUNT_UPDATED', '금액 업데이트: ' + formatMoney(data.finalAmount) + '원');
      return jsonResponse({ success: true, message: '금액이 업데이트되었습니다.' });
    }
  }
  return jsonResponse({ success: false, message: '요청을 찾을 수 없습니다.' });
}

// ══════════════════════════════════════════════════
//  일정 이력 관리
// ══════════════════════════════════════════════════

function getSchedules(requestId) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SH_SCHEDULES);
  if (!sheet || sheet.getLastRow() < 2) return jsonResponse({ success: true, schedules: [] });

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
  var list = rows
    .filter(function(r) { return r[0] !== '' && r[1] === requestId; })
    .map(function(r) {
      return { id: r[0], requestId: r[1], timestamp: r[2], type: r[3],
        startDateTime: r[4], endDateTime: r[5], hours: r[6],
        amountEffect: r[7], by: r[8], memo: r[9] };
    });
  return jsonResponse({ success: true, schedules: list });
}

function addSchedule(data) {
  if (data.password !== ADMIN_PASSWORD) return jsonResponse({ success: false, message: '비밀번호 오류' });
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  addScheduleEntry(ss, data.requestId, data.type,
    data.startDateTime, data.endDateTime, data.hours,
    data.amountEffect, data.by || '관리자', data.memo || '');
  addLogEntry(ss, data.requestId, 'SCHEDULE_' + data.type.toUpperCase(),
    '일정 ' + (data.type === 'added' ? '추가' : data.type === 'removed' ? '제외' : '변경') +
    ': ' + data.startDateTime + ' ~ ' + data.endDateTime);
  return jsonResponse({ success: true, message: '일정 이력이 기록되었습니다.' });
}

function removeSchedule(data) {
  if (data.password !== ADMIN_PASSWORD) return jsonResponse({ success: false, message: '비밀번호 오류' });
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SH_SCHEDULES);
  if (!sheet) return jsonResponse({ success: false, message: '시트 없음' });

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.scheduleId) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, message: '일정이 삭제되었습니다.' });
    }
  }
  return jsonResponse({ success: false, message: '일정을 찾을 수 없습니다.' });
}

function addScheduleEntry(ss, requestId, type, startDT, endDT, hours, amountEffect, by, memo) {
  var sheet = getOrCreateSheet(ss, SH_SCHEDULES,
    ['이력ID','요청ID','타임스탬프','변경유형','시작일시','종료일시','시간수','금액영향','담당','메모']);
  var schedId = 'SCH-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
  sheet.appendRow([schedId, requestId, getKSTTimestamp(), type,
    startDT, endDT, hours, amountEffect || 0, by || '', memo || '']);
}

// ══════════════════════════════════════════════════
//  시설 관리 (관리자)
// ══════════════════════════════════════════════════

function addVenue(data) {
  if (data.password !== ADMIN_PASSWORD) return jsonResponse({ success: false, message: '비밀번호 오류' });
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = getOrCreateSheet(ss, SH_VENUES,
    ['시설ID','건물','위치','시설명','신규여부','면적(평)','기본단가','기술관리비','별도협의','인원별단가','관리인원상주','비고','수정일','활성여부','등록일']);

  var lastId = sheet.getLastRow() < 2 ? 0 : parseInt(sheet.getRange(sheet.getLastRow(), 1).getValue()) || 0;
  var ts = getKSTTimestamp();
  sheet.appendRow([
    lastId + 1, data.building, data.floor, data.name,
    data.isNew ? '신규' : '기존', parseInt(data.area) || 0,
    parseInt(data.baseRate) || 0, parseInt(data.techFee) || 0,
    data.separate ? 'TRUE' : 'FALSE',
    data.personRates || '',
    data.staffRequired ? 'TRUE' : 'FALSE',
    data.notes || '', ts, '활성', ts
  ]);
  return jsonResponse({ success: true, message: '시설이 추가되었습니다.' });
}

function updateVenue(data) {
  if (data.password !== ADMIN_PASSWORD) return jsonResponse({ success: false, message: '비밀번호 오류' });
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SH_VENUES);
  if (!sheet) return jsonResponse({ success: false, message: '시트 없음' });

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      sheet.getRange(i+1, 2).setValue(data.building);
      sheet.getRange(i+1, 3).setValue(data.floor);
      sheet.getRange(i+1, 4).setValue(data.name);
      sheet.getRange(i+1, 5).setValue(data.isNew ? '신규' : '기존');
      sheet.getRange(i+1, 6).setValue(parseInt(data.area) || 0);
      sheet.getRange(i+1, 7).setValue(parseInt(data.baseRate) || 0);
      sheet.getRange(i+1, 8).setValue(parseInt(data.techFee) || 0);
      sheet.getRange(i+1, 9).setValue(data.separate ? 'TRUE' : 'FALSE');
      sheet.getRange(i+1, 10).setValue(data.personRates || '');
      sheet.getRange(i+1, 11).setValue(data.staffRequired ? 'TRUE' : 'FALSE');
      sheet.getRange(i+1, 12).setValue(data.notes || '');
      sheet.getRange(i+1, 13).setValue(getKSTTimestamp());
      return jsonResponse({ success: true, message: '수정되었습니다.' });
    }
  }
  return jsonResponse({ success: false, message: '시설을 찾을 수 없습니다.' });
}

function toggleVenue(data) {
  if (data.password !== ADMIN_PASSWORD) return jsonResponse({ success: false, message: '비밀번호 오류' });
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SH_VENUES);
  if (!sheet) return jsonResponse({ success: false, message: '시트 없음' });

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      var newStatus = data.active ? '활성' : '비활성';
      sheet.getRange(i + 1, 14).setValue(newStatus);
      return jsonResponse({ success: true, message: (data.active ? '활성화' : '비활성화') + '되었습니다.' });
    }
  }
  return jsonResponse({ success: false, message: '시설을 찾을 수 없습니다.' });
}

// ══════════════════════════════════════════════════
//  설정 관리
// ══════════════════════════════════════════════════

function getSettings() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SH_SETTINGS);
  if (!sheet || sheet.getLastRow() < 2) {
    sheet = initSettingsSheet(ss);
  }
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  var settings = {};
  rows.forEach(function(r) { if (r[0]) settings[r[0]] = r[1]; });
  return jsonResponse({ success: true, settings: settings });
}

function saveSettings(data) {
  if (data.password !== ADMIN_PASSWORD) return jsonResponse({ success: false, message: '비밀번호 오류' });
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = getOrCreateSheet(ss, SH_SETTINGS, ['설정키','설정값']);

  var rows = sheet.getDataRange().getValues();
  // Accept flat UPPER_SNAKE_CASE payload (venue-admin.js sends keys directly,
  // not nested under a 'settings' key).  Fall back to data.settings for
  // backwards-compatibility with any callers that do wrap them.
  var updates = data.settings || (function() {
    var flat = {};
    Object.keys(data).forEach(function(k) {
      if (k !== 'action' && k !== 'password') flat[k] = data[k];
    });
    return flat;
  })();

  Object.keys(updates).forEach(function(key) {
    var found = false;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(updates[key]);
        rows[i][1] = updates[key];
        found = true; break;
      }
    }
    if (!found) { sheet.appendRow([key, updates[key]]); }
  });

  return jsonResponse({ success: true, message: '설정이 저장되었습니다.' });
}

// ══════════════════════════════════════════════════
//  리포트
// ══════════════════════════════════════════════════

function getReport(params) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SH_REQUESTS);
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonResponse({ success: true, report: { totalCount:0, totalAmount:0, byVenue:{}, byStatus:{}, monthly:[] } });
  }

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 42).getValues();
  var year  = parseInt(params.year)  || new Date().getFullYear();
  var month = parseInt(params.month) || 0;

  var filtered = rows.filter(function(r) {
    if (!r[0]) return false;
    var d = new Date(r[1]);
    if (isNaN(d)) return false;
    if (d.getFullYear() !== year) return false;
    if (month && (d.getMonth() + 1) !== month) return false;
    return true;
  });

  var totalCount = filtered.length;
  var totalAmount = 0;
  var paidAmount = 0;
  var byVenue = {};
  var byStatus = {};
  var monthly = {};

  filtered.forEach(function(r) {
    var amt = parseInt(r[41]) || parseInt(r[28]) || 0;
    totalAmount += amt;
    if (r[2] === 'PAID') paidAmount += amt;

    var venue = r[16] || '미상';
    if (!byVenue[venue]) byVenue[venue] = { count: 0, amount: 0 };
    byVenue[venue].count++;
    byVenue[venue].amount += amt;

    var st = r[2] || 'UNKNOWN';
    byStatus[st] = (byStatus[st] || 0) + 1;

    var d = new Date(r[1]);
    var mk = (d.getMonth() + 1) + '월';
    if (!monthly[mk]) monthly[mk] = { count: 0, amount: 0 };
    monthly[mk].count++;
    monthly[mk].amount += amt;
  });

  return jsonResponse({ success: true, report: {
    totalCount: totalCount, totalAmount: totalAmount, paidAmount: paidAmount,
    byVenue: byVenue, byStatus: byStatus,
    monthly: Object.keys(monthly).map(function(k) { return { month: k, count: monthly[k].count, amount: monthly[k].amount }; })
  }});
}

// ══════════════════════════════════════════════════
//  이메일 발송 (GAS MailApp)
// ══════════════════════════════════════════════════

function sendEmailAction(data) {
  if (data.password !== ADMIN_PASSWORD) return jsonResponse({ success: false, message: '비밀번호 오류' });
  try {
    GmailApp.sendEmail(data.to, data.subject, data.body, {
      name: DEFAULT_SETTINGS.MANAGER_NAME + ' ' + DEFAULT_SETTINGS.MANAGER_TITLE + ' | ' + DEFAULT_SETTINGS.ISSUER_NAME,
      noReply: false
    });
    addLogEntry(SpreadsheetApp.openById(SPREADSHEET_ID),
      data.requestId, 'EMAIL_SENT', '이메일 발송: ' + data.subject + ' → ' + data.to);
    return jsonResponse({ success: true, message: '이메일이 발송되었습니다.' });
  } catch(err) {
    return jsonResponse({ success: false, message: '이메일 발송 실패: ' + err.message });
  }
}

// ══════════════════════════════════════════════════
//  신청자 직접 작업 (비밀번호 불요, ID 인증)
// ══════════════════════════════════════════════════

function confirmRequest(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SH_REQUESTS);
  if (!sheet) return jsonResponse({ success: false, message: '데이터 없음' });

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      if (rows[i][2] !== 'QUOTE_ISSUED') {
        return jsonResponse({ success: false, message: '이미 처리된 요청입니다.' });
      }
      sheet.getRange(i + 1, 3).setValue('REQUESTED');
      sheet.getRange(i + 1, 33).setValue(getKSTTimestamp());
      addLogEntry(ss, data.id, 'REQUESTED', '신청자가 예약 요청을 확정함');
      sendTelegram('✅ *예약 요청 확정*\n요청ID: ' + data.id + '\n기관: ' + rows[i][3] + '\n시설: ' + rows[i][16] + '\n신청자가 예약 요청을 확정했습니다.');
      return jsonResponse({ success: true, message: '예약 요청이 확정되었습니다.' });
    }
  }
  return jsonResponse({ success: false, message: '요청을 찾을 수 없습니다.' });
}

function requestChange(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SH_REQUESTS);
  if (!sheet) return jsonResponse({ success: false, message: '데이터 없음' });

  var changeTypeMap = {
    SCHEDULE_CHANGE: '일정 변경 요청',
    VENUE_CHANGE:    '시설 변경 요청',
    CANCEL_REQUEST:  '취소 요청',
    OTHER:           '기타 문의'
  };

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      var ts = getKSTTimestamp();
      var typeLabel = changeTypeMap[data.changeType] || data.changeType || '변경 요청';
      var memo = '[' + ts + '] ' + typeLabel + ': ' + (data.message || '') +
                 (data.tel ? ' (연락처: ' + data.tel + ')' : '');
      var existing = rows[i][40] ? rows[i][40] + '\n' : '';
      sheet.getRange(i + 1, 41).setValue(existing + memo);
      addLogEntry(ss, data.id, 'CHANGE_REQUEST', typeLabel + ' - ' + (data.message || ''));
      sendTelegram('📩 *신청자 수정 요청*\n요청ID: ' + data.id + '\n기관: ' + rows[i][3] + '\n유형: ' + typeLabel + '\n내용: ' + (data.message || '') + (data.tel ? '\n연락처: ' + data.tel : ''));
      return jsonResponse({ success: true, message: '수정 요청이 접수되었습니다.' });
    }
  }
  return jsonResponse({ success: false, message: '요청을 찾을 수 없습니다.' });
}

// ══════════════════════════════════════════════════
//  초기화 — 웹 앱 배포 후 1회 실행
// ══════════════════════════════════════════════════

/**
 * 배포 후 스프레드시트 시트와 기본 데이터를 초기화합니다.
 * Apps Script 편집기 상단 함수 드롭다운에서 initSheets 선택 후 ▶ 실행.
 */
function initSheets() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 1. 요청·일정·로그·설정 빈 시트 생성
  getOrCreateSheet(ss, SH_REQUESTS, [
    '요청ID','기관명','담당자','연락처','이메일','건물','시설명','사용일','시작시간','종료시간',
    '인원','목적','기본금액','할증금액','기술관리비','합계금액','최종금액','최종금액수정사유',
    '상태','견적발행일','예약요청일','승인일','거절일','거절사유','취소일','사용시작일',
    '사용완료일','계산서발행일','입금완료일','문서제목','비고',
    '사업자등록모드','사업자등록데이터','사업자등록MIME','사업자등록텍스트',
    '요청채널','IP','생성일','수정일'
  ]);
  getOrCreateSheet(ss, SH_SCHEDULES, [
    '일정ID','요청ID','유형','날짜','시작시간','종료시간','시간수','금액영향','담당자','메모','생성일'
  ]);
  getOrCreateSheet(ss, SH_LOG, ['로그ID','요청ID','일시','단계','메모']);

  // 2. 기본 시설 데이터 입력
  initVenueSheet(ss);

  // 3. 기본 설정 입력
  initSettingsSheet(ss);

  Logger.log('✅ initSheets 완료: 시트 5개 초기화, 기본 시설 ' + DEFAULT_VENUES.length + '개 등록');
}

function initVenueSheet(ss) {
  var sheet = getOrCreateSheet(ss, SH_VENUES,
    ['시설ID','건물','위치','시설명','신규여부','면적(평)','기본단가','기술관리비','별도협의','인원별단가','관리인원상주','비고','수정일','활성여부','등록일']);
  var ts = getKSTTimestamp();
  DEFAULT_VENUES.forEach(function(v, idx) {
    sheet.appendRow([
      idx + 1, v.building, v.floor, v.name,
      v.isNew ? '신규' : '기존', v.area,
      v.baseRate, v.techFee,
      v.separate ? 'TRUE' : 'FALSE',
      v.personRates || '',
      v.staffRequired ? 'TRUE' : 'FALSE',
      v.notes, ts, '활성', ts
    ]);
  });
  return sheet;
}

function initSettingsSheet(ss) {
  var sheet = getOrCreateSheet(ss, SH_SETTINGS, ['설정키','설정값']);
  Object.keys(DEFAULT_SETTINGS).forEach(function(k) {
    sheet.appendRow([k, DEFAULT_SETTINGS[k]]);
  });
  return sheet;
}

// ── 공정 로그 기록 ─────────────────────────────────
function getLog(requestId) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SH_LOG);
  if (!sheet || sheet.getLastRow() < 2) return jsonResponse({ success: true, logs: [] });

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
  var list = rows
    .filter(function(r) { return r[0] !== '' && r[1] === requestId; })
    .map(function(r) { return { id: r[0], requestId: r[1], timestamp: r[2], step: r[3], memo: r[4] }; });
  return jsonResponse({ success: true, logs: list });
}

function addLogEntry(ss, requestId, step, memo) {
  var sheet = getOrCreateSheet(ss, SH_LOG, ['로그ID','요청ID','타임스탬프','단계','메모']);
  var logId = 'LOG-' + new Date().getTime();
  sheet.appendRow([logId, requestId, getKSTTimestamp(), step, memo || '']);
}

// ── 유틸 ──────────────────────────────────────────
function getKSTTimestamp() {
  var kst = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace('T', ' ').substring(0, 19);
}

function formatMoney(n) {
  return parseInt(n).toLocaleString('ko-KR');
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendTelegram(text) {
  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text, parse_mode: 'Markdown' })
    });
  } catch(e) {}
}
