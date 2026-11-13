# THE VALUES ARCHIVE

빌드 없는 정적 사이트. `index.html`을 더블클릭하면 열립니다. (HOME / PEOPLE / STORY / COMPARE)

## 데이터 갱신
1. `assets/이름.txt` 에 AI 보고서 원문을 넣는다 (참여자 1명당 1파일, 6개 【】 섹션 구조).
2. 구조화 값(최종5·확신5·열망5·경계5·쌍)은 `tools/extracted/이름.json` 에서 읽는다. (원문 명시값만 추출, 없으면 빈 배열)
3. `node tools/build-data.js` → `data/participants.js` 재생성. 순서를 바꾸려면 `tools/order.json`(이름 배열) 추가.

`final_positive_5` 가 비어 있으면 카드에는 값이 표시되지 않고 "입력 완료"에 집계되지 않습니다.

## 추가 참여자 2명
이시온과 서재현의 상세 분석 원문 및 구조화 값은 각각 `data/profile-ision.js`, `data/profile-seojaehyun.js`에서 관리합니다.
`index.html`이 `data/participants.js` 다음에 이 두 파일을 로드하여 기존 이름만 등록된 항목(p10, p11)을 완성합니다.
`tools/build-data.js`로 기존 9명 데이터를 다시 생성하더라도 이 추가 파일은 유지됩니다.
참여자 수와 최종 가치 통계는 실제 로드된 데이터에서 계산됩니다.
