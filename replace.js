const fs = require('fs');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('c:/Users/Lenovo/Desktop/Shiv Furniture Works/frontend');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/'http:\/\/localhost:3000\/api\/v1(.*?)'/g, '`${process.env.NEXT_PUBLIC_API_URL}$1`');
    content = content.replace(/"http:\/\/localhost:3000\/api\/v1(.*?)"/g, '`${process.env.NEXT_PUBLIC_API_URL}$1`');
    content = content.replace(/`http:\/\/localhost:3000\/api\/v1(.*?)`/g, '`${process.env.NEXT_PUBLIC_API_URL}$1`');
    fs.writeFileSync(file, content, 'utf8');
});
console.log('Replacement complete.');
