# 철새 도래지 지도

월 슬라이더로 한국의 철새 도래지를 지도에서 보고, 장소를 클릭하면 종 설명과 관찰 팁을 보여주는 정적 웹 페이지.

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
js/monthSlider.js           월 슬라이더
js/infoPanel.js             종 설명·관찰 팁 패널
data/migratory-birds.json   철새 도래지 데이터
README.md                   이 문서
```

## 데이터 형식

```json
{
  "topic": { "id": "...", "title": "..." },
  "species": { "<speciesId>": { "name": "", "description": "", "tips": "", "color": "#rrggbb" } },
  "sites": [
    { "id": "", "name": "", "lat": 0, "lng": 0,
      "observations": [ { "species": "<speciesId>", "months": [1, 2, 12] } ] }
  ]
}
```

## 새 주제 추가

1. `data/`에 위 형식의 JSON 파일을 추가한다.
2. `js/config.js`의 `TOPICS` 배열에 `{ id, dataFile }` 항목을 하나 추가한다.

샘플 데이터의 좌표와 월 정보는 대략값이며 검증되지 않았다.
