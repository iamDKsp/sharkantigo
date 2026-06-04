const fs = require('fs');
let content = fs.readFileSync('src/components/EmprestimosListWrapper.tsx', 'utf8');
if (content.startsWith('"use client"')) {
    console.log('Wait, it starts with quotes literally.');
}
content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
if (content.startsWith('"') && content.endsWith('"')) {
    content = content.substring(1, content.length - 1);
}
fs.writeFileSync('src/components/EmprestimosListWrapper.tsx', content);
