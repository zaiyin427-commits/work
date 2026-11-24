# 계절 생물 지도

철새·개나리·진달래·벚꽃·단풍 모든 소재의 명소 중 선택한 날짜의 달에 볼 수 있는 곳을 지도에 표시하고, 오른쪽 위의 날짜 달력으로 날짜를 골라 지도에서 보며, 장소를 클릭하면 설명과 관찰 팁을 보여주는 정적 웹 페이지. 기본 날짜는 오늘이고, 선택한 날짜의 달이 바뀌면 철새 이동 애니메이션이 나온다. 달력의 ◀/▶는 같은 날짜의 이전·다음 달로 이동하고(말일을 넘으면 말일로 맞춤), "오늘" 버튼은 오늘로 돌아오며, 재생 버튼은 한 달씩 자동으로 넘긴다(12월 다음은 같은 해 1월). 장소 패널의 "N월 M일 기준" 시기 판정도 선택한 날짜를 쓴다. 화면 너비 640px 이하이거나 높이 700px 이하이면 달력이 날짜 버튼 하나로 접혀 있다가 눌러서 펼친다. 장소 패널이 열릴 때, 접힌 모드에서 날짜를 고른 뒤, Esc를 누를 때, 지도를 탭할 때 자동으로 다시 접힌다.

## 실행

```
python3 -m http.server 8000
```

프로젝트 루트에서 실행한 뒤 http://localhost:8000 을 연다.

## 폴더 구조

```
index.html                  페이지 진입점
css/style.css               스타일
js/config.js                설정(TOPICS 등)
js/main.js                  초기화와 모듈 연결
js/dataLoader.js            JSON 데이터 로드
js/mapView.js               Leaflet 지도와 마커
js/speciesIcons.js          종별 지도 아이콘
js/dateCalendar.js          날짜 달력(선택 날짜, 이전/다음 달, 오늘)
js/dateUtils.js             날짜 계산 도우미
js/migrationAnimation.js    철새 이동 애니메이션
js/realTrack.js             실제 GPS 추적 경로 표시
js/mapLegend.js             지도 범례(실제 경로·머문 지역·추정 경로, 자료 출처)
js/playControl.js           날짜 자동 재생 버튼(달력 안)
js/infoPanel.js             종 설명·관찰 팁 패널
js/seasonStatus.js          계절 시기 계산(평년값·관측값 기준)
scripts/updateMonthsFromGbif.mjs  GBIF 기록으로 월 정보 갱신
scripts/gbif-config.json    갱신 스크립트 설정
scripts/updateSeasonObservations.mjs  기상청 계절관측값 갱신
scripts/kma-config.json     기상청 갱신 스크립트 설정
scripts/buildMovebankTrack.mjs  Movebank 실제 추적 경로 생성
scripts/movebank-config.json    추적 경로 생성 스크립트 설정
data/migratory-birds.json   철새 도래지 데이터
data/forsythia.json         개나리 명소 데이터
data/azalea.json            진달래 명소 데이터
data/cherry-blossom.json    벚꽃 명소 데이터
data/autumn-foliage.json    단풍 명소 데이터
data/season-observations.json  기상청 계절관측값(스크립트가 생성)
data/tracks/white-naped-crane.json  재두루미 실제 추적 경로(스크립트가 생성)
README.md                   이 문서
```

## 데이터 형식

```json
{
  "topic": { "id": "...", "title": "..." },
  "species": { "<speciesId>": { "name": "", "description": "", "tips": "", "color": "#rrggbb", "icon": "crane", "breedingArea": { "name": "", "lat": 0, "lng": 0 } } },
  "sites": [
    { "id": "", "name": "", "lat": 0, "lng": 0,
      "observations": [ { "species": "<speciesId>", "months": [1, 2, 12] } ] }
  ]
}
```

`icon`은 선택 필드로, 지도 마커 아이콘의 ID이다(`crane`, `goose`, `swan`, `duck`, `forsythia`, `azalea`, `cherry-blossom`, `double-cherry-blossom`, `maple-leaf`, `ginkgo-leaf` 중 하나이며 `js/speciesIcons.js`에 정의). 없거나 알 수 없는 값이면 콘솔에 경고를 남기고 종의 `color`로 칠한 동그라미 마커를 쓴다(`color`도 없을 때만 회색).

`breedingArea`는 선택 필드로, 이동 애니메이션에 쓰며 이동하는 종에만 필요하다.

장소(site)의 선택 필드 `seasonalNormal`은 기상청 평년값이다: `{ "stationName": "", "stationNumber": 0, "isProxy": false, "item": "", "events": [ { "name": "", "date": "MM-DD" } ] }` (`isProxy`가 true이면 해당 지점의 평년값을 구하지 못해 다른 관측소 값을 빌려 쓴 것).

`data/season-observations.json`은 기상청 관측값 파일이다: `{ "source", "year", "updatedAt", "sites": { "<topicId>/<siteId>": [ { "name": "", "date": "MM-DD" } ] } }`.

실제 추적 경로 파일(`data/tracks/*.json`)은 `scripts/buildMovebankTrack.mjs`가 만든다:

```json
{
  "speciesId": "<철새 데이터의 speciesId>", "speciesName": "", "individualName": "", "season": "2017-2018", "precisionDegrees": 0.1,
  "source": { "name": "", "citation": "", "doi": "", "license": "", "licenseUrl": "" },
  "points": [ ["YYYY-MM-DD", 위도, 경도] ]
}
```

`points`는 날짜순이며 하루 한 점이다. `source`의 다섯 필드는 모두 필수이고, 범례에 출처·라이선스 링크(`doi`, `licenseUrl`은 http(s) 주소여야 링크로 표시)와 가공 내용(`precisionDegrees`)이 표시된다. 어떤 파일을 어느 소재에 붙일지는 `js/config.js`의 `REAL_TRACKS`(`{ dataFile, topicId }` 목록)에서 정하며, 범례가 보이는 소재는 `MAP_LEGEND.topicId`이다. 범례에는 `REAL_TRACKS`의 첫 번째 추적만 표시한다.

## 월 데이터 갱신 (GBIF)

Node 18 이상과 api.gbif.org 접속이 필요하다.

```
node scripts/updateMonthsFromGbif.mjs          # 드라이런(파일을 쓰지 않음)
node scripts/updateMonthsFromGbif.mjs --write  # 데이터 파일에 반영
```

`data/migratory-birds.json`에만 적용된다. 기존 장소·종 조합의 `months`만 바꾼다. 설정은 `scripts/gbif-config.json`.

| 키 | 의미 |
|---|---|
| `dataFile` | 갱신할 데이터 파일(프로젝트 루트 기준) |
| `occurrenceSearchUrl` | GBIF 출현 기록 검색 API 주소 |
| `radiusKilometers` | 장소 중심 검색 반경(km) |
| `yearRange` | 집계할 연도 범위 [시작, 끝] |
| `minimumRecordsPerMonth` | 월로 인정할 최소 기록 수 |
| `requestIntervalMilliseconds` | 요청 사이 대기 시간 |
| `maxRetries`, `retryWaitMilliseconds` | HTTP 429 재시도 횟수와 대기 시간 |
| `userAgent` | 요청 User-Agent |
| `taxonKeys` | 종 ID별 GBIF taxonKey 목록 |

데이터 출처: [GBIF.org](https://www.gbif.org) 출현 기록(검색 API). 주요 데이터셋은 eBird Observation Dataset(CC BY 4.0)과 iNaturalist Research-grade Observations(CC BY-NC 4.0)이며, 비영리 용도로만 쓴다. 기록 수는 시민과학 기록이라 관찰자 활동량의 영향을 받는다.

## 기상청 관측값 갱신

개나리·진달래·벚꽃·단풍 관측일을 기상청 API허브에서 받아 `data/season-observations.json`에 쓴다. 환경 변수 `KMA_AUTH_KEY`(API허브 인증키, 계절관측 자료 활용신청 필요)가 있어야 하며, 키는 절대 커밋하지 않는다.

```
node scripts/updateSeasonObservations.mjs                 # 드라이런(기본은 올해, 파일을 쓰지 않음)
node scripts/updateSeasonObservations.mjs --year 2026     # 계절 연도 지정
node scripts/updateSeasonObservations.mjs --write         # data/season-observations.json에 기록
node scripts/updateSeasonObservations.mjs --inspect 108   # 관측소 번호의 API 원본 응답 출력(코드 확인용, 키는 가려짐)
```

설정은 `scripts/kma-config.json`. 첫 `--write` 전에 `--inspect <관측소번호> --year <YYYY>`로 응답을 확인하고 `eventCodes`와 `responseFormat`을 모두 채워야 한다(비어 있으면 스크립트가 요청 전에 멈춘다).

- 응답이 `responseFormat.headerColumns` 열 이름을 담은 `#` 헤더 줄만 있고 자료 행이 없으면 그 관측소는 해당 연도 "관측 없음"으로 경고만 출력하고 계속 진행한다(헤더도 없는 빈 응답이나 오류 응답은 그대로 중단).
- `eventCodes`는 기상청 API허브 공식 코드표([SSN_ID.pdf](https://apihub.kma.go.kr/getAttachFile.do?fileName=SSN_ID.pdf), [SSN_MD.pdf](https://apihub.kma.go.kr/getAttachFile.do?fileName=SSN_MD.pdf))로 확인했다: 벚나무 205/202·203, 개나리 203/202, 진달래 204/202, 은행나무 301/301·302(SSN_ID/SSN_MD). 유명산 단풍 501/501·503의 SSN_MD 의미는 코드표 문장만으로는 모호해 확정하지 못했다.
- `responseFormat`: `fieldSeparator`(`,` `;` `|` `tab` `whitespace` 중 하나)와 관측소·관측일·계절 코드 열의 0부터 시작하는 번호(`stationIndex`, `observedAtIndex`, `ssnIdIndex`, `ssnMdIndex`).
- 응답이 오류이거나 자료 행이 없거나 날짜·연도·관측소가 맞지 않으면 중단하며, 기존 파일에 이벤트가 하나라도 있으면(연도와 무관) 0건 결과로 덮어쓰지 않는다. 리다이렉트(3xx) 응답은 인증키 유출을 막기 위해 따라가지 않고 실패로 처리한다.
- `allowInsecureApiUrlForTesting`은 로컬 루프백(127.0.0.1) 테스트 전용이며, 커밋되는 설정에서는 반드시 `false`로 둔다.

## 철새 실제 추적 경로

재두루미 1마리('Borzya')의 2017–2018 시즌(2017-09-01 ~ 2018-04-30) 실제 GPS 경로를 보여준다. 하루 1점(그날 위치의 중앙값)이고, 좌표는 0.1도로 반올림했으며, 번식기(5–8월)는 제외했다. 점선 애니메이션 선은 재두루미를 포함해 모두 대략적인 번식 지역을 바탕으로 한 추정 경로이며, 실제 GPS 경로는 실선과 반투명 원뿐이다.

한곳에 머무는 동안에도 반올림된 좌표가 이웃 칸을 오가므로, 점을 그대로 이으면 좌우로 왔다 갔다 하는 짧은 막대처럼 보인다. 그래서 선택한 달의 점(그 달의 점과 바로 앞 점, 날짜순)을 '머문 구간'과 '이동 점'으로 나누어 그린다(`js/realTrack.js`, 설정은 `js/config.js`의 `REAL_TRACK`).

- 머문 구간: 기록이 있는 날 기준으로 연속 3개(`stayAreaMinimumRecords`) 이상의 기록이 있고, 구간 안 어느 두 점 사이의 거리도 30km(`stayAreaMaxSpreadKilometers`) 이하인 구간이다. 첫 점부터 차례로, 구간에 다음 점을 하나 더해도 어느 두 점 사이의 거리가 모두 30km 이하이면 구간을 늘린다. 더 늘릴 수 없을 때 기록이 3개 이상이면 머문 구간으로 정하고 그다음 점부터 다시 시작하며, 3개 미만이면 시작점만 이동 점으로 두고 바로 다음 점부터 다시 시작한다. 기록이 빠진 날(예: 3월 26–27일)은 세지 않고 앞뒤 기록을 연속으로 본다. 머문 구간이 아닌 점은 모두 이동 점이다.
- 머문 구간마다 반투명 원('머문 지역')을 하나 그린다. 중심은 구간의 평균 위치이고, 반지름은 중심에서 가장 먼 점까지의 거리에 반올림 오차 여유를 더한 값이며 최소 10km(`stayAreaMinRadiusKilometers`)다. 반올림 오차 여유는 반올림 칸(`precisionDegrees` × `precisionDegrees`) 대각선의 절반을 원 중심의 위도에서 km로 바꾼 값이다(0.1° 칸이면 위도 38°에서 약 7.1km, 50°에서 약 6.6km).
- 실선은 머문 구간을 원의 중심 한 점으로 줄이고 이동 점은 그대로 둔 경로를 날짜순으로 잇는다. 그래서 선은 원의 중심과 이동 점을 연결한다. 이 경로에 서로 다른 점이 2개(`pathMinimumDistinctPoints`) 미만이면 선을 그리지 않는다. 11–2월처럼 한 달 내내 철원에 머문 달은 원 하나만 그린다.
- 달이 바뀌면 움직이는 점이 이 실선을 따라 날짜순으로 원의 중심과 이동 점을 차례로 지난다. 선이 없는 달은 움직이는 점도 없다. 예를 들어 3월은 철원 원과 파주 원을 지나 북쪽으로, 10월은 북쪽의 머문 지역에서 남쪽으로 내려와 철원 원에 닿는다.

데이터 출처: Movebank Data Repository, Batbayar N, Galtbalt B, Natsagdorj T, Sukhbaatar T, Wikelski M. 2024. Data from: Study "White-naped crane Mongolia WSCC". https://doi.org/10.5441/001/1.600 (CC BY-NC 4.0, 비영리 용도로만 사용). 관련 논문: Yanco SW et al. 2024, PNAS, https://doi.org/10.1073/pnas.2316827121

```
node scripts/buildMovebankTrack.mjs          # 드라이런(요약만 출력, 파일을 쓰지 않음)
node scripts/buildMovebankTrack.mjs --write  # data/tracks/white-naped-crane.json 생성
```

Node 18.17 이상이 필요하다(`URL.canParse` 사용). 약 42MB의 원본 CSV를 내려받아 집계하며, 원본은 저장하지 않는다. 전송이 중간에 끊기는 환경을 위해 구간(Range) 요청으로 나누어 받는다. 하루의 구분은 UTC 날짜 기준이다. 설정은 `scripts/movebank-config.json`.

| 키 | 의미 |
|---|---|
| `dataUrl` | 원본 CSV 주소 |
| `outputFile` | 생성한 경로 파일을 저장할 위치(프로젝트 루트 기준 상대 경로) |
| `speciesId` | `data/migratory-birds.json`의 종 id와 같아야 한다(경로 색상이 이 종에서 정해진다) |
| `speciesName` | 화면에 표시할 종 이름 |
| `individualId` | 사용할 개체의 ID |
| `individualName` | 화면에 표시할 개체 이름 |
| `userAgent` | 원본 CSV를 요청할 때 보내는 User-Agent |
| `seasonStart`, `seasonEnd` | 집계할 시즌의 시작·끝 날짜 |
| `excludedMonths` | 제외할 월(번식기) 목록 |
| `precisionDegrees` | 좌표 반올림 단위(도) |
| `downloadChunkBytes` | 구간(Range) 요청 한 번에 받는 바이트 수 |
| `maxChunkRetries` | 구간 요청 실패 시 재시도 횟수 |
| `source` | 출처 정보(`name`, `citation`, `doi`, `license`, `licenseUrl`) |

## 새 소재 추가

1. `data/`에 위 형식의 JSON 파일을 추가한다.
2. `js/config.js`의 `TOPICS` 배열에 `{ id, dataFile }` 항목을 하나 추가한다.
3. 기상청 관측값을 쓰는 소재라면 `scripts/kma-config.json`의 `topicDataFiles`에 데이터 파일을 추가하고, `eventCodes`에 `"<item>/<이벤트 이름>"` 항목마다 `ssnId`·`ssnMd`를 넣은 뒤 갱신 스크립트를 실행한다.
4. `seasonalNormal`(평년값)은 공식 출처를 보고 손으로 입력한다.
5. 필요하면 `js/speciesIcons.js`에 아이콘을 추가하고 종의 `icon`에 그 ID를 쓴다(없으면 종의 색 동그라미 마커로 표시된다).

추가한 소재는 지도에 자동으로 나타난다.

## 기상청 평년값 출처

기상청 계절관측 평년값(1991–2020): https://data.kma.go.kr/data/seasonObs/seasonObsDataList.do?pgmNo=648 (공공데이터포털 15097125, 이용허락범위 제한 없음). 벚꽃·단풍 장소의 `seasonalNormal`에 쓰였다.

개나리·진달래 평년값은 기상청 보도자료(2021-09-14) "봄꽃 빨리 피고, 매미 울음도 일찍 들려" 붙임3(https://www.weather.go.kr/kma/flexer/html/press/2021/09/14/ATC202109141250291_c31c7967-f978-4b12-b9e1-c6cbd3f9f51c.hwp.files/Sections1.html)과 인천은 수도권기상청 보도자료에서 가져왔다. 1991–2020 평년값은 API허브 `sfc_ssn_norm.php`로도 조회할 수 있으며, 개나리 값이 보도자료와 일치함을 확인했다.

- `isProxy: true`는 장소에 관측소가 없어 다른 관측소 값을 빌린 것이다. 보통 가장 가까운 관측소이고, 진달래 여수 영취산만 여수 평년값을 확인하지 못해 공식 평년값이 있는 광주를 쓴다. 유명산 단풍의 관측소-산 연결(예: 속초-설악산)은 추정이다.
- 벚꽃·단풍·개나리·진달래의 월 정보는 평년값에서 계산했다(첫 이벤트 날짜부터 마지막 이벤트 날짜+7일까지가 걸치는 달). `seasonalNormal`이 없는 장소는 지자체·관광 안내 페이지에 적힌 통상 절정 시기를 바탕으로 한 대략적인 월을 쓴다(천주산 4월, 고려산 4월, 비슬산 4–5월). 불국사 겹벚꽃은 관측 항목이 없어 기존 값을 쓴다.

개나리·진달래 장소의 좌표는 OpenStreetMap Nominatim(https://nominatim.openstreetmap.org)으로 찾은 대략값이다. 진달래 장소 중 평년값이 있는 곳은 모두 다른 관측소의 평년값을 빌린 것(`isProxy: true`)이다. 창원 천주산·강화 고려산·대구 비슬산은 산 정상부 군락이 평지 도시보다 몇 주 늦게 피어 도시 평년값이 오해를 부르므로 `seasonalNormal`을 두지 않았다. 이 장소는 설명과 관찰 팁만 보여주고 기상청 관측값도 받지 않는다.

샘플 데이터(철새·개나리·진달래·벚꽃·단풍)의 좌표와 월 정보, `breedingArea` 좌표는 대략값이며 검증되지 않았다.
