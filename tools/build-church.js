// data/churchPlantingData.json → data/churchPlantingData.js (file:// 에서도 열리도록 래핑). 실행: node tools/build-church.js
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'data', 'churchPlantingData.json');
const json = JSON.stringify(JSON.parse(fs.readFileSync(src, 'utf8')), null, 2);
fs.writeFileSync(path.join(__dirname, '..', 'data', 'churchPlantingData.js'), '// churchPlantingData.json 에서 생성됨 (직접 수정 금지)\nwindow.CHURCH_DATA = ' + json + ';\n');
console.log('ok');
