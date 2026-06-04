const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            replaceInDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('text-5xl')) {
                // Replacing text-5xl with text-sm as a baseline fix
                content = content.replace(/text-5xl/g, 'text-sm');
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Fixed ${fullPath}`);
            }
        }
    }
}

replaceInDir(path.join(__dirname, 'src'));
console.log('Done replacing text-5xl with text-sm.');
