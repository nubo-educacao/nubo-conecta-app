const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.test.tsx') || file.endsWith('.test.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('tests');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    content = content.replace(/from\s+['"](\.\.\/[^'"]+)['"]/g, (match, p1) => {
        let relativeDir = path.dirname(file).replace(/^tests[\/\\]/, ''); 
        let resolved = path.resolve('/dummy', relativeDir, '__tests__', p1); 
        let alias = '@' + resolved.replace(/^.*?[\/\\]dummy/, '').replace(/\\/g, '/');
        modified = true;
        return `from '${alias}'`;
    });
    
    if (modified) {
        fs.writeFileSync(file, content);
        console.log('Fixed imports in ' + file);
    }
});
