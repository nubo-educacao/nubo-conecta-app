const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
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
    
    // Fix vi.mock('./...') or vi.mock('../...')
    content = content.replace(/vi\.mock\(['"](\.\/|\.\.\/)[^'"]+['"]/g, (match) => {
        const rawPath = match.match(/['"]([^'"]+)['"]/)[1];
        let relativeDir = path.dirname(file).replace(/^tests[\/\\]/, ''); 
        let resolved = path.resolve('/dummy', relativeDir, '__tests__', rawPath); 
        let alias = '@' + resolved.replace(/^.*?[\/\\]dummy/, '').replace(/\\/g, '/');
        modified = true;
        return `vi.mock('${alias}'`;
    });
    
    if (modified) {
        fs.writeFileSync(file, content);
        console.log('Fixed vi.mock in ' + file);
    }
});
